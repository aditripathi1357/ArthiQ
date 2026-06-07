"""
Companies router -- search, profile, overview, financials, ownership.

All endpoints fall back to live yfinance data when the database is empty,
so they work out-of-the-box without seeding.
"""

import asyncio
import logging
from functools import partial

import yfinance as yf
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.company import Company
from app.models.financials import Financial
from app.models.ownership import Ownership
from app.schemas.company import (
    CompanySearchResult,
    CompanySearchResponse,
    CompanyResponse,
    CompanyOverview,
    CompanyFinancialsResponse,
    FinancialData,
    CompanyOwnershipResponse,
    OwnershipData,
)
from app.services.stock_fetcher import fetch_company_info
from app.utils.cache import get_cached, set_cached

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/companies", tags=["Companies"])


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _sync_yf_info(symbol: str) -> dict:
    """Blocking yfinance .info call -- run via executor."""
    try:
        return yf.Ticker(symbol).info or {}
    except Exception:
        return {}


async def _yf_info(symbol: str) -> dict:
    """Async wrapper around blocking yfinance info."""
    cached = get_cached(("yf_info", symbol.upper()), 300)
    if cached is not None:
        return cached
    loop = asyncio.get_running_loop()
    res = await loop.run_in_executor(None, partial(_sync_yf_info, symbol))
    if res:
        set_cached(("yf_info", symbol.upper()), res)
    return res


async def _find_company(db: AsyncSession, symbol: str) -> Company | None:
    """Look up a company by exact symbol. Returns None on DB errors."""
    try:
        result = await db.execute(
            select(Company).where(Company.symbol == symbol)
        )
        return result.scalar_one_or_none()
    except Exception as exc:
        logger.warning("DB lookup failed for %s (falling back to yfinance): %s", symbol, exc)
        return None


def _yf_search_sync(query: str) -> list[dict]:
    """Blocking yfinance search."""
    try:
        from yfinance import Search
        search_obj = Search(query, max_results=10)
        quotes = search_obj.quotes
        if isinstance(quotes, list):
            return quotes
        return []
    except Exception as exc:
        logger.warning("yfinance search failed for '%s': %s", query, exc)
        return []


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/companies/search?q=reliance
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/search", response_model=CompanySearchResponse)
async def search_companies(
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    db: AsyncSession = Depends(get_db),
):
    """
    Search companies by name or symbol.

    First searches the local database. If no results, falls back to yfinance.
    """
    query_lower = f"%{q.lower()}%"

    # Search DB (gracefully skip on error)
    companies = []
    try:
        result = await db.execute(
            select(Company).where(
                or_(
                    func.lower(Company.symbol).like(query_lower),
                    func.lower(Company.name).like(query_lower),
                )
            ).limit(20)
        )
        companies = result.scalars().all()
    except Exception as exc:
        logger.warning("DB search failed (falling back to yfinance): %s", exc)

    if companies:
        return CompanySearchResponse(
            query=q,
            total=len(companies),
            results=[
                CompanySearchResult(
                    symbol=c.symbol,
                    name=c.name,
                    exchange=c.exchange,
                    sector=c.sector,
                    industry=c.industry,
                )
                for c in companies
            ],
        )

    # Fallback: yfinance search
    loop = asyncio.get_running_loop()
    yf_results = await loop.run_in_executor(None, partial(_yf_search_sync, q))

    results = []
    for item in yf_results[:10]:
        # Filter to equities only for cleaner results
        if item.get("quoteType") not in (None, "EQUITY"):
            continue
        results.append(CompanySearchResult(
            symbol=item.get("symbol", ""),
            name=item.get("longname", item.get("shortname", "")),
            exchange=item.get("exchDisp", item.get("exchange", "")),
            sector=item.get("sectorDisp", item.get("sector")),
            industry=item.get("industryDisp", item.get("industry")),
        ))

    return CompanySearchResponse(
        query=q,
        total=len(results),
        results=results,
    )


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/companies/{symbol}
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/{symbol}", response_model=CompanyResponse | dict)
async def get_company_profile(
    symbol: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get full company profile by symbol.

    Returns DB record if available; otherwise fetches live from yfinance.
    """
    company = await _find_company(db, symbol)
    if company:
        return company

    # Try cache
    cached = get_cached(("profile", symbol.upper()), 600)
    if cached is not None:
        return cached

    # Fallback to yfinance
    info = await fetch_company_info(symbol)
    if not info:
        raise HTTPException(status_code=404, detail=f"Company '{symbol}' not found")

    profile_dict = {
        "symbol": info["symbol"],
        "name": info["name"],
        "exchange": info.get("exchange", ""),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "description": info.get("description"),
        "ceo": info.get("ceo"),
        "founded_year": info.get("founded_year"),
        "headquarters": info.get("headquarters"),
        "website": info.get("website"),
        "source": "yfinance",
    }
    set_cached(("profile", symbol.upper()), profile_dict)
    
    # Auto-persist to database in background
    try:
        from app.models.company import Company
        new_company = Company(
            symbol=info["symbol"],
            name=info["name"],
            exchange=info.get("exchange", "UNKNOWN"),
            sector=info.get("sector"),
            industry=info.get("industry"),
            description=info.get("description"),
            ceo=info.get("ceo"),
            website=info.get("website"),
            headquarters=info.get("headquarters"),
            founded_year=info.get("founded_year"),
        )
        db.add(new_company)
        await db.commit()
        logger.info("Saved dynamically fetched company %s to database", symbol)
    except Exception as exc:
        await db.rollback()
        logger.warning("Failed to auto-persist company %s: %s", symbol, exc)

    return profile_dict


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/companies/{symbol}/overview
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/{symbol}/overview", response_model=CompanyOverview)
async def get_company_overview(
    symbol: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Quick overview: name, live price, change%, sector, market cap.

    Always fetches live price from yfinance for freshness.
    """
    # Get company name from DB or yfinance
    company = await _find_company(db, symbol)
    info = await _yf_info(symbol)

    if not info and not company:
        raise HTTPException(status_code=404, detail=f"Company '{symbol}' not found")

    name = company.name if company else info.get("shortName", symbol)
    exchange = company.exchange if company else info.get("exchange", "")
    sector = company.sector if company else info.get("sector")
    industry = company.industry if company else info.get("industry")

    current_price = info.get("regularMarketPrice") or info.get("currentPrice")
    previous_close = info.get("regularMarketPreviousClose") or info.get("previousClose")

    change = None
    change_pct = None
    if current_price and previous_close:
        change = round(current_price - previous_close, 2)
        change_pct = round((change / previous_close) * 100, 2) if previous_close else None

    return CompanyOverview(
        symbol=symbol,
        name=name,
        exchange=exchange,
        sector=sector,
        industry=industry,
        current_price=current_price,
        previous_close=previous_close,
        change=change,
        change_pct=change_pct,
        day_high=info.get("regularMarketDayHigh") or info.get("dayHigh"),
        day_low=info.get("regularMarketDayLow") or info.get("dayLow"),
        open=info.get("regularMarketOpen") or info.get("open"),
        fifty_two_week_low=info.get("fiftyTwoWeekLow"),
        fifty_two_week_high=info.get("fiftyTwoWeekHigh"),
        volume=info.get("regularMarketVolume") or info.get("volume"),
        average_volume=info.get("averageVolume") or info.get("averageVolume10Days"),
        market_cap=info.get("marketCap"),
        pe_ratio=info.get("trailingPE") or info.get("forwardPE"),
        eps=info.get("trailingEps") or info.get("forwardEps"),
        beta=info.get("beta"),
        dividend_yield=info.get("dividendYield"),
        dividend_rate=info.get("dividendRate"),
    )


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/companies/{symbol}/financials
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/{symbol}/financials", response_model=CompanyFinancialsResponse)
async def get_company_financials(
    symbol: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get financial data (revenue, profit, ratios) for a company.

    Returns DB records if available; otherwise pulls key metrics from yfinance.
    """
    company = await _find_company(db, symbol)

    # Try DB first
    if company:
        try:
            result = await db.execute(
                select(Financial)
                .where(Financial.company_id == company.id)
                .order_by(Financial.period_end_date.desc())
                .limit(10)
            )
            records = result.scalars().all()
            if records:
                return CompanyFinancialsResponse(
                    symbol=symbol,
                    name=company.name,
                    financials=[FinancialData.model_validate(r) for r in records],
                    source="database",
                )
        except Exception as exc:
            logger.warning("DB financials lookup failed for %s: %s", symbol, exc)

    # Try cache
    cached = get_cached(("financials", symbol.upper()), 600)
    if cached is not None:
        return CompanyFinancialsResponse(
            symbol=symbol,
            name=cached["name"],
            financials=[FinancialData(**f) for f in cached["financials"]],
            source="yfinance_cached",
        )

    # Fallback: yfinance
    info = await _yf_info(symbol)
    if not info:
        raise HTTPException(status_code=404, detail=f"Company '{symbol}' not found")

    name = company.name if company else info.get("shortName", symbol)

    live_financial = FinancialData(
        period_type="live",
        period_end_date=None,
        revenue=info.get("totalRevenue"),
        net_profit=info.get("netIncomeToCommon"),
        ebitda=info.get("ebitda"),
        total_debt=info.get("totalDebt"),
        total_equity=info.get("totalStockholderEquity"),
        pe_ratio=info.get("trailingPE") or info.get("forwardPE"),
        roe=info.get("returnOnEquity"),
        debt_to_equity=info.get("debtToEquity"),
    )

    # Cache it
    set_cached(("financials", symbol.upper()), {
        "name": name,
        "financials": [live_financial.model_dump(mode='json')]
    })

    return CompanyFinancialsResponse(
        symbol=symbol,
        name=name,
        financials=[live_financial],
        source="yfinance",
    )


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/companies/{symbol}/ownership
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/{symbol}/ownership", response_model=CompanyOwnershipResponse)
async def get_company_ownership(
    symbol: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get ownership breakdown (promoter%, FII%, DII%, retail%).

    Returns DB data if available; otherwise pulls holder info from yfinance.
    """
    company = await _find_company(db, symbol)

    # Try DB first
    if company:
        try:
            result = await db.execute(
                select(Ownership)
                .where(Ownership.company_id == company.id)
                .order_by(Ownership.as_of_date.desc())
                .limit(1)
            )
            ownership = result.scalar_one_or_none()
            if ownership:
                return CompanyOwnershipResponse(
                    symbol=symbol,
                    name=company.name,
                    ownership=OwnershipData.model_validate(ownership),
                    source="database",
                )
        except Exception as exc:
            logger.warning("DB ownership lookup failed for %s: %s", symbol, exc)

    # Try cache
    cached = get_cached(("ownership", symbol.upper()), 600)
    if cached is not None:
        return CompanyOwnershipResponse(
            symbol=symbol,
            name=cached["name"],
            ownership=OwnershipData(**cached["ownership"]) if cached["ownership"] else None,
            source="yfinance_cached",
        )

    # Fallback: yfinance
    info = await _yf_info(symbol)
    if not info:
        raise HTTPException(status_code=404, detail=f"Company '{symbol}' not found")

    name = company.name if company else info.get("shortName", symbol)

    # yfinance provides heldPercentInsiders / heldPercentInstitutions
    insiders = info.get("heldPercentInsiders")
    institutions = info.get("heldPercentInstitutions")

    promoter_pct = round(insiders * 100, 2) if insiders else None
    institutional_pct = round(institutions * 100, 2) if institutions else None
    retail_pct = None
    if promoter_pct is not None and institutional_pct is not None:
        retail_pct = round(100 - promoter_pct - institutional_pct, 2)

    live_ownership = OwnershipData(
        as_of_date=None,
        promoter_pct=promoter_pct,
        fii_pct=institutional_pct,
        dii_pct=None,
        retail_pct=retail_pct,
    )

    # Cache it
    set_cached(("ownership", symbol.upper()), {
        "name": name,
        "ownership": live_ownership.model_dump(mode='json')
    })

    return CompanyOwnershipResponse(
        symbol=symbol,
        name=name,
        ownership=live_ownership,
        source="yfinance",
    )


# ═════════════════════════════════════════════════════════════════════════════
# GET /api/companies/{symbol}/peers
# ═════════════════════════════════════════════════════════════════════════════

def _sync_yf_peers(symbol: str) -> dict:
    """Fetch sector peers for a company. Returns competitors + related entities."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info or {}
        sector = info.get("sector", "")
        industry = info.get("industry", "")
        name = info.get("shortName") or info.get("longName") or symbol

        SECTOR_PEERS = {
            "Technology": [
                ("TCS.NS","Tata Consultancy Services"),("INFY.NS","Infosys"),
                ("WIPRO.NS","Wipro"),("HCLTECH.NS","HCL Technologies"),
                ("TECHM.NS","Tech Mahindra"),("LTIM.NS","LTIMindtree"),
                ("MPHASIS.NS","Mphasis"),("PERSISTENT.NS","Persistent Systems"),
                ("COFORGE.NS","Coforge"),("OFSS.NS","Oracle Financial Services"),
            ],
            "Financial Services": [
                ("HDFCBANK.NS","HDFC Bank"),("ICICIBANK.NS","ICICI Bank"),
                ("KOTAKBANK.NS","Kotak Mahindra Bank"),("AXISBANK.NS","Axis Bank"),
                ("SBIN.NS","State Bank of India"),("BAJFINANCE.NS","Bajaj Finance"),
                ("BAJAJFINSV.NS","Bajaj Finserv"),("INDUSINDBK.NS","IndusInd Bank"),
                ("FEDERALBNK.NS","Federal Bank"),("BANDHANBNK.NS","Bandhan Bank"),
            ],
            "Energy": [
                ("RELIANCE.NS","Reliance Industries"),("ONGC.NS","ONGC"),
                ("BPCL.NS","BPCL"),("IOC.NS","Indian Oil Corporation"),
                ("NTPC.NS","NTPC"),("POWERGRID.NS","Power Grid"),
                ("COALINDIA.NS","Coal India"),("GAIL.NS","GAIL India"),
                ("ADANIGREEN.NS","Adani Green"),("TATAPOWER.NS","Tata Power"),
            ],
            "Consumer Cyclical": [
                ("MARUTI.NS","Maruti Suzuki"),("TATAMOTORS.NS","Tata Motors"),
                ("BAJAJ-AUTO.NS","Bajaj Auto"),("HEROMOTOCO.NS","Hero MotoCorp"),
                ("EICHERMOT.NS","Eicher Motors"),("TITAN.NS","Titan Company"),
                ("TATACONSUM.NS","Tata Consumer"),("VBL.NS","Varun Beverages"),
            ],
            "Consumer Defensive": [
                ("HINDUNILVR.NS","Hindustan Unilever"),("ITC.NS","ITC"),
                ("NESTLEIND.NS","Nestlé India"),("BRITANNIA.NS","Britannia"),
                ("DABUR.NS","Dabur India"),("MARICO.NS","Marico"),
                ("GODREJCP.NS","Godrej Consumer"),("COLPAL.NS","Colgate-Palmolive"),
            ],
            "Healthcare": [
                ("SUNPHARMA.NS","Sun Pharma"),("DRREDDY.NS","Dr. Reddy's"),
                ("CIPLA.NS","Cipla"),("DIVISLAB.NS","Divi's Labs"),
                ("APOLLOHOSP.NS","Apollo Hospitals"),("AUROPHARMA.NS","Aurobindo Pharma"),
                ("LUPIN.NS","Lupin"),("TORNTPHARM.NS","Torrent Pharma"),
            ],
            "Basic Materials": [
                ("TATASTEEL.NS","Tata Steel"),("JSWSTEEL.NS","JSW Steel"),
                ("HINDALCO.NS","Hindalco"),("VEDL.NS","Vedanta"),
                ("SAIL.NS","SAIL"),("NMDC.NS","NMDC"),
                ("ASIANPAINT.NS","Asian Paints"),("PIDILITIND.NS","Pidilite"),
            ],
            "Industrials": [
                ("LT.NS","Larsen & Toubro"),("ADANIPORTS.NS","Adani Ports"),
                ("SIEMENS.NS","Siemens India"),("ABB.NS","ABB India"),
                ("BEL.NS","Bharat Electronics"),("HAL.NS","HAL"),
                ("BHEL.NS","BHEL"),("CUMMINSIND.NS","Cummins India"),
            ],
            "Real Estate": [
                ("DLF.NS","DLF"),("GODREJPROP.NS","Godrej Properties"),
                ("OBEROIRLTY.NS","Oberoi Realty"),("BRIGADE.NS","Brigade Enterprises"),
                ("PRESTIGE.NS","Prestige Estates"),("SOBHA.NS","Sobha"),
            ],
            "Communication Services": [
                ("BHARTIARTL.NS","Bharti Airtel"),("IDEA.NS","Vodafone Idea"),
                ("TATACOMM.NS","Tata Communications"),("INDIAMART.NS","IndiaMART"),
                ("ZOMATO.NS","Zomato"),("NYKAA.NS","Nykaa"),
            ],
        }

        KNOWN_RELATIONSHIPS = {
            "RELIANCE.NS": [
                {"symbol":"RJIO","name":"Jio Platforms","type":"Subsidiary"},
                {"symbol":"RRETAIL","name":"Reliance Retail","type":"Subsidiary"},
                {"symbol":"BP.L","name":"BP plc","type":"Strategic Partner"},
            ],
            "TCS.NS": [
                {"symbol":"TATASON","name":"Tata Sons","type":"Parent"},
                {"symbol":"TCSBPM","name":"TCS BPM","type":"Subsidiary"},
            ],
            "INFY.NS": [
                {"symbol":"INFYBPM","name":"Infosys BPM","type":"Subsidiary"},
                {"symbol":"EDGEVERVE","name":"EdgeVerve Systems","type":"Subsidiary"},
            ],
            "WIPRO.NS": [
                {"symbol":"WIPROIT","name":"Wipro IT Services","type":"Subsidiary"},
                {"symbol":"APPIRIO","name":"Appirio","type":"Subsidiary"},
            ],
            "HDFCBANK.NS": [
                {"symbol":"HDFCLIFE.NS","name":"HDFC Life Insurance","type":"Subsidiary"},
                {"symbol":"HDFCAMC.NS","name":"HDFC AMC","type":"Subsidiary"},
                {"symbol":"HDFCSEC","name":"HDFC Securities","type":"Subsidiary"},
            ],
            "ICICIBANK.NS": [
                {"symbol":"ICICIGI.NS","name":"ICICI Prudential Life","type":"Subsidiary"},
                {"symbol":"ISEC.NS","name":"ICICI Securities","type":"Subsidiary"},
            ],
            "MARUTI.NS": [
                {"symbol":"7269.T","name":"Suzuki Motor Corp","type":"Parent"},
                {"symbol":"MARUTISUZ","name":"Maruti Insurance","type":"Subsidiary"},
            ],
            "LT.NS": [
                {"symbol":"LTTS.NS","name":"L&T Technology Services","type":"Subsidiary"},
                {"symbol":"LTIM.NS","name":"LTIMindtree","type":"Subsidiary"},
                {"symbol":"LTFH.NS","name":"L&T Finance","type":"Subsidiary"},
            ],
            "SBIN.NS": [
                {"symbol":"SBILIFE.NS","name":"SBI Life Insurance","type":"Subsidiary"},
                {"symbol":"SBICARD.NS","name":"SBI Cards","type":"Subsidiary"},
            ],
            "TATAMOTORS.NS": [
                {"symbol":"TATAMOTORS","name":"Jaguar Land Rover","type":"Subsidiary"},
                {"symbol":"TATASON","name":"Tata Sons","type":"Parent"},
            ],
            "ITC.NS": [
                {"symbol":"ITCHOTELS","name":"ITC Hotels","type":"Subsidiary"},
                {"symbol":"ITCAGROTECH","name":"ITC Agro Tech","type":"Subsidiary"},
            ],
        }

        sym_upper = symbol.upper()
        peers = []
        if sector in SECTOR_PEERS:
            for peer_sym, peer_name in SECTOR_PEERS[sector]:
                if peer_sym.upper() != sym_upper:
                    peers.append({
                        "symbol": peer_sym,
                        "name": peer_name,
                        "type": "Competitor",
                        "sector": sector,
                    })
            peers = peers[:8]

        extra = KNOWN_RELATIONSHIPS.get(sym_upper, [])

        return {
            "symbol": symbol,
            "name": name,
            "sector": sector,
            "industry": industry,
            "competitors": peers,
            "related": extra,
        }
    except Exception as exc:
        logger.warning("Peers fetch failed for %s: %s", symbol, exc)
        return {
            "symbol": symbol, "name": symbol, "sector": "",
            "industry": "", "competitors": [], "related": [],
        }


@router.get("/{symbol}/peers")
async def get_company_peers(symbol: str):
    """
    Get sector competitors and known related companies (subsidiaries/parents).
    Works dynamically for any NSE stock via sector mapping.
    """
    cached = get_cached(("peers", symbol.upper()), 600)
    if cached is not None:
        return cached
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, partial(_sync_yf_peers, symbol))
    set_cached(("peers", symbol.upper()), result)
    return result

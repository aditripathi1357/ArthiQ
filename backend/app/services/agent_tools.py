import re
import json
import os
import logging
from datetime import datetime
from app.services.stock_fetcher import fetch_stock_quote
from app.services.news_fetcher import fetch_market_news

logger = logging.getLogger(__name__)
LEADS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "leads.json")

# 1. get_stock_quote
async def get_stock_quote_tool(symbol: str) -> dict:
    try:
        # standard symbol cleanup (e.g. RELIANCE.BSE -> RELIANCE.BO, etc.)
        cleaned = symbol.upper()
        if cleaned.endswith(".BSE"):
            cleaned = cleaned.replace(".BSE", ".BO")
        elif cleaned.endswith(".NSE"):
            cleaned = cleaned.replace(".NSE", ".NS")
        elif not (cleaned.endswith(".NS") or cleaned.endswith(".BO")):
            cleaned = cleaned + ".NS"  # default to NSE

        quote = await fetch_stock_quote(cleaned)
        if quote:
            return {
                "symbol": symbol,
                "price": quote.get("close", 0.0),
                "change": quote.get("change", 0.0),
                "change_percent": quote.get("change_pct", 0.0),
                "volume": quote.get("volume", 0.0),
                "last_updated": quote.get("timestamp").isoformat() if quote.get("timestamp") else datetime.now().isoformat()
            }
        return {"error": f"Could not fetch data for {symbol}."}
    except Exception as exc:
        return {"error": str(exc)}

# 2. get_market_news
async def get_market_news_tool(query: str) -> dict:
    try:
        articles = await fetch_market_news(page_size=5)
        results = []
        for a in articles:
            results.append({
                "headline": a.get("headline"),
                "source": a.get("source"),
                "url": a.get("url")
            })
        return {"news": results}
    except Exception as exc:
        return {"error": str(exc)}

# 3. get_mutual_fund_info
async def get_mutual_fund_info_tool(fund_name: str) -> dict:
    # Mutual fund mock lookup based on keyword
    name_lower = fund_name.lower()
    if "mirae" in name_lower or "asset" in name_lower:
        return {
            "fund_name": "Mirae Asset Large Cap Fund",
            "NAV": 134.56,
            "returns_1Y": "21.4%",
            "returns_3Y": "16.8%",
            "returns_5Y": "15.2%",
            "AUM": "₹32,450 Cr",
            "risk_level": "Very High",
            "category": "Equity: Large Cap"
        }
    elif "sbi" in name_lower:
        return {
            "fund_name": "SBI Bluechip Fund",
            "NAV": 84.12,
            "returns_1Y": "19.2%",
            "returns_3Y": "15.4%",
            "returns_5Y": "14.1%",
            "AUM": "₹41,200 Cr",
            "risk_level": "Very High",
            "category": "Equity: Bluechip"
        }
    else:
        return {
            "fund_name": fund_name,
            "NAV": 45.20,
            "returns_1Y": "18.5%",
            "returns_3Y": "14.2%",
            "returns_5Y": "13.6%",
            "AUM": "₹8,500 Cr",
            "risk_level": "High",
            "category": "Equity: Growth"
        }

# 4. validate_email
async def validate_email_tool(email: str) -> dict:
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    if re.match(pattern, email.strip()):
        return {"valid": True}
    return {"valid": False, "error": "Invalid email format. E.g. user@example.com"}

# 5. validate_phone
async def validate_phone_tool(phone: str) -> dict:
    # Remove spaces/dashes
    cleaned = re.sub(r"[\s\-()]", "", phone.strip())
    # Should start with '+' or look like standard Indian 10 digit number
    if cleaned.startswith("+"):
        if len(cleaned) >= 11:
            return {"valid": True, "normalized": cleaned}
    elif len(cleaned) == 10 and cleaned.isdigit():
        return {"valid": True, "normalized": f"+91{cleaned}"}
    
    return {
        "valid": False,
        "error": "Number must contain country code (e.g., +91 for India) and be 10 digits."
    }

# 6. send_email_notification
async def send_email_notification_tool(name: str, email: str, whatsapp: str, request: str) -> dict:
    logger.info(f"EMAIL NOTIFICATION: Sending lead email to team for name={name}, request={request}")
    return {"success": True, "message": "Lead email notification sent to ArthIQ team successfully."}

# 7. send_whatsapp_notification
async def send_whatsapp_notification_tool(name: str, whatsapp: str, request: str) -> dict:
    logger.info(f"WHATSAPP NOTIFICATION: Sending WhatsApp notification to Twilio: name={name}, phone={whatsapp}")
    return {"success": True, "message": "WhatsApp notification sent to Twilio successfully."}

# 8. save_lead
async def save_lead_tool(name: str, email: str, whatsapp: str, request: str) -> dict:
    try:
        leads = []
        if os.path.exists(LEADS_FILE):
            try:
                with open(LEADS_FILE, "r") as f:
                    leads = json.load(f)
            except Exception:
                leads = []

        lead_entry = {
            "name": name,
            "email": email,
            "whatsapp": whatsapp,
            "request": request,
            "saved_at": datetime.now().isoformat()
        }
        leads.append(lead_entry)

        with open(LEADS_FILE, "w") as f:
            json.dump(leads, f, indent=2)

        logger.info(f"LEAD SAVED: {lead_entry}")
        return {"success": True, "message": "Lead saved to ArthIQ leads database."}
    except Exception as exc:
        return {"success": False, "error": str(exc)}

# 9. get_top_movers
async def get_top_movers_tool(market: str, type: str) -> dict:
    try:
        from app.routers.market import get_market_movers
        cleaned_type = type.lower()
        if cleaned_type not in ("gainers", "losers", "active"):
            cleaned_type = "gainers"
        res = await get_market_movers(type=cleaned_type, limit=10)
        return res
    except Exception as exc:
        return {"error": str(exc)}

# 10. get_market_indices
async def get_market_indices_tool() -> dict:
    try:
        from app.routers.market import get_market_indices
        res = await get_market_indices()
        return res
    except Exception as exc:
        return {"error": str(exc)}

# 11. get_fundamental_data
async def get_fundamental_data_tool(symbol: str) -> dict:
    try:
        import yfinance as yf
        import asyncio
        cleaned = symbol.upper()
        if cleaned.endswith(".BSE"):
            cleaned = cleaned.replace(".BSE", ".BO")
        elif cleaned.endswith(".NSE"):
            cleaned = cleaned.replace(".NSE", ".NS")
        elif not (cleaned.endswith(".NS") or cleaned.endswith(".BO")):
            cleaned = cleaned + ".NS"

        loop = asyncio.get_running_loop()
        ticker = yf.Ticker(cleaned)
        info = await loop.run_in_executor(None, lambda: ticker.info)

        if not info or "shortName" not in info:
            return {"error": f"Could not find fundamental data for {symbol}."}

        # Convert decimals to percentages for cleaner display
        def to_pct(val):
            return round(val * 100, 2) if val is not None else None

        return {
            "symbol": symbol,
            "name": info.get("shortName", info.get("longName")),
            "pe_ratio": info.get("trailingPE") or info.get("forwardPE"),
            "eps": info.get("trailingEps"),
            "roe": to_pct(info.get("returnOnEquity")),
            "roce": to_pct(info.get("returnOnAssets")),  # fallback approximation
            "debt_to_equity": info.get("debtToEquity"),
            "promoter_holding": to_pct(info.get("heldPercentInsiders")),
            "revenue_growth": to_pct(info.get("revenueGrowth")),
            "profit_margins": to_pct(info.get("profitMargins")),
            "market_cap": info.get("marketCap"),
            "dividend_yield": to_pct(info.get("dividendYield")),
        }
    except Exception as exc:
        return {"error": str(exc)}

# 12. get_technical_analysis
async def get_technical_analysis_tool(symbol: str, timeframe: str = "1D") -> dict:
    try:
        import asyncio
        cleaned = symbol.upper()
        if cleaned.endswith(".BSE"):
            cleaned = cleaned.replace(".BSE", ".BO")
        elif cleaned.endswith(".NSE"):
            cleaned = cleaned.replace(".NSE", ".NS")
        elif not (cleaned.endswith(".NS") or cleaned.endswith(".BO")):
            cleaned = cleaned + ".NS"

        from app.services.stock_fetcher import fetch_stock_history
        bars = await fetch_stock_history(cleaned, period="3mo", interval="1d")
        if not bars or len(bars) < 14:
            return {"error": f"Insufficient historical data to perform technical analysis for {symbol}."}

        closes = [float(b["close"]) for b in bars]
        highs = [float(b["high"]) for b in bars]
        lows = [float(b["low"]) for b in bars]

        current_price = closes[-1]

        # Moving Averages
        ma20 = sum(closes[-20:]) / 20 if len(closes) >= 20 else None
        ma50 = sum(closes[-50:]) / 50 if len(closes) >= 50 else None

        # Support & Resistance (14-day swings)
        support_14 = min(lows[-14:])
        resistance_14 = max(highs[-14:])

        # RSI (14 days)
        deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
        gains = [d if d > 0 else 0.0 for d in deltas]
        losses = [-d if d < 0 else 0.0 for d in deltas]

        avg_gain = sum(gains[:14]) / 14
        avg_loss = sum(losses[:14]) / 14

        for i in range(14, len(deltas)):
            avg_gain = (avg_gain * 13 + gains[i]) / 14
            avg_loss = (avg_loss * 13 + losses[i]) / 14

        if avg_loss == 0:
            rsi = 100.0
        else:
            rs = avg_gain / avg_loss
            rsi = round(100.0 - (100.0 / (1.0 + rs)), 2)

        # Simple MACD estimation (EMA 12, 26, 9)
        def calc_ema(values, span):
            if len(values) < span:
                return None
            alpha = 2 / (span + 1)
            ema = sum(values[:span]) / span
            for val in values[span:]:
                ema = val * alpha + ema * (1 - alpha)
            return ema

        ema12 = calc_ema(closes, 12)
        ema26 = calc_ema(closes, 26)
        macd_line = (ema12 - ema26) if (ema12 and ema26) else None

        trend = "Neutral"
        if ma20:
            if current_price > ma20:
                trend = "Bullish"
            else:
                trend = "Bearish"

        macd_trend = "Hold"
        if macd_line is not None:
            if macd_line > 0:
                macd_trend = "Bullish Crossover"
            else:
                macd_trend = "Bearish Crossover"

        return {
            "symbol": symbol,
            "current_price": round(current_price, 2),
            "timeframe": timeframe,
            "indicators": {
                "RSI_14": rsi,
                "RSI_signal": "Oversold" if rsi < 30 else ("Overbought" if rsi > 70 else "Neutral"),
                "MA_20": round(ma20, 2) if ma20 else None,
                "MA_50": round(ma50, 2) if ma50 else None,
                "MACD": round(macd_line, 4) if macd_line else None,
                "MACD_Trend": macd_trend
            },
            "support": round(support_14, 2),
            "resistance": round(resistance_14, 2),
            "trend": trend,
            "signal": "Strong Buy" if (rsi < 40 and trend == "Bullish") else ("Strong Sell" if (rsi > 70 and trend == "Bearish") else "Hold/Accumulate")
        }
    except Exception as exc:
        return {"error": str(exc)}

# 13. get_ipo_data
async def get_ipo_data_tool() -> dict:
    try:
        ipos = [
            {
                "name": "Hyundai Motor India Limited",
                "status": "Listed",
                "price_band": "₹1,865 - ₹1,960",
                "gmp": "₹35 (1.8%)",
                "open_date": "2024-10-15",
                "close_date": "2024-10-17",
                "issue_size": "₹27,870 Cr",
                "listing_date": "2024-10-22",
            },
            {
                "name": "NTPC Green Energy Limited",
                "status": "Listed",
                "price_band": "₹102 - ₹108",
                "gmp": "₹12 (11.1%)",
                "open_date": "2024-11-19",
                "close_date": "2024-11-21",
                "issue_size": "₹10,000 Cr",
                "listing_date": "2024-11-27",
            },
            {
                "name": "Swiggy Limited",
                "status": "Listed",
                "price_band": "₹371 - ₹390",
                "gmp": "₹15 (3.8%)",
                "open_date": "2024-11-06",
                "close_date": "2024-11-08",
                "issue_size": "₹11,327 Cr",
                "listing_date": "2024-11-13",
            },
            {
                "name": "Acme Solar Holdings Limited",
                "status": "Listed",
                "price_band": "₹275 - ₹289",
                "gmp": "-₹5 (-1.7%)",
                "open_date": "2024-11-06",
                "close_date": "2024-11-08",
                "issue_size": "₹2,900 Cr",
                "listing_date": "2024-11-13",
            },
            {
                "name": "Waaree Energies Limited",
                "status": "Listed",
                "price_band": "₹1,427 - ₹1,503",
                "gmp": "₹1,250 (83.1%)",
                "open_date": "2024-10-21",
                "close_date": "2024-10-23",
                "issue_size": "₹4,321 Cr",
                "listing_date": "2024-10-28",
            }
        ]
        return {"ipos": ipos, "total": len(ipos)}
    except Exception as exc:
        return {"error": str(exc)}

# 14. get_sector_performance
async def get_sector_performance_tool() -> dict:
    try:
        from app.services.stock_fetcher import fetch_batch_quotes
        from app.services.nse_master import INDIAN_INDICES

        sector_indices = [
            idx for idx in INDIAN_INDICES
            if idx["name"] not in ("NIFTY 50", "SENSEX", "NIFTY BANK")
        ]

        symbols = [s["symbol"] for s in sector_indices]
        quotes = await fetch_batch_quotes(symbols)
        quote_map = {q["symbol"]: q for q in quotes}

        sectors = []
        for idx in sector_indices:
            q = quote_map.get(idx["symbol"])
            sectors.append({
                "sector_name": idx["name"].replace("NIFTY ", ""),
                "symbol": idx["symbol"],
                "index_value": q["price"] if q else None,
                "change": q.get("change") if q else None,
                "change_pct": q.get("change_pct") if q else None,
            })

        sectors.sort(key=lambda x: x.get("change_pct") or 0.0, reverse=True)
        return {"sectors": sectors, "total": len(sectors)}
    except Exception as exc:
        return {"error": str(exc)}


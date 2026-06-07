"""
Manual test script - fetches data for RELIANCE.NS and prints results.

Usage:
    cd smartfin/backend
    python test_fetch.py

No database required - this only tests the fetch (not persistence) layer.
"""

import asyncio
import json
import sys
import os
from datetime import datetime

# Force UTF-8 on Windows console
if sys.platform == "win32":
    os.environ["PYTHONIOENCODING"] = "utf-8"
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


# ── Pretty printer ───────────────────────────────────────────────────────────

def _pp(label: str, data):
    """Pretty-print a data structure with a header."""
    print(f"\n{'═' * 70}")
    print(f"  {label}")
    print(f"{'═' * 70}")

    if data is None:
        print("  (no data returned)")
        return

    if isinstance(data, list):
        print(f"  {len(data)} records returned\n")
        for i, item in enumerate(data[:5]):  # show max 5
            print(f"  [{i+1}]")
            for k, v in item.items():
                if isinstance(v, datetime):
                    v = v.isoformat()
                print(f"      {k:>15}: {v}")
            print()
        if len(data) > 5:
            print(f"  … and {len(data) - 5} more records")
    elif isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, datetime):
                v = v.isoformat()
            elif isinstance(v, dict) and len(v) > 10:
                v = f"({len(v)} entries) " + json.dumps(dict(list(v.items())[:5]), indent=2) + " …"
            print(f"  {k:>18}: {v}")
    else:
        print(f"  {data}")


async def main():
    symbol = "RELIANCE.NS"
    print(f"\n>>> SmartFin Test Fetch -- {symbol}")
    print(f"    Timestamp: {datetime.now().isoformat()}")

    # ── Test 1: Stock Quote ──────────────────────────────────────────────
    print("\n[1/6] Fetching current stock quote...")
    try:
        from app.services.stock_fetcher import fetch_stock_quote
        quote = await fetch_stock_quote(symbol)
        _pp(f"Stock Quote: {symbol}", quote)
    except Exception as exc:
        print(f"  [ERROR] {exc}")

    # ── Test 2: Stock History ────────────────────────────────────────────
    print("\n[2/6] Fetching 5-day history (daily bars)...")
    try:
        from app.services.stock_fetcher import fetch_stock_history
        history = await fetch_stock_history(symbol, period="5d", interval="1d")
        _pp(f"Stock History: {symbol} (5d, 1d)", history)
    except Exception as exc:
        print(f"  [ERROR] {exc}")

    # ── Test 3: Company Info ─────────────────────────────────────────────
    print("\n[3/6] Fetching company info...")
    try:
        from app.services.stock_fetcher import fetch_company_info
        info = await fetch_company_info(symbol)
        _pp(f"Company Info: {symbol}", info)
    except Exception as exc:
        print(f"  [ERROR] {exc}")

    # ── Test 4: Forex Rates ──────────────────────────────────────────────
    print("\n[4/6] Fetching forex rates (USD base)...")
    try:
        from app.services.forex_fetcher import fetch_inr_rates
        forex = await fetch_inr_rates()
        _pp("Forex: USD-based INR pairs", forex)
    except Exception as exc:
        print(f"  [ERROR] (likely missing EXCHANGE_RATE_API_KEY): {exc}")

    # ── Test 5: Company News ─────────────────────────────────────────────
    print("\n[5/6] Fetching news for Reliance Industries...")
    try:
        from app.services.news_fetcher import fetch_company_news
        news = await fetch_company_news("Reliance Industries", symbol, page_size=5)
        _pp(f"News: Reliance Industries ({symbol})", news)
    except Exception as exc:
        print(f"  [ERROR] (likely missing NEWS_API_KEY): {exc}")

    # ── Test 6: Market News ──────────────────────────────────────────────
    print("\n[6/6] Fetching general market news...")
    try:
        from app.services.news_fetcher import fetch_market_news
        market_news = await fetch_market_news(page_size=5)
        _pp("Market News: Indian Stock Market", market_news)
    except Exception as exc:
        print(f"  [ERROR] (likely missing NEWS_API_KEY): {exc}")

    # -- Summary --
    print(f"\n{'=' * 70}")
    print("  [DONE] Test fetch complete!")
    print(f"{'=' * 70}")
    print()
    print("  Notes:")
    print("  - Stock data via yfinance works without any API key")
    print("  - Forex rates require EXCHANGE_RATE_API_KEY in .env")
    print("  - News articles require NEWS_API_KEY in .env")
    print("  - This script does NOT write to the database")
    print()


if __name__ == "__main__":
    asyncio.run(main())

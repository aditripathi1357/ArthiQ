"""
Centralized company data — single source of truth for symbol → name mappings.

Import this everywhere instead of duplicating company name dicts.
"""

# Symbol → human-readable name mapping
# Used by: news router, AI insights, scheduler, and anywhere else
# that needs to convert a ticker symbol to a search-friendly company name.
COMPANY_NAMES: dict[str, str] = {
    "RELIANCE.NS": "Reliance Industries",
    "TCS.NS": "Tata Consultancy Services",
    "HDFCBANK.NS": "HDFC Bank",
    "INFY.NS": "Infosys",
    "ICICIBANK.NS": "ICICI Bank",
    "HINDUNILVR.NS": "Hindustan Unilever",
    "SBIN.NS": "State Bank of India",
    "BHARTIARTL.NS": "Bharti Airtel",
    "KOTAKBANK.NS": "Kotak Mahindra Bank",
    "ITC.NS": "ITC Limited",
    "MARUTI.NS": "Maruti Suzuki",
}


def get_company_name(symbol: str) -> str:
    """
    Get human-readable company name from ticker symbol.

    Falls back to stripping the exchange suffix (e.g. 'WIPRO.NS' → 'WIPRO')
    for unknown symbols.
    """
    if symbol in COMPANY_NAMES:
        return COMPANY_NAMES[symbol]
    # Strip exchange suffix and use as search term
    base = symbol.split(".")[0] if "." in symbol else symbol
    return base

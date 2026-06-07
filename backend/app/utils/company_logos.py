"""
Company Logo Utility
════════════════════
Maps NSE stock symbols to their company domain for Clearbit logo fetching.

Usage:
    from app.utils.company_logos import get_logo_url
    url = get_logo_url("RELIANCE.NS")  # → "https://logo.clearbit.com/ril.com"
"""

# Map of yfinance symbol → company domain (for Clearbit logo API)
LOGO_DOMAINS: dict[str, str] = {
    "RELIANCE.NS":   "ril.com",
    "TCS.NS":        "tcs.com",
    "INFY.NS":       "infosys.com",
    "HDFCBANK.NS":   "hdfcbank.com",
    "ICICIBANK.NS":  "icicibank.com",
    "SBIN.NS":       "onlinesbi.sbi",
    "WIPRO.NS":      "wipro.com",
    "BHARTIARTL.NS": "airtel.in",
    "KOTAKBANK.NS":  "kotak.com",
    "LT.NS":         "larsentoubro.com",
    "AXISBANK.NS":   "axisbank.com",
    "BAJFINANCE.NS": "bajajfinserv.in",
    "MARUTI.NS":     "marutisuzuki.com",
    "TATAMOTORS.NS": "tatamotors.com",
    "SUNPHARMA.NS":  "sunpharma.com",
    "HCLTECH.NS":    "hcltech.com",
    "TATASTEEL.NS":  "tatasteel.com",
    "NESTLEIND.NS":  "nestle.in",
    "DRREDDY.NS":    "drreddys.com",
    "CIPLA.NS":      "cipla.com",
    "TITAN.NS":      "titancompany.in",
    "ONGC.NS":       "ongcindia.com",
    "NTPC.NS":       "ntpc.co.in",
    "POWERGRID.NS":  "powergridindia.com",
    "ZOMATO.NS":     "zomato.com",
    "ASIANPAINT.NS": "asianpaints.com",
    "ITC.NS":        "itcportal.com",
    "APOLLOHOSP.NS": "apollohospitals.com",
    "DIVISLAB.NS":   "divislabs.com",
    "EICHERMOT.NS":  "eichermotors.com",
    "HEROMOTOCO.NS": "heromotocorp.com",
    "BAJAJ-AUTO.NS": "bajajauto.com",
    "TECHM.NS":      "techmahindra.com",
    "ULTRACEMCO.NS": "ultratechcement.com",
    "GRASIM.NS":     "grasim.com",
    "ADANIENT.NS":   "adani.com",
    "ADANIPORTS.NS": "adaniports.com",
    "JSWSTEEL.NS":   "jsw.in",
    "HINDALCO.NS":   "hindalco.com",
    "COALINDIA.NS":  "coalindia.in",
    "BRITANNIA.NS":  "britannia.co.in",
    "BAJAJFINSV.NS": "bajajfinserv.in",
    "INDUSINDBK.NS": "indusind.com",
    "SBILIFE.NS":    "sbilife.co.in",
    "HDFCLIFE.NS":   "hdfclife.com",
    "TATAPOWER.NS":  "tatapower.com",
    "TATACONSUM.NS": "tataconsumer.com",
    "BPCL.NS":       "bharatpetroleum.com",
    "M&M.NS":        "mahindra.com",
    "MUTHOOTFIN.NS": "muthootfinance.com",
    "PIDILITIND.NS": "pidilite.com",
    "DABUR.NS":      "dabur.com",
    "HAVELLS.NS":    "havells.com",
    "MARICO.NS":     "marico.com",
    "GODREJCP.NS":   "godrejcp.com",
    "AMBUJACEM.NS":  "ambujacement.com",
    "SHREECEM.NS":   "shreecement.com",
    "LTIM.NS":       "ltimindtree.com",
    "MPHASIS.NS":    "mphasis.com",
    "PERSISTENT.NS": "persistent.com",
    "COFORGE.NS":    "coforge.com",
    "ZYDUSLIFE.NS":  "zyduslife.com",
    "TORNTPHARM.NS": "torrentpharma.com",
    "BIOCON.NS":     "biocon.com",
    "AUROPHARMA.NS": "aurobindo.com",
    "IDFCFIRSTB.NS": "idfcfirstbank.com",
    "BANDHANBNK.NS": "bandhanbank.com",
    "FEDERALBNK.NS": "federalbank.co.in",
    "CANBK.NS":      "canarabank.com",
    "BANKBARODA.NS": "bankofbaroda.in",
    "PNB.NS":        "pnbindia.in",
    "SAIL.NS":       "sail.co.in",
    "NMDC.NS":       "nmdc.co.in",
    "HINDUNILVR.NS": "hul.co.in",
    "COLPAL.NS":     "colgatepalmolive.co.in",
    "PAGEIND.NS":    "jockeyindia.com",
    "DMART.NS":      "dmartindia.com",
    "TRENT.NS":      "trentstores.com",
    "NYKAA.NS":      "nykaa.com",
    "POLICYBZR.NS":  "policybazaar.com",
    "PAYTM.NS":      "paytm.com",
    "IRCTC.NS":      "irctc.co.in",
    "RAILTEL.NS":    "railtelindia.com",
    "HAL.NS":        "hal-india.co.in",
    "BEL.NS":        "bel-india.in",
    "BHEL.NS":       "bhel.com",
    "GAIL.NS":       "gailonline.com",
    "IOC.NS":        "iocl.com",
    "HPCL.NS":       "hindustanpetroleum.com",
    "RECLTD.NS":     "recindia.nic.in",
    "PFC.NS":        "pfcindia.com",
    "NHPC.NS":       "nhpcindia.com",
    "SJVN.NS":       "sjvn.nic.in",
    "TORNTPOWER.NS": "torrentpower.com",
    "ADANIGREEN.NS": "adanigreenenergy.com",
    "ADANITRANS.NS": "adanitransmission.com",
    "ADANIPOWER.NS": "adanipower.com",
    "INDIGO.NS":     "goindigo.in",
    "SPICEJET.NS":   "spicejet.com",
    "ICICIPRULI.NS": "iciciprulife.com",
    "GICRE.NS":      "gicofindia.com",
}


def get_logo_url(symbol: str) -> str | None:
    """
    Return the Clearbit logo URL for a given NSE symbol.

    Args:
        symbol: yfinance-compatible symbol e.g. "RELIANCE.NS"

    Returns:
        Clearbit logo URL string, or None if domain is not mapped.
    """
    domain = LOGO_DOMAINS.get(symbol)
    if domain:
        return f"https://logo.clearbit.com/{domain}"
    return None


def get_all_mapped_symbols() -> list[str]:
    """Return all NSE symbols that have a logo domain mapping."""
    return list(LOGO_DOMAINS.keys())

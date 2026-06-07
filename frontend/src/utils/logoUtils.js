/**
 * logoUtils.js
 * ─────────────
 * Maps NSE stock symbols → company domains for Clearbit logo fetching.
 * Mirrors backend/app/utils/company_logos.py
 */

export const LOGO_DOMAINS = {
  'RELIANCE.NS':   'ril.com',
  'TCS.NS':        'tcs.com',
  'INFY.NS':       'infosys.com',
  'HDFCBANK.NS':   'hdfcbank.com',
  'ICICIBANK.NS':  'icicibank.com',
  'SBIN.NS':       'onlinesbi.sbi',
  'WIPRO.NS':      'wipro.com',
  'BHARTIARTL.NS': 'airtel.in',
  'KOTAKBANK.NS':  'kotak.com',
  'LT.NS':         'larsentoubro.com',
  'AXISBANK.NS':   'axisbank.com',
  'BAJFINANCE.NS': 'bajajfinserv.in',
  'MARUTI.NS':     'marutisuzuki.com',
  'TATAMOTORS.NS': 'tatamotors.com',
  'SUNPHARMA.NS':  'sunpharma.com',
  'HCLTECH.NS':    'hcltech.com',
  'TATASTEEL.NS':  'tatasteel.com',
  'NESTLEIND.NS':  'nestle.in',
  'DRREDDY.NS':    'drreddys.com',
  'CIPLA.NS':      'cipla.com',
  'TITAN.NS':      'titancompany.in',
  'ONGC.NS':       'ongcindia.com',
  'NTPC.NS':       'ntpc.co.in',
  'POWERGRID.NS':  'powergridindia.com',
  'ZOMATO.NS':     'zomato.com',
  'ASIANPAINT.NS': 'asianpaints.com',
  'ITC.NS':        'itcportal.com',
  'APOLLOHOSP.NS': 'apollohospitals.com',
  'DIVISLAB.NS':   'divislabs.com',
  'EICHERMOT.NS':  'eichermotors.com',
  'HEROMOTOCO.NS': 'heromotocorp.com',
  'BAJAJ-AUTO.NS': 'bajajauto.com',
  'TECHM.NS':      'techmahindra.com',
  'ULTRACEMCO.NS': 'ultratechcement.com',
  'GRASIM.NS':     'grasim.com',
  'ADANIENT.NS':   'adani.com',
  'ADANIPORTS.NS': 'adaniports.com',
  'JSWSTEEL.NS':   'jsw.in',
  'HINDALCO.NS':   'hindalco.com',
  'COALINDIA.NS':  'coalindia.in',
  'BRITANNIA.NS':  'britannia.co.in',
  'BAJAJFINSV.NS': 'bajajfinserv.in',
  'INDUSINDBK.NS': 'indusind.com',
  'SBILIFE.NS':    'sbilife.co.in',
  'HDFCLIFE.NS':   'hdfclife.com',
  'TATAPOWER.NS':  'tatapower.com',
  'TATACONSUM.NS': 'tataconsumer.com',
  'BPCL.NS':       'bharatpetroleum.com',
  'M&M.NS':        'mahindra.com',
  'MUTHOOTFIN.NS': 'muthootfinance.com',
  'PIDILITIND.NS': 'pidilite.com',
  'DABUR.NS':      'dabur.com',
  'HAVELLS.NS':    'havells.com',
  'MARICO.NS':     'marico.com',
  'GODREJCP.NS':   'godrejcp.com',
  'AMBUJACEM.NS':  'ambujacement.com',
  'LTIM.NS':       'ltimindtree.com',
  'MPHASIS.NS':    'mphasis.com',
  'PERSISTENT.NS': 'persistent.com',
  'COFORGE.NS':    'coforge.com',
  'INDIGO.NS':     'goindigo.in',
  'IRCTC.NS':      'irctc.co.in',
  'PAYTM.NS':      'paytm.com',
  'NYKAA.NS':      'nykaa.com',
  'ZYDUSLIFE.NS':  'zyduslife.com',
  'TORNTPHARM.NS': 'torrentpharma.com',
  'BIOCON.NS':     'biocon.com',
  'HAL.NS':        'hal-india.co.in',
  'BEL.NS':        'bel-india.in',
  'BHEL.NS':       'bhel.com',
  'GAIL.NS':       'gailonline.com',
  'IOC.NS':        'iocl.com',
  'HPCL.NS':       'hindustanpetroleum.com',
  'HINDUNILVR.NS': 'hul.co.in',
  'COLPAL.NS':     'colgatepalmolive.co.in',
  'DMART.NS':      'dmartindia.com',
  'TRENT.NS':      'trentstores.com',
  'SAIL.NS':       'sail.co.in',
  'NMDC.NS':       'nmdc.co.in',
  'FEDERALBNK.NS': 'federalbank.co.in',
  'CANBK.NS':      'canarabank.com',
  'BANKBARODA.NS': 'bankofbaroda.in',
  'PNB.NS':        'pnbindia.in',
  'RECLTD.NS':     'recindia.nic.in',
  'PFC.NS':        'pfcindia.com',
  'ADANIGREEN.NS': 'adanigreenenergy.com',
  'TORNTPOWER.NS': 'torrentpower.com',
}

/**
 * Get the Clearbit logo URL for a NSE symbol.
 * Returns undefined if not mapped (show initial circle instead).
 */
export function getLogoUrl(symbol) {
  const domain = LOGO_DOMAINS[symbol]
  return domain ? `https://logo.clearbit.com/${domain}` : undefined
}

// Sector color palette for heatmap
export const SECTOR_COLORS = {
  Technology:           { bg: '#1e3a5f', accent: '#3b82f6' },
  'Financial Services': { bg: '#1a3a2a', accent: '#22c55e' },
  Banking:              { bg: '#1a3a2a', accent: '#22c55e' },
  'Consumer Cyclical':  { bg: '#3d2a0f', accent: '#f97316' },
  'Consumer Defensive': { bg: '#2a1a3d', accent: '#a855f7' },
  Healthcare:           { bg: '#1a3030', accent: '#14b8a6' },
  Energy:               { bg: '#3d2a0f', accent: '#fb923c' },
  'Basic Materials':    { bg: '#2a2a1a', accent: '#eab308' },
  Industrials:          { bg: '#1a2a3a', accent: '#60a5fa' },
  Utilities:            { bg: '#1a2633', accent: '#38bdf8' },
  'Real Estate':        { bg: '#2a1a2a', accent: '#c084fc' },
  Communication:        { bg: '#1a2233', accent: '#818cf8' },
  default:              { bg: '#1a1f2e', accent: '#FF9933' },
}

export function getSectorColor(sector) {
  return SECTOR_COLORS[sector] || SECTOR_COLORS.default
}

/**
 * Returns a deterministic pair of gradient colors for a stock symbol.
 * This gives every unmapped stock a unique, consistent colored avatar
 * instead of the generic orange "A" placeholder.
 */
const AVATAR_PALETTES = [
  ['#FF9933', '#e6830a'], // saffron
  ['#6366f1', '#4f46e5'], // indigo
  ['#0ea5e9', '#0284c7'], // sky
  ['#10b981', '#059669'], // emerald
  ['#f59e0b', '#d97706'], // amber
  ['#8b5cf6', '#7c3aed'], // violet
  ['#ec4899', '#db2777'], // pink
  ['#14b8a6', '#0d9488'], // teal
  ['#f97316', '#ea580c'], // orange
  ['#06b6d4', '#0891b2'], // cyan
  ['#84cc16', '#65a30d'], // lime
  ['#a855f7', '#9333ea'], // purple
]

export function getAvatarColors(symbol = '') {
  // Simple hash of the symbol string to pick a stable palette
  let hash = 0
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash * 31 + symbol.charCodeAt(i)) | 0
  }
  const idx = Math.abs(hash) % AVATAR_PALETTES.length
  const [from, to] = AVATAR_PALETTES[idx]
  return { from, to }
}

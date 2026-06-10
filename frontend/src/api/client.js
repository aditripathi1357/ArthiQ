import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

if (!import.meta.env.VITE_API_URL && import.meta.env.PROD) {
  console.warn('[ArthiQ] VITE_API_URL is not set — API calls will fail in production!')
}

// ── Axios instance ─────────────────────────────────────────────────────────
// Timeout is 45s to survive Render free-tier cold starts (can take 30-60s)
const api = axios.create({
  baseURL: BASE,
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Retry interceptor — 1 automatic retry on network/timeout errors ─────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config
    // Only retry once, and only on timeout or network errors (not 4xx/5xx)
    if (
      config &&
      !config._retried &&
      (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || !error.response)
    ) {
      config._retried = true
      // Brief pause before retry
      await new Promise((r) => setTimeout(r, 2000))
      return api(config)
    }
    return Promise.reject(error)
  }
)

// ── Slow-request tracker (exposes cold-start state to UI) ──────────────────
let _slowListeners = []
let _isSlow = false

export function onSlowRequest(fn) {
  _slowListeners.push(fn)
  return () => { _slowListeners = _slowListeners.filter((l) => l !== fn) }
}

api.interceptors.request.use((config) => {
  const timer = setTimeout(() => {
    _isSlow = true
    _slowListeners.forEach((fn) => fn(true))
  }, 8000) // warn after 8s
  config._slowTimer = timer
  return config
})

api.interceptors.response.use(
  (response) => {
    clearTimeout(response.config._slowTimer)
    if (_isSlow) { _isSlow = false; _slowListeners.forEach((fn) => fn(false)) }
    return response
  },
  (error) => {
    if (error.config?._slowTimer) clearTimeout(error.config._slowTimer)
    if (_isSlow) { _isSlow = false; _slowListeners.forEach((fn) => fn(false)) }
    return Promise.reject(error)
  }
)

// ── Simple in-memory cache ──────────────────────────────────────────────────
const _cache = {}

const TTL = {
  indices:  3 * 60 * 1000,   // 3 min
  movers:   2 * 60 * 1000,   // 2 min
  news:     5 * 60 * 1000,   // 5 min
  quote:    1 * 60 * 1000,   // 1 min
  profile:  10 * 60 * 1000,  // 10 min
  breadth:  2 * 60 * 1000,   // 2 min
  calendar: 10 * 60 * 1000,  // 10 min
  default:  60 * 1000,
}

function cachedGet(url, ttlKey = 'default', force = false) {
  const now = Date.now()
  const ttl = TTL[ttlKey] ?? TTL.default
  if (!force && _cache[url] && (now - _cache[url].time) < ttl) {
    return Promise.resolve(_cache[url].data)
  }
  return api.get(url).then(res => {
    _cache[url] = { data: res, time: now }
    return res
  })
}

// Bust the cache for a specific URL or all URLs
export function clearCache(url) {
  if (url) delete _cache[url]
  else Object.keys(_cache).forEach(k => delete _cache[k])
}

// ── Companies ──────────────────────────────────────────────────────────
export const searchCompanies = (q) =>
  api.get(`/api/companies/search?q=${encodeURIComponent(q)}`)

export const getCompanyProfile = (symbol) =>
  cachedGet(`/api/companies/${symbol}`, 'profile')

export const getCompanyOverview = (symbol) =>
  cachedGet(`/api/companies/${symbol}/overview`, 'profile')

export const getFinancials = (symbol) =>
  cachedGet(`/api/companies/${symbol}/financials`, 'profile')

export const getOwnership = (symbol) =>
  cachedGet(`/api/companies/${symbol}/ownership`, 'profile')

export const getCompanyPeers = (symbol) =>
  cachedGet(`/api/companies/${symbol}/peers`, 'profile')

// ── Stocks ─────────────────────────────────────────────────────────────
export const getStockQuote = (symbol) =>
  cachedGet(`/api/stocks/${symbol}/quote`, 'quote')

export const getStockHistory = (symbol, period = '1mo', interval = '1d') =>
  api.get(`/api/stocks/${symbol}/history?period=${period}&interval=${interval}`)

export const getStockChart = (symbol, period = '1mo') =>
  api.get(`/api/stocks/${symbol}/chart?period=${period}`)

// ── News ───────────────────────────────────────────────────────────────
export const getCompanyNews = (symbol, limit = 5) =>
  api.get(`/api/news/${symbol}?limit=${limit}`)

export const getMarketNews = (limit = 10) =>
  cachedGet(`/api/news/market/latest?limit=${limit}`, 'news')

// ── Forex ──────────────────────────────────────────────────────────────
export const getForexRates = (base = 'USD') =>
  api.get(`/api/forex/rates?base=${base}`)

export const getINRRates = () =>
  api.get(`/api/forex/inr`)

export const getForexPair = (pair) =>
  api.get(`/api/forex/${pair}`)

// ── AI Insights ────────────────────────────────────────────────────────
export const getWhyMoved = (symbol) =>
  api.get(`/api/insights/${symbol}/why-moved`)

export const getStockSummary = (symbol) =>
  api.get(`/api/insights/${symbol}/summary`)

export const getCompanyOutlook = (symbol) =>
  api.get(`/api/insights/${symbol}/outlook`)

export const getWeeklyOutlook = () =>
  api.get(`/api/insights/market/weekly-outlook`)

// ── Market ─────────────────────────────────────────────────────────────
export const getMarketIndices = () =>
  cachedGet('/api/market/indices', 'indices')

export const getTopGainers = (limit = 15) =>
  cachedGet(`/api/market/top-gainers?limit=${limit}`, 'movers')

export const getTopLosers = (limit = 15) =>
  cachedGet(`/api/market/top-losers?limit=${limit}`, 'movers')

export const getMostActive = (limit = 15) =>
  cachedGet(`/api/market/most-active?limit=${limit}`, 'movers')

// Unified movers endpoint
export const getMarketMovers = (type = 'gainers', limit = 8) =>
  cachedGet(`/api/market/movers?type=${type}&limit=${limit}`, 'movers')

// Market breadth (advance/decline ratio)
export const getMarketBreadth = () =>
  cachedGet('/api/market/breadth', 'breadth')

export const getAllStocks = (page = 1, perPage = 50, search = '', sortBy = 'symbol', sortOrder = 'asc') => {
  const params = new URLSearchParams({
    page,
    per_page: perPage,
    sort_by: sortBy,
    order: sortOrder,
  })
  if (search) params.append('search', search)
  return api.get(`/api/market/stocks?${params.toString()}`)
}

export const getMarketSectors = () =>
  cachedGet('/api/market/sectors', 'profile')

// ── Economic Calendar ────────────────────────────────────────────────────────
export const getCalendarAll = () =>
  cachedGet('/api/calendar/all', 'calendar')

export const getCalendarEconomic = () =>
  cachedGet('/api/calendar/economic', 'calendar')

export const getCalendarEarnings = () =>
  cachedGet('/api/calendar/earnings', 'calendar')

// ── Notifications & Research List ─────────────────────────────────────────
// All notification endpoints require X-User-Id header (Supabase UID)
const notifHeaders = (userId) => ({
  headers: { 'X-User-Id': userId },
})

export const getNotificationProfile = (userId) =>
  api.get('/api/notifications/profile', notifHeaders(userId))

export const saveNotificationProfile = (userId, data) =>
  api.post('/api/notifications/profile', data, notifHeaders(userId))

export const getResearchList = (userId) =>
  api.get('/api/notifications/research-list', notifHeaders(userId))

export const addToResearchList = (userId, symbol, companyName) =>
  api.post('/api/notifications/research-list', { symbol, company_name: companyName }, notifHeaders(userId))

export const removeFromResearchList = (userId, symbol) =>
  api.delete(`/api/notifications/research-list/${symbol}`, notifHeaders(userId))

export const getResearchReport = (userId, symbol) =>
  api.get(`/api/notifications/reports/${symbol}`, notifHeaders(userId))

export const generateResearchReport = (userId, symbol) =>
  api.post(`/api/notifications/reports/${symbol}/generate`, {}, notifHeaders(userId))

export const getAllResearchReports = (userId) =>
  api.get('/api/notifications/reports', notifHeaders(userId))

export const getNotificationLogs = (userId, limit = 20) =>
  api.get(`/api/notifications/logs?limit=${limit}`, notifHeaders(userId))

// ── Virtual Trading ────────────────────────────────────────────────────────
const tradeHeaders = (userId) => ({
  headers: { 'X-User-Id': userId },
})

export const getVirtualAccount    = (userId) =>
  api.get('/api/trade/account', tradeHeaders(userId))

export const getVirtualPortfolio  = (userId) =>
  api.get('/api/trade/portfolio', tradeHeaders(userId))

export const buyStock = (userId, symbol, quantity, companyName = '') =>
  api.post('/api/trade/buy', { symbol, quantity, company_name: companyName }, tradeHeaders(userId))

export const sellStock = (userId, symbol, quantity) =>
  api.post('/api/trade/sell', { symbol, quantity }, tradeHeaders(userId))

export const getVirtualTransactions = (userId, limit = 50) =>
  api.get(`/api/trade/transactions?limit=${limit}`, tradeHeaders(userId))

export const getLeaderboard        = (userId) =>
  api.get('/api/trade/leaderboard', tradeHeaders(userId))

export const getAchievements       = (userId) =>
  api.get('/api/trade/achievements', tradeHeaders(userId))

export const getAICoach            = (userId) =>
  api.get('/api/trade/ai-coach', tradeHeaders(userId))

export const resetVirtualAccount   = (userId) =>
  api.post('/api/trade/reset', {}, tradeHeaders(userId))

export default api

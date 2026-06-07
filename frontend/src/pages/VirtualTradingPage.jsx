import { useState, useEffect, useCallback, useRef } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, BarChart2, Clock, Trophy,
  Award, Brain, RefreshCw, Plus, Minus, Search, ChevronUp, ChevronDown,
  Zap, Target, Star, AlertCircle, CheckCircle2, X, RotateCcw, Info
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  getVirtualPortfolio, buyStock, sellStock,
  getVirtualTransactions, getLeaderboard, getAchievements,
  getAICoach, resetVirtualAccount, searchCompanies, getStockQuote,
} from '../api/client'

const TABS = [
  { id: 'portfolio',    label: 'Portfolio',    icon: BarChart2 },
  { id: 'trade',        label: 'Trade',        icon: Zap },
  { id: 'history',      label: 'History',      icon: Clock },
  { id: 'leaderboard',  label: 'Leaderboard',  icon: Trophy },
  { id: 'achievements', label: 'Achievements', icon: Award },
]

const fmt  = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const fmtN = (n, decimals = 2) => Number(n || 0).toFixed(decimals)
const pnlColor = (n) => Number(n) >= 0 ? '#16a34a' : '#dc2626'
const pnlBg   = (n) => Number(n) >= 0 ? '#16a34a15' : '#dc262615'

export default function VirtualTradingPage() {
  const { user } = useAuth()
  const userId   = user?.id

  const [activeTab, setActiveTab] = useState('portfolio')

  // ── Data state ──────────────────────────────────────────────────────────────
  const [portfolio,     setPortfolio]     = useState(null)
  const [transactions,  setTransactions]  = useState([])
  const [leaderboard,   setLeaderboard]   = useState(null)
  const [achievements,  setAchievements]  = useState([])
  const [aiCoach,       setAICoach]       = useState(null)

  // ── Loading state ────────────────────────────────────────────────────────────
  const [loadingPortfolio,    setLoadingPortfolio]    = useState(false)
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [loadingLeaderboard,  setLoadingLeaderboard]  = useState(false)
  const [loadingAchievements, setLoadingAchievements] = useState(false)
  const [loadingCoach,        setLoadingCoach]        = useState(false)

  // ── Trade state ──────────────────────────────────────────────────────────────
  const [tradeSymbol,    setTradeSymbol]    = useState('')
  const [tradeCompany,   setTradeCompany]   = useState('')
  const [tradeQty,       setTradeQty]       = useState(1)
  const [tradePrice,     setTradePrice]     = useState(null)
  const [tradeMode,      setTradeMode]      = useState('BUY')   // BUY | SELL
  const [tradeLoading,   setTradeLoading]   = useState(false)
  const [tradeMsg,       setTradeMsg]       = useState(null)
  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchResults,  setSearchResults]  = useState([])
  const [searching,      setSearching]      = useState(false)
  const [priceLoading,   setPriceLoading]   = useState(false)

  const searchTimeout = useRef(null)

  // ── Load portfolio on mount ──────────────────────────────────────────────────
  const loadPortfolio = useCallback(async () => {
    if (!userId) return
    setLoadingPortfolio(true)
    try {
      const res = await getVirtualPortfolio(userId)
      setPortfolio(res.data)
    } catch (e) {
      console.error('Portfolio load error', e)
    } finally { setLoadingPortfolio(false) }
  }, [userId])

  const loadTransactions = useCallback(async () => {
    if (!userId) return
    setLoadingTransactions(true)
    try {
      const res = await getVirtualTransactions(userId)
      setTransactions(res.data.transactions || [])
    } catch {} finally { setLoadingTransactions(false) }
  }, [userId])

  const loadLeaderboard = useCallback(async () => {
    if (!userId) return
    setLoadingLeaderboard(true)
    try {
      const res = await getLeaderboard(userId)
      setLeaderboard(res.data)
    } catch {} finally { setLoadingLeaderboard(false) }
  }, [userId])

  const loadAchievements = useCallback(async () => {
    if (!userId) return
    setLoadingAchievements(true)
    try {
      const res = await getAchievements(userId)
      setAchievements(res.data.achievements || [])
    } catch {} finally { setLoadingAchievements(false) }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    loadPortfolio()
  }, [userId, loadPortfolio])

  useEffect(() => {
    if (!userId) return
    if (activeTab === 'history')      loadTransactions()
    if (activeTab === 'leaderboard')  loadLeaderboard()
    if (activeTab === 'achievements') loadAchievements()
  }, [activeTab, userId])

  // ── Stock search ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchCompanies(searchQuery)
        // API returns { results: [...] } where each item has { symbol, name }
        setSearchResults((res.data?.results || res.data || []).slice(0, 6))
      } catch { setSearchResults([]) }
      finally { setSearching(false) }
    }, 300)
  }, [searchQuery])

  // ── Fetch live price when symbol changes ─────────────────────────────────────
  useEffect(() => {
    if (!tradeSymbol) { setTradePrice(null); return }
    setPriceLoading(true)
    getStockQuote(tradeSymbol)
      .then(res => {
        const d = res.data
        // Quote API may return different field names
        setTradePrice(d?.price || d?.close || d?.regularMarketPrice || d?.current_price || null)
      })
      .catch(() => setTradePrice(null))
      .finally(() => setPriceLoading(false))
  }, [tradeSymbol])

  // ── Select stock from search ─────────────────────────────────────────────────
  const handleSelectStock = (company) => {
    const sym = company.symbol || company.ticker || ''
    setTradeSymbol(sym)
    setTradeCompany(company.name || company.company_name || sym)
    setSearchQuery(company.name || company.company_name || sym)
    setSearchResults([])
  }

  // ── Execute trade ────────────────────────────────────────────────────────────
  const handleTrade = async () => {
    if (!userId || !tradeSymbol || tradeQty < 1) return
    setTradeLoading(true)
    setTradeMsg(null)
    try {
      const res = tradeMode === 'BUY'
        ? await buyStock(userId, tradeSymbol, tradeQty, tradeCompany)
        : await sellStock(userId, tradeSymbol, tradeQty)
      setTradeMsg({ type: 'success', text: res.data.message })
      await loadPortfolio()
    } catch (e) {
      setTradeMsg({ type: 'error', text: e.response?.data?.detail || 'Trade failed.' })
    } finally { setTradeLoading(false) }
  }

  // ── AI Coach ─────────────────────────────────────────────────────────────────
  const handleAICoach = async () => {
    if (!userId) return
    setLoadingCoach(true)
    try {
      const res = await getAICoach(userId)
      setAICoach(res.data)
    } catch {} finally { setLoadingCoach(false) }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const handleReset = async () => {
    if (!window.confirm('Reset your account to ₹1,00,000? This cannot be undone.')) return
    try {
      await resetVirtualAccount(userId)
      setTradeMsg({ type: 'success', text: 'Account reset to ₹1,00,000!' })
      await loadPortfolio()
    } catch {
      setTradeMsg({ type: 'error', text: 'Reset failed.' })
    }
  }

  // ── Guard ────────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <TrendingUp size={40} className="text-saffron mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Sign in Required</h2>
          <p style={{ color: 'var(--text-muted)' }}>Please sign in to access Virtual Trading.</p>
        </div>
      </div>
    )
  }

  const totalCost = tradePrice ? tradePrice * tradeQty : 0

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Hero Banner ──────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1a2744 50%, #0f172a 100%)',
        borderBottom: '1px solid rgba(255,153,51,0.15)',
      }}>
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 relative">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-saffron/20 border border-saffron/30 flex items-center justify-center shrink-0">
              <TrendingUp size={22} className="text-saffron" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold uppercase tracking-widest text-saffron">Paper Trading</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white" style={{ background: '#16a34a' }}>LIVE PRICES</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">Virtual Trading Simulator</h1>
              <p className="text-sm text-slate-400">₹1,00,000 monthly allowance · Real market prices · Zero risk</p>
            </div>
          </div>

          {/* Stats strip */}
          {portfolio ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Portfolio Value', value: fmt(portfolio.portfolio_value), sub: portfolio.return_percentage >= 0 ? `+${fmtN(portfolio.return_percentage)}%` : `${fmtN(portfolio.return_percentage)}%`, pos: portfolio.return_percentage >= 0 },
                { label: 'Available Cash',  value: fmt(portfolio.cash_balance),    sub: 'to deploy', pos: true },
                { label: 'Total P&L',       value: fmt(portfolio.total_pnl),       sub: portfolio.total_pnl >= 0 ? 'Profit' : 'Loss', pos: portfolio.total_pnl >= 0 },
                { label: 'Holdings',        value: portfolio.holdings?.length || 0, sub: 'stocks', pos: true },
              ].map(({ label, value, sub, pos }) => (
                <div key={label} className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-xs text-slate-400 mb-1">{label}</p>
                  <p className="text-lg font-black text-white">{value}</p>
                  <p className="text-xs font-semibold" style={{ color: pos ? '#16a34a' : '#dc2626' }}>{sub}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="rounded-xl h-20 animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex overflow-x-auto scrollbar-none">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold whitespace-nowrap shrink-0 border-b-2 transition-all"
              style={{
                borderColor:  activeTab === id ? '#FF9933' : 'transparent',
                color:        activeTab === id ? '#FF9933' : 'var(--text-muted)',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* ══ TAB: Portfolio ══════════════════════════════════════════════════ */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            {/* Summary cards */}
            {portfolio && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Invested Amount',   value: fmt(portfolio.invested_amount),  icon: DollarSign, color: '#3b82f6' },
                  { label: 'Unrealized P&L',    value: fmt(portfolio.unrealized_pnl),   icon: TrendingUp,  color: pnlColor(portfolio.unrealized_pnl) },
                  { label: 'Realized P&L',      value: fmt(portfolio.realized_pnl),     icon: CheckCircle2, color: pnlColor(portfolio.realized_pnl) },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                        <Icon size={15} style={{ color }} />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
                    </div>
                    <p className="text-xl font-black" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Holdings table */}
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <BarChart2 size={16} className="text-saffron" />
                  Your Holdings ({portfolio?.holdings?.length || 0})
                </h2>
                <button onClick={loadPortfolio} className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <RefreshCw size={12} className={loadingPortfolio ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {loadingPortfolio ? (
                <div className="p-6 space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--bg-secondary)' }} />)}
                </div>
              ) : !portfolio?.holdings?.length ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <TrendingUp size={32} className="text-saffron mb-3" />
                  <p className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>No holdings yet</p>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Go to the Trade tab to buy your first stock.</p>
                  <button onClick={() => setActiveTab('trade')}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#FF9933,#e6830a)' }}>
                    Start Trading
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                        {['Stock','Qty','Avg Price','Current','Market Value','P&L','Return','Action'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.holdings.map((h, i) => (
                        <tr key={h.symbol} className="transition-colors hover:bg-black/5"
                          style={{ borderBottom: i < portfolio.holdings.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                {h.symbol.replace('.NS','').slice(0,2)}
                              </div>
                              <div>
                                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{h.company_name}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{h.symbol.replace('.NS','')}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 font-semibold" style={{ color: 'var(--text-primary)' }}>{h.quantity}</td>
                          <td className="px-4 py-4" style={{ color: 'var(--text-muted)' }}>₹{Number(h.avg_buy_price).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-4 font-semibold" style={{ color: 'var(--text-primary)' }}>₹{Number(h.current_price).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-4" style={{ color: 'var(--text-primary)' }}>₹{Number(h.market_value).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-4">
                            <span className="font-bold" style={{ color: pnlColor(h.unrealized_pnl) }}>
                              {h.unrealized_pnl >= 0 ? '+' : ''}₹{Number(Math.abs(h.unrealized_pnl)).toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-xs font-bold px-2 py-1 rounded-full"
                              style={{ background: pnlBg(h.unrealized_pnl_pct), color: pnlColor(h.unrealized_pnl_pct) }}>
                              {h.unrealized_pnl_pct >= 0 ? '+' : ''}{fmtN(h.unrealized_pnl_pct)}%
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => { setActiveTab('trade'); setTradeMode('SELL'); setTradeSymbol(h.symbol); setTradeCompany(h.company_name); setSearchQuery(h.company_name) }}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
                              style={{ background: '#dc262620', color: '#dc2626' }}>
                              Sell
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* AI Coach card */}
            <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Brain size={16} className="text-saffron" />
                  AI Trading Coach
                </h2>
                <button onClick={handleAICoach} disabled={loadingCoach}
                  className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border transition-all hover:border-saffron"
                  style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                  {loadingCoach ? <RefreshCw size={13} className="animate-spin" /> : <Brain size={13} />}
                  {loadingCoach ? 'Analyzing...' : 'Analyze Portfolio'}
                </button>
              </div>
              {aiCoach ? (
                <div>
                  <p className="text-sm mb-4 font-semibold" style={{ color: 'var(--text-muted)' }}>{aiCoach.summary}</p>
                  <div className="space-y-2">
                    {(aiCoach.insights || []).map((ins, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                        <Info size={14} className="text-saffron mt-0.5 shrink-0" />
                        <span style={{ color: 'var(--text-primary)' }}>{ins}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Risk Level:</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                      background: aiCoach.risk_level === 'high' ? '#dc262620' : aiCoach.risk_level === 'medium' ? '#f59e0b20' : '#16a34a20',
                      color:      aiCoach.risk_level === 'high' ? '#dc2626'   : aiCoach.risk_level === 'medium' ? '#f59e0b'   : '#16a34a',
                    }}>{aiCoach.risk_level?.toUpperCase()}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Click "Analyze Portfolio" to get personalized AI insights on your holdings, risk exposure, and strategy.
                </p>
              )}
            </div>

            {/* Reset button */}
            <div className="flex justify-end">
              <button onClick={handleReset} className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl border transition-all hover:border-red-400 hover:text-red-500"
                style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                <RotateCcw size={12} /> Reset Account to ₹1,00,000
              </button>
            </div>
          </div>
        )}

        {/* ══ TAB: Trade ═════════════════════════════════════════════════════ */}
        {activeTab === 'trade' && (
          <div className="max-w-xl mx-auto space-y-4">
            <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <h2 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Zap size={18} className="text-saffron" />
                Place a Trade
              </h2>

              {/* BUY / SELL toggle */}
              <div className="flex rounded-xl overflow-hidden border mb-5" style={{ borderColor: 'var(--border)' }}>
                {['BUY','SELL'].map(m => (
                  <button key={m} onClick={() => setTradeMode(m)}
                    className="flex-1 py-2.5 text-sm font-bold transition-all"
                    style={{
                      background: tradeMode === m ? (m === 'BUY' ? '#16a34a' : '#dc2626') : 'transparent',
                      color:      tradeMode === m ? '#fff' : 'var(--text-muted)',
                    }}>{m}</button>
                ))}
              </div>

              {/* Stock search */}
              <div className="mb-4 relative">
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Search Stock
                </label>
                <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                  <Search size={14} style={{ color: 'var(--text-muted)' }} />
                  <input
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: 'var(--text-primary)' }}
                    placeholder="Search company or symbol..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {searching && <RefreshCw size={12} className="animate-spin text-saffron" />}
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-20 overflow-hidden"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    {searchResults.map((c, i) => {
                      const sym = c.symbol || c.ticker || ''
                      return (
                        <div key={i} onClick={() => handleSelectStock(c)}
                          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-black/5 transition-colors"
                          style={{ borderBottom: i < searchResults.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{c.name || c.company_name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sym} · {c.exchange || 'NSE'}</p>
                          </div>
                          <Plus size={14} className="text-saffron" />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Selected stock info */}
              {tradeSymbol && (
                <div className="mb-4 rounded-xl p-3 flex items-center justify-between" style={{ background: 'var(--bg-secondary)' }}>
                  <div>
                    <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{tradeCompany}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{tradeSymbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Current Price</p>
                    {priceLoading
                      ? <div className="h-5 w-20 rounded animate-pulse mt-0.5" style={{ background: 'var(--border)' }} />
                      : <p className="font-black" style={{ color: 'var(--text-primary)' }}>
                          {tradePrice ? `₹${Number(tradePrice).toLocaleString('en-IN')}` : '—'}
                        </p>
                    }
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-5">
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setTradeQty(q => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-lg flex items-center justify-center border transition-all hover:border-saffron"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <Minus size={14} />
                  </button>
                  <input type="number" min="1" value={tradeQty}
                    onChange={e => setTradeQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 text-center rounded-xl border py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-saffron/30 focus:border-saffron"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                  <button onClick={() => setTradeQty(q => q + 1)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center border transition-all hover:border-saffron"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Order summary */}
              {tradeSymbol && tradePrice && (
                <div className="mb-5 rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <div className="flex justify-between text-sm mb-2">
                    <span style={{ color: 'var(--text-muted)' }}>Price per share</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>₹{Number(tradePrice).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span style={{ color: 'var(--text-muted)' }}>Quantity</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{tradeQty}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Total {tradeMode === 'BUY' ? 'Cost' : 'Value'}</span>
                    <span className="font-black text-saffron">₹{Number(totalCost).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  {tradeMode === 'BUY' && portfolio && (
                    <p className="text-xs mt-2" style={{ color: totalCost > portfolio.cash_balance ? '#dc2626' : '#16a34a' }}>
                      {totalCost > portfolio.cash_balance
                        ? `⚠ Insufficient balance (have ₹${Number(portfolio.cash_balance).toLocaleString('en-IN')})`
                        : `✓ Balance after buy: ₹${Number(portfolio.cash_balance - totalCost).toLocaleString('en-IN')}`
                      }
                    </p>
                  )}
                </div>
              )}

              {/* Trade message */}
              {tradeMsg && (
                <div className={`flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl mb-4 ${
                  tradeMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {tradeMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                  {tradeMsg.text}
                </div>
              )}

              {/* Execute button */}
              <button
                onClick={handleTrade}
                disabled={tradeLoading || !tradeSymbol || !tradePrice || tradeQty < 1}
                className="w-full py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                style={{
                  background: tradeMode === 'BUY'
                    ? 'linear-gradient(135deg,#16a34a,#15803d)'
                    : 'linear-gradient(135deg,#dc2626,#b91c1c)',
                  color: '#fff',
                  opacity: (tradeLoading || !tradeSymbol || !tradePrice) ? 0.6 : 1,
                  boxShadow: tradeMode === 'BUY' ? '0 4px 16px rgba(22,163,74,0.3)' : '0 4px 16px rgba(220,38,38,0.3)',
                }}>
                {tradeLoading
                  ? <><RefreshCw size={15} className="animate-spin" /> Processing...</>
                  : tradeMode === 'BUY'
                  ? <><TrendingUp size={15} /> Buy {tradeQty} {tradeSymbol?.replace('.NS','')}</>
                  : <><TrendingDown size={15} /> Sell {tradeQty} {tradeSymbol?.replace('.NS','')}</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ══ TAB: History ═══════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Transaction History</h2>
              <button onClick={loadTransactions} className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                <RefreshCw size={12} className={loadingTransactions ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            {loadingTransactions ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)' }} />)}
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <Clock size={32} className="text-saffron mb-3" />
                <p className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>No trades yet</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Place your first trade in the Trade tab.</p>
              </div>
            ) : (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                {transactions.map((t, i) => {
                  const isBuy = t.type === 'BUY'
                  return (
                    <div key={t.id} className="flex items-center gap-4 px-6 py-4 hover:bg-black/5 transition-colors"
                      style={{ borderBottom: i < transactions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: isBuy ? '#16a34a20' : '#dc262620' }}>
                        {isBuy ? <TrendingUp size={15} color="#16a34a" /> : <TrendingDown size={15} color="#dc2626" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          <span className="font-black" style={{ color: isBuy ? '#16a34a' : '#dc2626' }}>{t.type}</span>
                          {' '}{t.company_name || t.symbol?.replace('.NS','')}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {t.quantity} shares @ ₹{Number(t.price).toLocaleString('en-IN')} · {t.timestamp ? new Date(t.timestamp).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>₹{Number(t.total_value).toLocaleString('en-IN')}</p>
                        {!isBuy && t.realized_pnl !== 0 && (
                          <p className="text-xs font-bold" style={{ color: pnlColor(t.realized_pnl) }}>
                            P&L: {t.realized_pnl >= 0 ? '+' : ''}₹{Number(Math.abs(t.realized_pnl)).toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: Leaderboard ═══════════════════════════════════════════════ */}
        {activeTab === 'leaderboard' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Monthly Leaderboard</h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {leaderboard ? `${new Date(leaderboard.year, leaderboard.month - 1).toLocaleString('en-IN', { month: 'long' })} ${leaderboard.year} · ${leaderboard.total_traders} traders` : 'Loading...'}
                </p>
              </div>
              <button onClick={loadLeaderboard} className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                <RefreshCw size={12} className={loadingLeaderboard ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            {/* User rank pill */}
            {leaderboard?.user_rank && (
              <div className="mb-5 px-5 py-4 rounded-2xl flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg,rgba(255,153,51,0.12),rgba(255,153,51,0.04))', border: '1px solid rgba(255,153,51,0.2)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg" style={{ background: '#FF993320', color: '#FF9933' }}>
                    #{leaderboard.user_rank.rank}
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Your Rank</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmt(leaderboard.user_rank.portfolio_value)}</p>
                  </div>
                </div>
                <span className="text-xl font-black" style={{ color: pnlColor(leaderboard.user_rank.return_percentage) }}>
                  {leaderboard.user_rank.return_percentage >= 0 ? '+' : ''}{fmtN(leaderboard.user_rank.return_percentage)}%
                </span>
              </div>
            )}

            {loadingLeaderboard ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)' }} />)}
              </div>
            ) : !leaderboard?.top10?.length ? (
              <div className="flex flex-col items-center py-20 text-center">
                <Trophy size={32} className="text-saffron mb-3" />
                <p className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>No traders yet this month</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Place a trade to appear on the leaderboard!</p>
              </div>
            ) : (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                {leaderboard.top10.map((entry, i) => {
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                  return (
                    <div key={i} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-black/5"
                      style={{
                        borderBottom: i < leaderboard.top10.length - 1 ? '1px solid var(--border)' : 'none',
                        background: entry.is_current_user ? 'rgba(255,153,51,0.05)' : '',
                      }}>
                      <div className="w-8 text-center font-black text-lg" style={{ color: i < 3 ? '#FF9933' : 'var(--text-muted)' }}>
                        {medal || `#${entry.rank}`}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {entry.display_name}
                          {entry.is_current_user && <span className="ml-2 text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#FF993320', color: '#FF9933' }}>You</span>}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmt(entry.portfolio_value)}</p>
                      </div>
                      <span className="font-black text-base" style={{ color: pnlColor(entry.return_percentage) }}>
                        {entry.return_percentage >= 0 ? '+' : ''}{fmtN(entry.return_percentage)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: Achievements ══════════════════════════════════════════════ */}
        {activeTab === 'achievements' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Achievements</h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {achievements.filter(a => a.unlocked).length}/{achievements.length} badges unlocked
                </p>
              </div>
              <button onClick={loadAchievements} className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                <RefreshCw size={12} className={loadingAchievements ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            {loadingAchievements ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)' }} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {achievements.map((badge) => (
                  <div key={badge.id} className="rounded-2xl border p-5 transition-all"
                    style={{
                      borderColor: badge.unlocked ? 'rgba(255,153,51,0.4)' : 'var(--border)',
                      background:  badge.unlocked ? 'linear-gradient(135deg,rgba(255,153,51,0.08),rgba(255,153,51,0.02))' : 'var(--bg-card)',
                      opacity:     badge.unlocked ? 1 : 0.55,
                    }}>
                    <div className="text-3xl mb-3">{badge.icon}</div>
                    <p className="font-black text-sm mb-1" style={{ color: badge.unlocked ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {badge.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{badge.description}</p>
                    {badge.unlocked && (
                      <div className="mt-3 flex items-center gap-1 text-xs font-bold" style={{ color: '#FF9933' }}>
                        <CheckCircle2 size={12} /> Unlocked
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

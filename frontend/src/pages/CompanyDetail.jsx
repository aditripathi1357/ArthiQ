import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Globe, Building2, User, Calendar,
  TrendingUp, TrendingDown, ChevronDown, ChevronUp, Star,
  Activity, ArrowRight, ShieldAlert, Sparkles, Loader2, Play,
  Newspaper, BarChart3, ExternalLink, HelpCircle,
  LineChart, PieChart, DollarSign, BookOpen, LayoutGrid
} from 'lucide-react'
import PriceChart from '../components/PriceChart'
import OwnershipChart from '../components/OwnershipChart'
import { FeaturedNewsCard, SmallNewsCard } from '../components/NewsCard'
import { CardSkeleton } from '../components/LoadingSkeleton'
import useCompany from '../hooks/useCompany'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getLogoUrl } from '../utils/logoUtils'
import {
  getStockHistory,
  getOwnership,
  getFinancials,
  getCompanyNews,
  getCalendarEarnings,
  getCompanyPeers,
} from '../api/client'

// ── CompanyLogo (with Clearbit + initial fallback) ────────────────────────────
function CompanyLogo({ symbol, name, size = 56 }) {
  const [err, setErr] = useState(false)
  const url = getLogoUrl(symbol)
  const initial = (name || symbol || '?').charAt(0).toUpperCase()

  return (
    <div
      className="rounded-2xl overflow-hidden bg-bg-secondary flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,153,51,0.2)] border border-saffron/20"
      style={{ width: size, height: size }}
    >
      {url && !err ? (
        <img
          src={url}
          alt={symbol}
          loading="lazy"
          onError={() => setErr(true)}
          className="w-full h-full object-contain p-1"
        />
      ) : (
        <span
          className="font-extrabold text-saffron"
          style={{ fontSize: size * 0.42 }}
        >
          {initial}
        </span>
      )}
    </div>
  )
}

const PERIODS = [
  { label: '1D', value: '1d' },
  { label: '1W', value: '5d' },
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
]

export default function CompanyDetail() {
  const { symbol } = useParams()
  const { profile, overview, loading: companyLoading } = useCompany(symbol)
  const { user } = useAuth()

  const [period, setPeriod] = useState('1mo')
  const [chartBars, setChartBars] = useState([])
  const [chartLoading, setChartLoading] = useState(true)
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [isWatchlistUpdating, setIsWatchlistUpdating] = useState(false)

  const [ownership, setOwnership] = useState(null)
  const [financials, setFinancials] = useState(null)
  const [news, setNews] = useState([])
  const [visibleNewsCount, setVisibleNewsCount] = useState(5)
  const [descExpanded, setDescExpanded] = useState(false)
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [peers, setPeers] = useState(null)
  const [peersLoading, setPeersLoading] = useState(true)

  const [activeTab, setActiveTab] = useState('Overview')
  const [isScrolled, setIsScrolled] = useState(false)
  const headerRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => {
      const headerBottom = headerRef.current?.getBoundingClientRect().bottom ?? 0
      setIsScrolled(headerBottom < 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Refetch chart data on period change
  useEffect(() => {
    if (!symbol) return
    setChartLoading(true)
    getStockHistory(symbol, period)
      .then((res) => setChartBars(res.data.bars || []))
      .catch((err) => console.error('Chart error:', err))
      .finally(() => setChartLoading(false))
  }, [symbol, period])

  // Fetch side data on component mount
  useEffect(() => {
    if (!symbol) return

    getOwnership(symbol)
      .then((res) => setOwnership(res.data.ownership))
      .catch((err) => console.error('Ownership error:', err))

    getFinancials(symbol)
      .then((res) => setFinancials(res.data))
      .catch((err) => console.error('Financials error:', err))

    getCompanyNews(symbol, 20)
      .then((res) => setNews(res.data.articles || []))
      .catch((err) => console.error('News error:', err))
  }, [symbol])

  // Fetch peers / competitor details
  useEffect(() => {
    if (!symbol) return
    setPeersLoading(true)
    getCompanyPeers(symbol)
      .then((res) => setPeers(res.data))
      .catch((err) => console.error('Peers error:', err))
      .finally(() => setPeersLoading(false))
  }, [symbol])

  // Fetch earnings calendar events filtered for this symbol
  useEffect(() => {
    if (!symbol) return
    setEventsLoading(true)
    getCalendarEarnings()
      .then((res) => {
        // Backend returns a flat array of earnings events
        const allEvents = res.data?.events || res.data || []
        // Match by full yfinance symbol (e.g. RELIANCE.NS) or stripped base
        const base = symbol.replace('.NS', '').replace('.BO', '').toUpperCase()
        const matched = allEvents.filter((ev) => {
          const evSym = (ev.symbol || '').toUpperCase()
          return evSym === symbol.toUpperCase() || evSym === base || evSym === `${base}.NS`
        })
        setUpcomingEvents(matched)
      })
      .catch(() => setUpcomingEvents([]))
      .finally(() => setEventsLoading(false))
  }, [symbol])

  // Check Watchlist status
  useEffect(() => {
    if (user && symbol) {
      supabase.from('watchlists').select('*').eq('user_id', user.id).eq('symbol', symbol)
        .then(({ data }) => {
          if (data && data.length > 0) setIsInWatchlist(true)
        })
    }
  }, [user, symbol])

  const toggleWatchlist = async () => {
    if (!user) {
      alert('Please log in to add to your watchlist.')
      return
    }
    setIsWatchlistUpdating(true)
    try {
      if (isInWatchlist) {
        await supabase.from('watchlists').delete().eq('user_id', user.id).eq('symbol', symbol)
        setIsInWatchlist(false)
      } else {
        await supabase.from('watchlists').insert({ user_id: user.id, symbol })
        setIsInWatchlist(true)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsWatchlistUpdating(false)
    }
  }

  const data = overview || profile || {}
  const price = data.current_price
  const change = data.change
  const changePct = data.change_pct
  const isPositive = change > 0
  const description = profile?.description || data.description

  const recentFin = financials?.financials?.[0] || {}
  const [activeNewsTab, setActiveNewsTab] = useState('Recent')

  const getMarketStatus = () => {
    const now = new Date()
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
    const day = istTime.getUTCDay()
    const hours = istTime.getUTCHours()
    const minutes = istTime.getUTCMinutes()
    
    // Mon=1 to Fri=5
    if (day >= 1 && day <= 5) {
      const timeVal = hours + (minutes / 60)
      if (timeVal >= 9.25 && timeVal <= 15.5) {
        return true
      }
    }
    return false
  }
  const isMarketOpen = getMarketStatus()

  const scrollToComponent = (id) => {
    setActiveTab(id)
    const element = document.getElementById(id.toLowerCase())
    if (element) {
      const yOffset = -100 // Sticky header offset
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  if (companyLoading) {
    return (
      <div className="w-full px-6 lg:px-10 xl:px-16 py-6">
        <CardSkeleton />
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6"><CardSkeleton /><CardSkeleton /></div>
      </div>
    )
  }

  const NAV_TABS = [
    { id: 'Overview',   label: 'Overview',    Icon: LayoutGrid },
    { id: 'Chart',      label: 'Chart',        Icon: LineChart },
    { id: 'News',       label: 'News',         Icon: Newspaper },
    { id: 'Financials', label: 'Financials',   Icon: DollarSign },
    { id: 'Ownership',  label: 'Ownership',    Icon: PieChart },
  ]

  return (
    <div className="w-full" id="overview">

      {/* ══════════════════════════════════════════════════════════════
           PROFESSIONAL COMPANY HEADER
      ══════════════════════════════════════════════════════════════ */}
      <div ref={headerRef} className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, var(--saffron) 0%, transparent 60%), radial-gradient(circle at 80% 20%, #138808 0%, transparent 50%)' }}
        />

        <div className="relative px-6 lg:px-10 xl:px-16 pt-5 pb-0">
          {/* Breadcrumb */}
          <Link to="/" className="inline-flex items-center gap-2 text-base font-bold text-text-secondary hover:text-saffron transition-colors mb-5 group">
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform stroke-[3px]" />
            <span>Markets</span>
            <span className="text-border mx-1 font-semibold">/</span>
            <span className="text-text-primary font-bold truncate max-w-[160px]">{data.name || symbol}</span>
          </Link>

          {/* Main header content */}
          <div className="flex flex-col lg:flex-row items-start lg:items-end gap-6 pb-6">

            {/* LEFT: Company identity */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <CompanyLogo symbol={symbol} name={data.name} size={52} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl lg:text-3xl font-extrabold text-text-primary tracking-tight leading-tight truncate">
                    {data.name || symbol}
                  </h1>
                  {(symbol.endsWith('.NS') || symbol.endsWith('.BO')) && (
                    <span className="text-sm select-none">🇮🇳</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono text-text-muted bg-bg-secondary px-2 py-0.5 rounded border border-border">
                    {symbol}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-saffron/15 text-saffron border border-saffron/25">
                    {data.exchange || 'NSE'}
                  </span>
                  {data.sector && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary border border-border">
                      {data.sector}
                    </span>
                  )}
                  {/* Market status */}
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isMarketOpen
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isMarketOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                    {isMarketOpen ? 'Live' : 'Closed'}
                  </span>
                </div>
              </div>
            </div>

            {/* CENTER: Price block */}
            <div className="flex flex-col items-start lg:items-end shrink-0">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl lg:text-5xl font-extrabold tracking-tight text-text-primary">
                  {price != null ? `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
                </span>
              </div>
              {change != null && (
                <div className={`flex items-center gap-1.5 mt-1 px-3 py-1 rounded-lg text-sm font-bold ${
                  isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                }`}>
                  {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {isPositive ? '+' : ''}{change?.toFixed(2)} ({isPositive ? '+' : ''}{changePct?.toFixed(2)}%)
                </div>
              )}
              {data.market_cap && (
                <span className="text-[11px] text-text-muted mt-1.5">
                  Mkt Cap: ₹{(data.market_cap / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr
                </span>
              )}
            </div>

            {/* RIGHT: Action buttons */}
            <div className="flex gap-2.5 shrink-0 w-full lg:w-auto">
              <button
                onClick={toggleWatchlist}
                disabled={isWatchlistUpdating}
                className={`flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                  isInWatchlist
                    ? 'bg-saffron text-white border-saffron shadow-lg shadow-saffron/20'
                    : 'border-saffron/40 text-saffron hover:bg-saffron hover:text-white hover:border-saffron hover:shadow-lg hover:shadow-saffron/20'
                }`}
              >
                <Star size={16} fill={isInWatchlist ? 'currentColor' : 'none'} />
                {isWatchlistUpdating ? 'Saving…' : isInWatchlist ? 'Watchlisted' : 'Watchlist'}
              </button>
              <Link
                to={`/company/${symbol}/ai-insights`}
                className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-saffron text-white hover:bg-saffron-dark transition-all shadow-lg shadow-saffron/25"
              >
                <Sparkles size={16} /> AI Insights
              </Link>
            </div>

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
           PROFESSIONAL STICKY NAVBAR
      ══════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-50 border-b border-border/80 shadow-sm bg-bg-primary/95 backdrop-blur-xl">

        {/* Compact company mini-bar — only visible when scrolled */}
        {isScrolled && (
          <div className="flex items-center gap-3 px-6 lg:px-10 xl:px-16 py-1.5 border-b border-border/50 bg-bg-secondary/40">
            <CompanyLogo symbol={symbol} name={data.name} size={20} />
            <span className="text-[13px] font-bold text-text-primary truncate">{data.name || symbol}</span>
            <span className="text-[11px] font-mono text-text-muted">{symbol}</span>
            <div className="ml-auto flex items-center gap-3">
              {price != null && (
                <span className="text-[13px] font-extrabold text-text-primary">
                  ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              )}
              {changePct != null && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  changePct >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                }`}>
                  {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tab row */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-6 lg:px-10 xl:px-16 h-14">
          {NAV_TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => scrollToComponent(id)}
                className={`relative flex items-center gap-2 px-4 py-2 text-[13px] font-bold whitespace-nowrap transition-all rounded-lg border ${
                  active
                    ? 'text-saffron bg-saffron/8 border-saffron/20'
                    : 'text-text-muted border-transparent hover:text-text-primary hover:bg-bg-secondary/60'
                }`}
              >
                <Icon size={14} className={active ? 'text-saffron' : 'text-text-muted'} />
                {label}
              </button>
            )
          })}
          {/* AI tab — links to separate page */}
          <Link
            to={`/company/${symbol}/ai-insights`}
            className="relative flex items-center gap-2 px-4 py-2 text-[13px] font-bold text-text-muted hover:text-saffron hover:bg-saffron/8 hover:border-saffron/25 rounded-lg whitespace-nowrap transition-all ml-auto border border-transparent"
          >
            <Sparkles size={14} className="text-saffron animate-pulse" />
            AI Insights
            <span className="text-[9px] font-black uppercase tracking-wider bg-saffron text-white px-1.5 py-0.5 rounded-md">
              NEW
            </span>
          </Link>
        </div>
      </div>

      {/* Page body padding */}
      <div className="px-6 lg:px-10 xl:px-16 py-6">

      {/* ── SECTION 3: Main Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        
        {/* LEFT COLUMN (65%) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          
          {/* Price Chart */}
          <div id="chart" className="glass-card p-6">
            <div className="flex justify-between items-center mb-6 pr-2">
              <h2 className="text-lg font-bold text-text-primary border-l-4 border-saffron pl-3">Price History</h2>
              <div className="flex gap-1.5 bg-bg-primary p-1 rounded-lg border border-border">
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                      period === p.value
                        ? 'bg-saffron text-bg-primary'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <PriceChart bars={chartBars} period={period} loading={chartLoading} symbol={symbol} />
          </div>

          {/* Key Statistics — Investing.com style two-column grid */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-text-primary border-l-4 border-saffron pl-3 mb-6 flex items-center gap-3">
              Key Statistics
              <Link
                to="/tutorial#what-is-fundamental-analysis"
                className="text-[10px] font-bold text-text-muted hover:text-saffron border border-border hover:border-saffron/50 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors"
              >
                <HelpCircle size={10} /> Learn more
              </Link>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2">
              {/* Column 1: Market & Ranges */}
              <div className="divide-y divide-border/50">
                <StatRow label="Prev Close" value={data.previous_close ? `₹${Number(data.previous_close).toLocaleString('en-IN')}` : '—'} />
                <StatRow label="Open" value={data.open ? `₹${Number(data.open).toLocaleString('en-IN')}` : '—'} />

                {/* Day's Range with visual slider */}
                <div className="py-3 flex justify-between items-center">
                  <span className="text-xs text-text-muted font-medium w-24">Day's Range</span>
                  <div className="flex-1 ml-4">
                    <div className="flex justify-between text-xs font-semibold text-text-primary mb-1.5">
                      <span>{data.day_low ? `₹${Number(data.day_low).toLocaleString('en-IN')}` : '—'}</span>
                      <span>{data.day_high ? `₹${Number(data.day_high).toLocaleString('en-IN')}` : '—'}</span>
                    </div>
                    {data.day_low && data.day_high && price ? (
                      <div className="relative w-full h-1.5 bg-border rounded-full">
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-saffron border-2 border-white shadow-sm"
                          style={{ left: `${Math.max(0, Math.min(100, ((price - data.day_low) / (data.day_high - data.day_low)) * 100))}%`, transform: 'translate(-50%, -50%)' }}
                        ></div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* 52 Week Range with visual slider */}
                <div className="py-3 flex justify-between items-center">
                  <span className="text-xs text-text-muted font-medium w-24">52 wk Range</span>
                  <div className="flex-1 ml-4">
                    <div className="flex justify-between text-xs font-semibold text-text-primary mb-1.5">
                      <span>{data.fifty_two_week_low ? `₹${Number(data.fifty_two_week_low).toLocaleString('en-IN')}` : '—'}</span>
                      <span>{data.fifty_two_week_high ? `₹${Number(data.fifty_two_week_high).toLocaleString('en-IN')}` : '—'}</span>
                    </div>
                    {data.fifty_two_week_low && data.fifty_two_week_high && price ? (
                      <div className="relative w-full h-1.5 bg-border rounded-full">
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-saffron border-2 border-white shadow-sm"
                          style={{ left: `${Math.max(0, Math.min(100, ((price - data.fifty_two_week_low) / (data.fifty_two_week_high - data.fifty_two_week_low)) * 100))}%`, transform: 'translate(-50%, -50%)' }}
                        ></div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Column 2: Volume & Value */}
              <div className="divide-y divide-border/50">
                <StatRow label="Volume" value={data.volume ? data.volume.toLocaleString('en-IN') : 'N/A'} />
                <StatRow label="Avg Vol (10d)" value={data.average_volume ? data.average_volume.toLocaleString('en-IN') : 'N/A'} />
                <StatRow label="Market Cap" value={data.market_cap ? `₹${(data.market_cap / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr` : 'N/A'} />
                <StatRow label="Beta" value={data.beta != null ? data.beta.toFixed(2) : 'N/A'} />
              </div>

              {/* Column 3: Fundamentals & Dividends */}
              <div className="divide-y divide-border/50">
                {/* P/E Row with tutorial crosslink */}
                <div className="py-3 flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-text-muted font-medium">P/E Ratio</span>
                    <Link
                      to="/tutorial#what-is-pe-ratio"
                      className="text-text-muted/50 hover:text-saffron transition-colors"
                      title="What is P/E ratio? → Tutorial"
                    >
                      <HelpCircle size={11} />
                    </Link>
                  </div>
                  <span className="text-sm font-bold text-text-primary">
                    {data.pe_ratio != null ? data.pe_ratio.toFixed(2) : recentFin.pe_ratio != null ? recentFin.pe_ratio.toFixed(2) : 'N/A'}
                  </span>
                </div>
                <StatRow label="EPS" value={data.eps != null ? `₹${data.eps.toFixed(2)}` : recentFin.eps != null ? `₹${recentFin.eps.toFixed(2)}` : 'N/A'} />
                <StatRow label="Div Yield" value={data.dividend_yield != null ? `${(data.dividend_yield * 100).toFixed(2)}%` : 'N/A'} />
                <StatRow label="Div Rate" value={data.dividend_rate != null ? `₹${data.dividend_rate.toFixed(2)}` : 'N/A'} />
              </div>
            </div>
          </div>

          {/* News & Analysis */}
          <div id="news" className="glass-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-text-primary border-l-4 border-saffron pl-3">News & Analysis</h2>
              <div className="flex gap-4 text-sm font-semibold">
                <button onClick={() => { setActiveNewsTab('Recent'); setVisibleNewsCount(5); }} className={`pb-1 transition-colors ${activeNewsTab === 'Recent' ? 'text-saffron border-b-2 border-saffron' : 'text-text-muted hover:text-text-primary'}`}>Recent</button>
                <button onClick={() => { setActiveNewsTab('Earnings'); setVisibleNewsCount(5); }} className={`pb-1 transition-colors ${activeNewsTab === 'Earnings' ? 'text-saffron border-b-2 border-saffron' : 'text-text-muted hover:text-text-primary'}`}>Earnings</button>
                <button onClick={() => { setActiveNewsTab('Company'); setVisibleNewsCount(5); }} className={`pb-1 transition-colors ${activeNewsTab === 'Company' ? 'text-saffron border-b-2 border-saffron' : 'text-text-muted hover:text-text-primary'}`}>Company</button>
              </div>
            </div>
            
            {(() => {
              let filteredNews = news
              if (activeNewsTab === 'Earnings') {
                filteredNews = news.filter(n => {
                  const title = (n.headline || n.title || '').toLowerCase()
                  return title.includes('earning') || title.includes('result') || title.includes('profit') || title.includes('q1') || title.includes('q2') || title.includes('q3') || title.includes('q4')
                })
              }
              
              if (filteredNews.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Newspaper size={36} className="text-text-muted/30 mb-3" />
                    <p className="text-sm font-semibold text-text-secondary">No {activeNewsTab.toLowerCase()} news found</p>
                    <p className="text-xs text-text-muted mt-1">
                      Check back later for updates regarding {data.name || symbol}.
                    </p>
                  </div>
                )
              }
              
              const displayedNews = filteredNews.slice(0, visibleNewsCount)

              return (
                <div className="flex flex-col gap-0">
                  {/* Hero card for the first article if recent or when appropriate */}
                  {displayedNews.length > 0 && (
                    <div className="mb-5">
                      <FeaturedNewsCard article={displayedNews[0]} />
                    </div>
                  )}
                  {/* Small cards for the rest */}
                  {displayedNews.length > 1 && (
                    <div className="flex flex-col gap-0 border border-border/80 rounded-2xl bg-bg-card p-2 md:p-4">
                      {displayedNews.slice(1).map((item, i, arr) => (
                        <SmallNewsCard
                          key={i}
                          article={item}
                          index={i + 1}
                          showDivider={i < arr.length - 1}
                        />
                      ))}
                    </div>
                  )}
                  
                  {visibleNewsCount < filteredNews.length && (
                    <div className="mt-5 text-center">
                      <button
                        onClick={() => setVisibleNewsCount(prev => prev + 5)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-saffron/30 text-saffron font-bold text-xs hover:bg-saffron hover:text-white transition-all shadow-md hover:shadow-saffron/10"
                      >
                        Show more news <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

        </div>

        {/* RIGHT COLUMN (35%) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 lg:sticky lg:top-[128px] lg:self-start">
          
          {/* AI Insights CTA Card — replaces old inline AI card */}
          <div className="ai-cta-card rounded-2xl p-0 overflow-hidden border border-saffron/30 relative">
            {/* Header gradient */}
            <div className="p-5 border-b border-saffron/20 bg-gradient-to-br from-saffron/10 via-saffron/5 to-transparent relative">
              <div className="absolute top-0 right-0 p-3 opacity-15">
                <Sparkles size={56} className="text-saffron" />
              </div>
              <h2 className="text-lg font-bold text-text-primary flex gap-2 items-center relative z-10">
                <Sparkles size={18} className="text-saffron" /> AI Analysis
              </h2>
              <p className="text-xs text-saffron mt-1 font-semibold uppercase tracking-wider relative z-10">
                Powered by GPT-4o-mini
              </p>
            </div>

            {/* Body */}
            <div className="p-5 bg-bg-card">
              <p className="text-sm text-text-secondary leading-relaxed mb-5">
                Get AI-powered insights including price movement analysis, buy/sell signals, 2-4 week outlook, and news sentiment for <strong className="text-text-primary">{data.name || symbol}</strong>.
              </p>

              <div className="space-y-2.5 mb-6">
                <AIFeatureItem icon="⚡" text="Why did the price move?" />
                <AIFeatureItem icon="🎯" text="Buy, Sell, or Hold signal" />
                <AIFeatureItem icon="📈" text="2-4 week price outlook" />
                <AIFeatureItem icon="📰" text="News sentiment analysis" />
              </div>

              <Link
                to={`/company/${symbol}/ai-insights`}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-saffron text-bg-primary hover:bg-saffron-dark transition-all font-bold text-sm"
              >
                <Sparkles size={16} /> View AI Insights
                <ArrowRight size={16} />
              </Link>

              <Link
                to="/tutorial#how-to-use-why-did-this-stock-move"
                className="flex items-center justify-center gap-1 mt-3 text-xs text-text-muted hover:text-saffron transition-colors"
              >
                <HelpCircle size={11} /> How does this work? →
              </Link>
            </div>
          </div>

          {/* Upcoming Events Card — live from earnings calendar API */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-text-primary border-l-4 border-saffron pl-3 mb-5">Upcoming Events</h2>

            {eventsLoading ? (
              <div className="space-y-3">
                <div className="skeleton h-14 rounded-xl" />
                <div className="skeleton h-14 rounded-xl" />
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((ev, i) => (
                  <div key={i} className="flex items-start gap-4 p-3 bg-bg-card-hover rounded-xl border border-border/50 hover:border-saffron/30 transition-colors">
                    <div className="bg-saffron/10 p-2 rounded-lg text-saffron shrink-0">
                      <Calendar size={16} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-text-primary text-sm font-semibold leading-tight">
                        {ev.event || 'Quarterly Results'}
                      </h4>
                      <p className="text-xs text-text-muted mt-0.5">
                        {ev.date || 'Date TBD'}
                      </p>
                      {(ev.forecast || ev.previous) && (
                        <div className="flex gap-3 mt-1.5 text-[11px]">
                          {ev.forecast && (
                            <span className="text-text-secondary">
                              <span className="text-text-muted">Est. EPS:</span>{' '}
                              <span className="font-semibold text-text-primary">{ev.forecast}</span>
                            </span>
                          )}
                          {ev.previous && (
                            <span className="text-text-secondary">
                              <span className="text-text-muted">Prev:</span>{' '}
                              <span className="font-medium">{ev.previous}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      ev.category === 'upcoming'
                        ? 'bg-saffron/10 text-saffron border-saffron/20'
                        : 'bg-positive/10 text-positive border-positive/20'
                    }`}>
                      {ev.category || 'Upcoming'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Calendar size={28} className="text-text-muted/30 mb-3" />
                <p className="text-sm text-text-secondary font-medium">No upcoming events found</p>
                <p className="text-xs text-text-muted mt-1">
                  Earnings data will appear here when available from yfinance.
                </p>
              </div>
            )}

            <p className="text-[10px] text-text-muted mt-4 pt-3 border-t border-border/50">
              Source: yfinance earnings calendar
            </p>
          </div>

        </div>
      </div>

      {/* ── SECTION 3.5: Company Profile ────────────────────────────── */}
      <div id="profile" className="glass-card p-6 mb-6">
        <h2 className="text-lg font-bold text-text-primary border-l-4 border-saffron pl-3 mb-6">About {data.name || symbol}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* About Text */}
          <div className="col-span-2">
            {description ? (
              <div>
                <p className={`text-sm text-text-muted leading-relaxed mb-4 ${descExpanded ? '' : 'line-clamp-4'}`}>
                  {description}
                </p>
                {description.length > 250 && (
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="text-saffron hover:text-saffron-dark text-sm font-semibold inline-block"
                  >
                    {descExpanded ? 'Read less' : 'Read more'}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-muted italic">No profile description available for this company.</p>
            )}
          </div>

          {/* Quick Facts */}
          <div className="col-span-1 bg-bg-card-hover p-5 rounded-xl border border-border/50 h-fit space-y-4">
            {profile?.ceo && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-muted flex gap-2 items-center"><User size={14}/> CEO</span>
                <span className="text-text-primary font-medium">{profile.ceo}</span>
              </div>
            )}
            {profile?.founded_year && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-muted flex gap-2 items-center"><Calendar size={14}/> Founded</span>
                <span className="text-text-primary font-medium">{profile.founded_year}</span>
              </div>
            )}
            {profile?.headquarters && (
              <div className="flex justify-between items-start text-sm">
                <span className="text-text-muted flex gap-2 items-center"><Building2 size={14}/> HQ</span>
                <span className="text-text-primary font-medium text-right max-w-[150px]">{profile.headquarters}</span>
              </div>
            )}
            {profile?.website && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-muted flex gap-2 items-center"><Globe size={14}/> Website</span>
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-block truncate max-w-[150px] text-right">
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            {(data.sector || data.industry) && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50">
                {data.sector && <span className="px-2.5 py-1 text-[11px] font-bold uppercase rounded bg-bg-card text-text-secondary border border-border">{data.sector}</span>}
                {data.industry && <span className="px-2.5 py-1 text-[11px] font-bold uppercase rounded bg-bg-card text-text-secondary border border-border">{data.industry}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 4: Ownership ─────────────────────────────────── */}
      <div id="ownership" className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-text-primary border-l-4 border-saffron pl-3 mb-6 flex items-center gap-3">
            Shareholding Pattern
            <Link
              to="/tutorial#fii-and-dii"
              className="text-[10px] font-bold text-text-muted hover:text-saffron border border-border hover:border-saffron/50 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors"
            >
              <HelpCircle size={10} /> What is FII/DII?
            </Link>
          </h2>
          <OwnershipChart ownership={ownership} loading={!ownership} />
        </div>
        <div className="glass-card p-6 flex flex-col justify-center">
          <h3 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wider">Stake Distribution</h3>
          {ownership ? (
            <div className="space-y-4">
              <ShareBar label="Promoters" pct={ownership.promoter_pct} color="#FF9933" />
              <ShareBar label="FII (Foreign Inst.)" pct={ownership.fii_pct} color="#0033A0" />
              <ShareBar label="DII (Domestic Inst.)" pct={ownership.dii_pct} color="#138808" />
              <ShareBar label="Retail & Others" pct={ownership.retail_pct} color="#a0aec0" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShieldAlert size={32} className="text-text-muted/30 mb-3" />
              <p className="text-sm font-semibold text-text-secondary">Shareholding data unavailable</p>
              <p className="text-xs text-text-muted mt-1">This data populates as more company results are fetched.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 5: Financials ────────────────────────────────── */}
      <div id="financials" className="glass-card p-6 mb-6 overflow-x-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-text-primary border-l-4 border-saffron pl-3 mb-1">Financial Summary</h2>
          <div className="flex gap-1.5 bg-bg-primary p-1 rounded-lg border border-border">
            <button className="px-3 py-1.5 text-xs font-bold rounded-md transition-all bg-saffron text-bg-primary">Annual</button>
            <button className="px-3 py-1.5 text-xs font-bold rounded-md transition-all text-text-muted hover:text-text-primary">Quarterly</button>
          </div>
        </div>

        {financials?.financials && financials.financials.length > 0 ? (
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="py-3 px-4 text-xs font-semibold text-text-muted uppercase">Period</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-muted uppercase">Revenue</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-muted uppercase">Net Profit</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-muted uppercase">EBITDA</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-muted uppercase">Debt</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-muted uppercase">P/E</th>
                <th className="py-3 px-4 text-xs font-semibold text-text-muted uppercase">ROE</th>
              </tr>
            </thead>
            <tbody>
              {financials.financials.slice(0,4).map((f, i) => (
                <tr key={i} className="border-b border-border hover:bg-bg-card-hover transition-colors">
                  <td className="py-3 px-4 text-sm font-semibold text-text-primary">{f.period || 'Annual FY'}</td>
                  <td className="py-3 px-4 text-sm text-text-secondary">{f.revenue ? `₹${(f.revenue/1e7).toFixed(0)} Cr` : '—'}</td>
                  <td className="py-3 px-4 text-sm text-text-secondary">{f.net_profit ? `₹${(f.net_profit/1e7).toFixed(0)} Cr` : '—'}</td>
                  <td className="py-3 px-4 text-sm text-text-secondary">{f.ebitda ? `₹${(f.ebitda/1e7).toFixed(0)} Cr` : '—'}</td>
                  <td className="py-3 px-4 text-sm text-text-secondary">{f.total_debt ? `₹${(f.total_debt/1e7).toFixed(0)} Cr` : '—'}</td>
                  <td className="py-3 px-4 text-sm text-text-secondary">{f.pe_ratio ? f.pe_ratio.toFixed(2) : '—'}</td>
                  <td className="py-3 px-4 text-sm text-text-secondary">{f.roe ? f.roe.toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <BarChart3 size={36} className="text-text-muted/30 mb-3" />
            <p className="text-sm font-semibold text-text-secondary">No financial data available</p>
            <p className="text-xs text-text-muted mt-1 max-w-sm">
              Financial statements for <strong className="text-text-secondary">{symbol.replace('.NS','').replace('.BO','')}</strong> haven't been loaded yet.
              Visit this page again after the backend has fetched company data.
            </p>
          </div>
        )}
      </div>

      {/* ── SECTION 6: Company Relationships ─────────────────────── */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-text-primary border-l-4 border-saffron pl-3 mb-1">Company Connections</h2>
        <p className="text-sm text-text-muted mb-6">Subsidiaries, Parent Companies & Competitors</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {peersLoading ? (
            <div className="col-span-4 flex justify-center py-8">
              <Loader2 className="animate-spin text-saffron" size={24} />
            </div>
          ) : (() => {
            const allConnections = [];
            if (peers) {
              if (peers.related) allConnections.push(...peers.related);
              if (peers.competitors) allConnections.push(...peers.competitors);
            }

            if (allConnections.length === 0) {
              return (
                <div className="col-span-4 text-center py-6 text-sm text-text-muted italic">
                  Relationship data coming soon for {symbol}
                </div>
              );
            }

            return allConnections.map((conn, i) => {
              const isClickable = conn.symbol && (conn.symbol.includes('.') || conn.symbol.length <= 5);
              const CardContent = (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-text-primary font-bold text-sm tracking-tight">{conn.name}</h4>
                    <div className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full tracking-wider ${
                      conn.type === 'Subsidiary' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                      conn.type === 'Parent' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      conn.type === 'Competitor' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      'bg-saffron/10 text-saffron border border-saffron/20'
                    }`}>
                      {conn.type}
                    </div>
                  </div>
                  {conn.symbol && (
                    <span className="text-[10px] font-mono text-text-muted">{conn.symbol}</span>
                  )}
                  {isClickable && (
                    <ArrowRight size={14} className="text-text-muted group-hover:text-saffron group-hover:translate-x-0.5 transition-all absolute bottom-4 right-4" />
                  )}
                </>
              );

              return isClickable ? (
                <Link
                  key={i}
                  to={`/company/${conn.symbol}`}
                  className="p-4 rounded-xl border border-border bg-bg-primary hover:border-saffron hover:shadow-md transition-all relative overflow-hidden group block min-h-[84px]"
                >
                  {CardContent}
                </Link>
              ) : (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-border bg-bg-primary/50 relative overflow-hidden min-h-[84px]"
                >
                  {CardContent}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* ── SECTION 7: FAQ ─────────────────────────────────────────── */}
      <div className="glass-card p-6 mt-6">
        <h2 className="text-lg font-bold text-text-primary border-l-4 border-saffron pl-3 mb-6 flex items-center gap-2">
           Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          <FAQItem 
            question={`What is the market capitalization of ${data.name || symbol}?`}
            answer={data.market_cap ? `As of the latest data, ${data.name || symbol} has a market capitalization of ₹${(data.market_cap / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 0 })} Crores.` : `Market capitalization data is currently not available.`}
          />
          <FAQItem 
            question={`What is the P/E ratio for ${data.name || symbol}?`}
            answer={recentFin.pe_ratio != null || data.pe_ratio != null ? `The trailing Price to Earnings (P/E) ratio is ${(recentFin.pe_ratio || data.pe_ratio).toFixed(2)}, which indicates how much investors are willing to pay per rupee of earnings.` : `The P/E ratio is currently not available due to lack of earnings data.`}
          />
          <FAQItem 
            question={`What sector does ${data.name || symbol} operate in?`}
            answer={data.sector ? `${data.name || symbol} operates in the ${data.sector} sector${data.industry ? `, specifically within the ${data.industry} industry` : ''}.` : `Sector information is not currently specified.`}
          />
          <FAQItem 
            question={`When is the market open for ${symbol}?`}
            answer={`For NSE/BSE listed stocks, the normal trading hours are from 9:15 AM to 3:30 PM Indian Standard Time (IST), Monday through Friday, excluding market holidays.`}
          />
          {profile?.ceo && (
            <FAQItem 
              question={`Who is the CEO of ${data.name || symbol}?`}
              answer={`The current CEO of ${data.name || symbol} is ${profile.ceo}.`}
            />
          )}
        </div>
      </div>

      </div>
    </div>
  )
}

// ── Helper Components ─────────────────────────────────────────────────────────

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-bg-primary transition-colors hover:border-saffron/30">
      <button 
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <HelpCircle size={16} className="text-saffron shrink-0" />
          <span className="font-semibold text-text-primary text-sm">{question}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-text-muted transition-transform" /> : <ChevronDown size={16} className="text-text-muted transition-transform" />}
      </button>
      
      {open && (
        <div className="p-4 pt-0 text-sm text-text-secondary border-t border-border/30 bg-bg-card/50">
          <p className="mt-2 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}

function StatRow({ label, value }) {
  return (
    <div className="py-3 flex justify-between items-center">
      <span className="text-xs text-text-muted font-medium">{label}</span>
      <span className="text-sm font-bold text-text-primary">{value}</span>
    </div>
  )
}

function AIFeatureItem({ icon, text }) {
  return (
    <div className="flex items-center gap-3 text-sm text-text-secondary">
      <span className="text-base">{icon}</span>
      <span>{text}</span>
    </div>
  )
}

function ShareBar({ label, pct, color }) {
  if (pct == null) return null
  return (
    <div>
      <div className="flex justify-between items-center mb-1 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></span>
          <span className="text-text-secondary">{label}</span>
        </div>
        <span className="text-text-primary">{pct.toFixed(2)}%</span>
      </div>
      <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: color }}></div>
      </div>
    </div>
  )
}

// ── Hardcoded Connections ────────────────────────────────────────────────────

const CONNECTIONS = {
  'RELIANCE.NS': [
    { name: 'Jio Platforms', type: 'Subsidiary' },
    { name: 'Reliance Retail', type: 'Subsidiary' },
    { name: 'Reliance Jio', type: 'Subsidiary' },
    { name: 'BP plc', type: 'Strategic Partner' },
  ],
  'TCS.NS': [
    { name: 'Tata Sons', type: 'Parent' },
    { name: 'TCS BPM', type: 'Subsidiary' },
    { name: 'Infosys', type: 'Competitor' },
    { name: 'Wipro', type: 'Competitor' },
  ],
  'INFY.NS': [
    { name: 'Infosys BPM', type: 'Subsidiary' },
    { name: 'EdgeVerve Systems', type: 'Subsidiary' },
    { name: 'TCS', type: 'Competitor' },
    { name: 'Wipro', type: 'Competitor' },
  ],
  'HDFCBANK.NS': [
    { name: 'HDFC Life Insurance', type: 'Subsidiary' },
    { name: 'HDFC AMC', type: 'Subsidiary' },
    { name: 'HDFC Securities', type: 'Subsidiary' },
    { name: 'ICICI Bank', type: 'Competitor' },
  ],
  'ICICIBANK.NS': [
    { name: 'ICICI Prudential', type: 'Subsidiary' },
    { name: 'ICICI Securities', type: 'Subsidiary' },
    { name: 'HDFC Bank', type: 'Competitor' },
  ],
  'MARUTI.NS': [
    { name: 'Suzuki Motor Corp', type: 'Parent' },
    { name: 'Maruti Insurance', type: 'Subsidiary' },
    { name: 'Hyundai India', type: 'Competitor' },
  ],
}


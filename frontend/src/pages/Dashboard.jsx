import { useState, useEffect, useCallback, useRef } from 'react'
import {
  TrendingUp, TrendingDown, Activity, ArrowRight,
  Star, BarChart2, Zap,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Minus,
  Building2, ArrowUpRight, Clock, Newspaper, Radio, Flame
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import IndexCard from '../components/IndexCard'
import ForexStrip from '../components/ForexStrip'
import { HeroNewsCard, GridNewsCard, ListNewsCard, SidebarNewsCard } from '../components/NewsCard'
import EconomicCalendar from '../components/EconomicCalendar'
import PortfolioSection from '../components/PortfolioSection'
import {
  getMarketIndices,
  getMarketMovers,
  getMarketNews,
  getMarketBreadth,
  getStockQuote,
} from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getLogoUrl, getAvatarColors } from '../utils/logoUtils'

// ── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'gainers', label: 'Top Gainers',   icon: TrendingUp },
  { key: 'losers',  label: 'Top Losers',    icon: TrendingDown },
  { key: 'active',  label: 'Most Active',   icon: Activity },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n, digits = 2) {
  if (n == null) return '—'
  return n.toLocaleString('en-IN', { maximumFractionDigits: digits })
}

function fmtVol(v) {
  if (!v) return '—'
  if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`
  if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return String(v)
}

// ── Stock Logo Avatar — gradient fallback ─────────────────────────────────────
function StockLogoAvatar({ symbol, name, size = 10 }) {
  const logoUrl = getLogoUrl(symbol)
  const [err, setErr] = useState(false)
  const initial = (name || symbol || 'A').replace('.NS','').replace('.BO','').charAt(0).toUpperCase()
  const { from, to } = getAvatarColors(symbol)
  const sz = `w-${size} h-${size}`

  if (logoUrl && !err) {
    return (
      <div className={`${sz} rounded-xl overflow-hidden shrink-0 bg-bg-secondary flex items-center justify-center ring-1 ring-border`}>
        <img
          src={logoUrl}
          alt={symbol}
          loading="lazy"
          onError={() => setErr(true)}
          className="w-full h-full object-contain"
        />
      </div>
    )
  }

  return (
    <div
      className={`${sz} rounded-xl shrink-0 flex items-center justify-center font-extrabold text-white`}
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`, fontSize: size >= 10 ? '1rem' : '0.8rem' }}
    >
      {initial}
    </div>
  )
}

// ── Animated stat block ───────────────────────────────────────────────────────
function AnimatedStat({ value, label, icon: Icon, color = 'text-saffron', prefix = '', suffix = '' }) {
  return (
    <div className="flex flex-col items-center text-center px-5 py-3.5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${
        color === 'text-saffron' ? 'bg-saffron/12' :
        color === 'text-positive' ? 'bg-positive/12' :
        color === 'text-negative' ? 'bg-negative/12' : 'bg-blue-500/12'
      }`}>
        <Icon size={16} className={color} />
      </div>
      <div className={`text-xl font-black tracking-tight ${color}`}>{prefix}{value}{suffix}</div>
      <div className="text-[10px] text-text-muted font-semibold mt-0.5 uppercase tracking-wide">{label}</div>
    </div>
  )
}

// ── Stock Card ────────────────────────────────────────────────────────────────
function StockCard({ stock }) {
  const navigate = useNavigate()
  const isPos = (stock.change_pct ?? 0) > 0
  const isNeg = (stock.change_pct ?? 0) < 0

  return (
    <div
      onClick={() => navigate(`/company/${stock.symbol}`)}
      className="card card-interactive p-4 relative overflow-hidden group"
      style={{
        borderTop: isPos
          ? '2px solid rgba(22,163,74,0.45)'
          : isNeg
          ? '2px solid rgba(220,38,38,0.45)'
          : '2px solid transparent',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <StockLogoAvatar symbol={stock.symbol} name={stock.name} size={10} />
          <div className="min-w-0">
            <h3 className="text-text-primary font-bold text-[13px] truncate group-hover:text-saffron transition-colors leading-tight">
              {stock.symbol.replace('.NS', '').replace('.BO', '')}
            </h3>
            <p className="text-[11px] text-text-muted truncate max-w-[110px] leading-tight mt-0.5">{stock.name || '—'}</p>
          </div>
        </div>
        <ArrowUpRight size={13} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
      </div>

      {/* Price */}
      <div className="text-lg font-black text-text-primary tracking-tight">₹{fmt(stock.price)}</div>
      <div className={`text-xs font-bold mt-0.5 flex items-center gap-1 ${isPos ? 'text-positive' : isNeg ? 'text-negative' : 'text-text-muted'}`}>
        {isPos ? <ChevronUp size={12}/> : isNeg ? <ChevronDown size={12}/> : <Minus size={12}/>}
        {stock.change != null ? `${isPos?'+':''}${fmt(stock.change)} (${isPos?'+':''}${fmt(stock.change_pct)}%)` : '—'}
      </div>
      {stock.volume > 0 && (
        <div className="text-[10px] text-text-muted mt-2">
          Vol: <span className="text-text-secondary font-semibold">{fmtVol(stock.volume)}</span>
        </div>
      )}
    </div>
  )
}


// ── Skeleton ──────────────────────────────────────────────────────────────────
function StockCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-1.5"><div className="skeleton h-3 w-16" /><div className="skeleton h-2.5 w-24" /></div>
      </div>
      <div className="skeleton h-5 w-24" />
      <div className="skeleton h-3 w-16" />
    </div>
  )
}

// ── Market Pulse ──────────────────────────────────────────────────────────────
function MarketPulse({ indices, breadth, breadthLoading }) {
  const moodConfig = {
    strongly_bullish: { label: 'Strongly Bullish', color: 'text-positive', bg: 'bg-positive/10', border: 'border-positive/25', Icon: TrendingUp },
    bullish:          { label: 'Bullish',           color: 'text-positive', bg: 'bg-positive/10', border: 'border-positive/25', Icon: TrendingUp },
    neutral:          { label: 'Neutral',           color: 'text-saffron',  bg: 'bg-saffron/10',  border: 'border-saffron/25',  Icon: Minus },
    bearish:          { label: 'Bearish',           color: 'text-negative', bg: 'bg-negative/10', border: 'border-negative/25', Icon: TrendingDown },
    strongly_bearish: { label: 'Strongly Bearish',  color: 'text-negative', bg: 'bg-negative/10', border: 'border-negative/25', Icon: TrendingDown },
  }

  const mood = moodConfig[breadth?.mood] || moodConfig.neutral
  const advances  = breadth?.advances  ?? 0
  const declines  = breadth?.declines  ?? 0
  const unchanged = breadth?.unchanged ?? 0
  const total     = advances + declines + unchanged || 1
  const advPct    = Math.round((advances / total) * 100)
  const decPct    = Math.round((declines / total) * 100)

  const sectorIndices = [
    { key: '^NSEBANK',    label: 'BANK' },
    { key: '^CNXIT',      label: 'IT' },
    { key: '^CNXPHARMA',  label: 'PHARMA' },
    { key: '^CNXAUTO',    label: 'AUTO' },
    { key: '^CNXFMCG',    label: 'FMCG' },
    { key: '^CNXMETAL',   label: 'METAL' },
    { key: '^CNXENERGY',  label: 'ENERGY' },
    { key: '^CNXINFRA',   label: 'INFRA' },
    { key: '^CNXPSUBANK', label: 'PSU BK' },
    { key: '^CNXREALTY',  label: 'REALTY' },
  ]
  const indexMap = Object.fromEntries((indices || []).map(i => [i.symbol, i]))

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-saffron/15 flex items-center justify-center">
          <Zap size={14} className="text-saffron" />
        </div>
        <h2 className="text-base font-bold text-text-primary">Market Pulse</h2>
        <span className="ml-auto text-[10px] text-text-muted flex items-center gap-1">
          <Clock size={10} /> Live
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* A/D Breadth */}
        <div className="card p-5 lg:col-span-1">
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Advance / Decline</div>
          {breadthLoading ? (
            <div className="space-y-3"><div className="skeleton h-16 w-full rounded-xl" /><div className="skeleton h-4 w-full" /></div>
          ) : (
            <>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border mb-3 ${mood.bg} ${mood.border}`}>
                <mood.Icon size={14} className={mood.color} />
                <span className={`text-xs font-bold ${mood.color}`}>{mood.label}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 rounded-xl bg-positive/5 border border-positive/10">
                  <div className="text-lg font-extrabold text-positive">{advances}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">Advances</div>
                </div>
                <div className="text-center p-2 rounded-xl bg-bg-secondary border border-border">
                  <div className="text-lg font-extrabold text-text-muted">{unchanged}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">Unchanged</div>
                </div>
                <div className="text-center p-2 rounded-xl bg-negative/5 border border-negative/10">
                  <div className="text-lg font-extrabold text-negative">{declines}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">Declines</div>
                </div>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                <div className="bg-positive transition-all duration-700 rounded-l-full" style={{ width: `${advPct}%` }} />
                <div className="bg-text-muted/15" style={{ width: `${100 - advPct - decPct}%` }} />
                <div className="bg-negative transition-all duration-700 rounded-r-full" style={{ width: `${decPct}%` }} />
              </div>
              <div className="flex justify-between text-[10px] mt-1.5 text-text-muted">
                <span className="text-positive font-bold">{advPct}% ↑</span>
                <span className="text-negative font-bold">{decPct}% ↓</span>
              </div>
              {breadth?.advance_decline_ratio && (
                <div className="text-xs text-text-secondary mt-3 pt-3 border-t border-border">
                  A/D Ratio: <span className="font-bold text-text-primary">{breadth.advance_decline_ratio}</span>
                  <span className="text-text-muted ml-1">({breadth.total} stocks tracked)</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sector Heatmap */}
        <div className="card p-5 lg:col-span-2">
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Sector Performance</div>
          <div className="grid grid-cols-5 gap-2">
            {sectorIndices.map(({ key, label }) => {
              const idx = indexMap[key]
              const pct = idx?.change_pct
              const isP = pct > 0
              const isN = pct < 0
              const color = isP ? 'text-positive' : isN ? 'text-negative' : 'text-text-muted'
              const bg    = isP ? 'bg-positive/8 border-positive/15' : isN ? 'bg-negative/8 border-negative/15' : 'bg-bg-secondary border-border'
              return (
                <div key={key} className={`rounded-xl border p-2.5 text-center transition-all hover:scale-105 cursor-default ${bg}`}>
                  <div className="text-[9px] font-bold text-text-muted uppercase tracking-wide mb-1">{label}</div>
                  <div className={`text-xs font-extrabold ${color}`}>
                    {pct != null ? `${isP?'+':''}${pct.toFixed(2)}%` : '—'}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-[10px] text-text-muted font-semibold uppercase tracking-widest mb-2">Today's Best ↑</div>
            <div className="flex flex-wrap gap-2">
              {sectorIndices
                .map(({ key, label }) => ({ label, pct: indexMap[key]?.change_pct }))
                .filter(x => x.pct != null && x.pct > 0)
                .sort((a, b) => b.pct - a.pct)
                .slice(0, 3)
                .map(({ label, pct }) => (
                  <span key={label} className="text-[11px] bg-positive/10 text-positive font-semibold px-2.5 py-1 rounded-lg border border-positive/15">
                    {label} +{pct.toFixed(2)}%
                  </span>
                ))}
              {sectorIndices
                .map(({ key, label }) => ({ label, pct: indexMap[key]?.change_pct }))
                .filter(x => x.pct != null && x.pct < 0)
                .sort((a, b) => a.pct - b.pct)
                .slice(0, 2)
                .map(({ label, pct }) => (
                  <span key={label} className="text-[11px] bg-negative/10 text-negative font-semibold px-2.5 py-1 rounded-lg border border-negative/15">
                    {label} {pct.toFixed(2)}%
                  </span>
                ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Indices Strip ─────────────────────────────────────────────────────────────
function IndicesStrip({ indices, loading }) {
  const scrollRef = useRef(null)
  const [canLeft,  setCanLeft]  = useState(false)
  const [canRight, setCanRight] = useState(true)

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 8)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    checkScroll()
    return () => el.removeEventListener('scroll', checkScroll)
  }, [indices])

  const scroll = (dir) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  return (
    <div className="border-b border-border bg-bg-primary/90 backdrop-blur-sm sticky top-0 z-30">
      <div className="w-full px-6 lg:px-10 xl:px-16">
        <div className="flex items-center gap-2 py-2">
          <button
            onClick={() => scroll(-1)}
            disabled={!canLeft}
            className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${
              canLeft
                ? 'border-border bg-bg-secondary text-text-secondary hover:border-saffron/40 hover:text-saffron'
                : 'border-transparent text-text-muted/20 cursor-default'
            }`}
          >
            <ChevronLeft size={16} />
          </button>
          <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-none flex-1 scroll-smooth">
            {loading
              ? Array.from({ length: 10 }).map((_, i) => <div key={i} className="shrink-0 h-14 w-36 skeleton rounded-xl" />)
              : indices.map(idx => (
                  <IndexCard
                    key={idx.symbol}
                    name={idx.name}
                    symbol={idx.symbol}
                    value={idx.value}
                    change={idx.change}
                    changePct={idx.change_pct}
                    compact
                  />
                ))
            }
          </div>
          <button
            onClick={() => scroll(1)}
            disabled={!canRight}
            className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${
              canRight
                ? 'border-border bg-bg-secondary text-text-secondary hover:border-saffron/40 hover:text-saffron'
                : 'border-transparent text-text-muted/20 cursor-default'
            }`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Main Dashboard
// ═══════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [indices,        setIndices]        = useState([])
  const [indicesLoading, setIndicesLoading] = useState(true)

  const [activeTab,      setActiveTab]      = useState('gainers')
  const [movers,         setMovers]         = useState({ gainers: [], losers: [], active: [] })
  const [moversLoading,  setMoversLoading]  = useState(true)

  const [news,           setNews]           = useState([])
  const [newsLoading,    setNewsLoading]    = useState(true)
  const [visibleNewsCount, setVisibleNewsCount] = useState(5)
  const [activeSidebarTab, setActiveSidebarTab] = useState('news')

  const [breadth,        setBreadth]        = useState(null)
  const [breadthLoading, setBreadthLoading] = useState(true)

  const { user } = useAuth()

  // ── Indices ────────────────────────────────────────────────────────────────
  useEffect(() => {
    getMarketIndices()
      .then(res => setIndices(res.data.indices || []))
      .catch(() => {})
      .finally(() => setIndicesLoading(false))
  }, [])

  // ── Market Breadth ─────────────────────────────────────────────────────────
  useEffect(() => {
    getMarketBreadth()
      .then(res => setBreadth(res.data))
      .catch(() => {})
      .finally(() => setBreadthLoading(false))
    const timer = setInterval(() => {
      getMarketBreadth().then(res => setBreadth(res.data)).catch(() => {})
    }, 120000)
    return () => clearInterval(timer)
  }, [])

  // ── Movers ─────────────────────────────────────────────────────────────────
  const fetchMovers = useCallback(async () => {
    try {
      const [gainersRes, losersRes, activeRes] = await Promise.allSettled([
        getMarketMovers('gainers', 12),
        getMarketMovers('losers',  12),
        getMarketMovers('active',  12),
      ])
      setMovers({
        gainers: gainersRes.status === 'fulfilled' ? gainersRes.value.data.stocks || [] : [],
        losers:  losersRes.status  === 'fulfilled' ? losersRes.value.data.stocks  || [] : [],
        active:  activeRes.status  === 'fulfilled' ? activeRes.value.data.stocks  || [] : [],
      })
    } catch {}
    finally { setMoversLoading(false) }
  }, [])

  useEffect(() => {
    fetchMovers()
    const timer = setInterval(fetchMovers, 120000)
    return () => clearInterval(timer)
  }, [fetchMovers])

  // ── News ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    getMarketNews(25)
      .then(res => setNews(res.data.articles || []))
      .catch(() => {})
      .finally(() => setNewsLoading(false))
  }, [])

  const nifty50     = indices.find(i => i.symbol === '^NSEI')
  const niftyChange = nifty50?.change_pct

  return (
    <div>
      <ForexStrip />
      <IndicesStrip indices={indices} loading={indicesLoading} />

      <div className="w-full px-6 lg:px-10 xl:px-16 py-5">

        {/* ── Compact Hero ─────────────────────────────────────────────────── */}
        <div className="relative mb-6 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-saffron/7 via-transparent to-india-green/5 rounded-2xl" />
          <div className="absolute inset-0 border border-saffron/10 rounded-2xl" />

          <div className="relative px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Left */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-saffron/20 flex items-center justify-center">
                    <TrendingUp size={13} className="text-saffron" />
                  </div>
                  <span className="text-[10px] font-bold text-saffron uppercase tracking-widest">Indian Markets</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight leading-tight">
                  ArthiQ Dashboard
                </h1>
                <p className="text-xs text-text-secondary mt-1">
                  Real-time NSE data · AI-powered insights · 2,375+ companies tracked
                </p>
              </div>

              {/* Right: Live stats */}
              <div className="flex items-stretch bg-bg-card/70 border border-border rounded-xl divide-x divide-border shrink-0">
                <AnimatedStat
                  value={nifty50?.value != null ? nifty50.value.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
                  label="NIFTY 50"
                  icon={BarChart2}
                  color={niftyChange > 0 ? 'text-positive' : niftyChange < 0 ? 'text-negative' : 'text-saffron'}
                />
                <AnimatedStat value="2,375+" label="NSE Listed" icon={Building2} color="text-saffron" />
                <AnimatedStat
                  value={breadth?.advances ?? '—'}
                  label="Advancing"
                  icon={TrendingUp}
                  color="text-positive"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Portfolio (logged-in only) ────────────────────────────────────── */}
        {user && <PortfolioSection user={user} />}


        {/* ── Market Pulse ──────────────────────────────────────────────────── */}
        <MarketPulse indices={indices} breadth={breadth} breadthLoading={breadthLoading} />

        {/* ── Market Movers ─────────────────────────────────────────────────── */}
        <section className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-saffron/15 flex items-center justify-center">
                <BarChart2 size={14} className="text-saffron" />
              </div>
              <h2 className="text-base font-bold text-text-primary">Market Movers</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-bg-secondary border border-border p-1 rounded-xl">
                {TABS.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                      activeTab === tab.key
                        ? 'bg-saffron text-white shadow-sm shadow-saffron/20'
                        : 'text-text-muted hover:text-text-primary'
                    }`}>
                    <tab.icon size={11} />{tab.label}
                  </button>
                ))}
              </div>
              <Link to="/stocks" className="text-xs font-bold text-saffron hover:text-saffron-dark flex items-center gap-1 uppercase tracking-widest">
                All Stocks <ArrowRight size={11} />
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {moversLoading
              ? Array.from({ length: 8 }).map((_, i) => <StockCardSkeleton key={i} />)
              : movers[activeTab].length === 0
              ? (
                <div className="col-span-full card p-8 text-center text-text-secondary text-sm">
                  Market data is loading. This may take a minute on first load.
                </div>
              ) : movers[activeTab].slice(0, 12).map(stock => <StockCard key={stock.symbol} stock={stock} />)
            }
          </div>
        </section>

        {/* ── Economic Calendar ──────────────────────────────────────────────── */}
        <EconomicCalendar />

        {/* ── Market News ─────────────────────────────────────────────────────── */}
        <section id="news" className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-saffron/15 flex items-center justify-center">
                <Newspaper size={15} className="text-saffron" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-text-primary tracking-tight leading-tight">Market News</h2>
                <p className="text-[11px] text-text-muted font-medium">Live financial news &amp; analysis</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Live Feed</span>
            </div>
          </div>

          {/* Breaking ticker */}
          {!newsLoading && news.length > 0 && (
            <div className="flex items-center gap-0 mb-5 rounded-xl overflow-hidden border border-slate-200">
              <div className="shrink-0 flex items-center gap-2 bg-saffron px-4 py-2.5">
                <Radio size={12} className="text-white" />
                <span className="text-[11px] font-black text-white uppercase tracking-widest">Breaking</span>
              </div>
              <div className="overflow-hidden flex-1 px-5 py-2.5 bg-slate-900">
                <p className="text-[12px] font-semibold text-white truncate">{news[0]?.headline}</p>
              </div>
              <div className="shrink-0 px-4 py-2.5 bg-slate-900 text-[11px] text-slate-400 font-medium whitespace-nowrap border-l border-slate-700">
                {news[0]?.source}
              </div>
            </div>
          )}

          {newsLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row gap-0 overflow-hidden rounded-xl border border-slate-200 h-[200px]">
                  <div className="skeleton sm:w-[320px] h-full" />
                  <div className="flex-1 p-5 space-y-3">
                    <div className="skeleton h-4 w-24 rounded-full" />
                    <div className="skeleton h-5 w-full" /><div className="skeleton h-5 w-5/6" />
                    <div className="skeleton h-4 w-3/4" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="skeleton h-[110px] w-full rounded-none" />
                      <div className="p-3 space-y-2"><div className="skeleton h-3 w-full" /><div className="skeleton h-3 w-2/3" /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden lg:block space-y-3">
                <div className="skeleton h-5 w-24 mb-4" />
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex gap-3 py-3 border-b border-slate-100">
                    <div className="skeleton shrink-0 w-14 h-14 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-3 w-full" /><div className="skeleton h-3 w-4/5" />
                      <div className="skeleton h-2.5 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : news.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl">
              <Newspaper size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold">No market news available</p>
              <p className="text-slate-400 text-sm mt-1">Ensure <code className="text-saffron font-mono">NEWS_API_KEY</code> is configured in backend .env</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
              {/* Left column */}
              <div>
                <div className="mb-5"><HeroNewsCard article={news[0]} /></div>
                {news.length > 1 && (
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Flame size={12} className="text-saffron" />
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Also in the News</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {news.slice(1, 5).map((article, i) => (
                        <GridNewsCard key={i} article={article} />
                      ))}
                    </div>
                  </div>
                )}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/80">
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-slate-400" />
                      <span className="text-[12px] font-bold text-slate-600 uppercase tracking-widest">Latest Stories</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{news.slice(5).length} articles</span>
                  </div>
                  <div className="px-3">
                    {news.slice(5, 5 + visibleNewsCount).map((article, i, arr) => (
                      <ListNewsCard key={i} article={article} index={i} showDivider={i < arr.length - 1} />
                    ))}
                  </div>
                  {5 + visibleNewsCount < news.length && (
                    <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
                      <button
                        onClick={() => setVisibleNewsCount(prev => prev + 5)}
                        className="w-full flex items-center justify-center gap-2 text-[13px] font-bold text-saffron hover:text-saffron-dark transition-colors"
                      >
                        Show more news <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right sidebar */}
              <div className="hidden lg:flex flex-col gap-5 lg:sticky lg:top-[88px] lg:self-start">
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="border-b border-slate-100">
                    <div className="flex">
                      <button
                        onClick={() => setActiveSidebarTab('news')}
                        className={`flex-1 text-[13px] py-3 -mb-px transition-colors ${
                          activeSidebarTab === 'news'
                            ? 'font-bold text-saffron border-b-2 border-saffron'
                            : 'font-medium text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        News
                      </button>
                      <button
                        onClick={() => setActiveSidebarTab('analysis')}
                        className={`flex-1 text-[13px] py-3 -mb-px transition-colors ${
                          activeSidebarTab === 'analysis'
                            ? 'font-bold text-saffron border-b-2 border-saffron'
                            : 'font-medium text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        Analysis
                      </button>
                    </div>
                  </div>
                  <div className="px-3 py-1">
                    {(() => {
                      let sidebarArticles = []
                      if (activeSidebarTab === 'news') {
                        sidebarArticles = news.slice(10, 16)
                        if (sidebarArticles.length === 0) sidebarArticles = news.slice(0, 6)
                      } else {
                        // Broader analysis keywords to cover typical financial opinion/commentary/evaluation
                        const analysisKeywords = [
                          'analyst', 'target', 'outlook', 'shares', 'growth', 'buy', 'sell', 'hold', 'valuat', 
                          'trend', 'chart', 'technical', 'fundamental', 'opinion', 'expert', 'why', 'forecast',
                          'predict', 'brokerage', 'recommend', 'q1', 'q2', 'q3', 'q4', 'result', 'profit', 'earnings',
                          'gmp', 'ipo', 'demand', 'expected', 'commentary', 'report', 'review', 'analysis', 'expected to'
                        ]
                        sidebarArticles = news.filter(art => {
                          const headline = (art.headline || '').toLowerCase()
                          const summary = (art.summary || '').toLowerCase()
                          return analysisKeywords.some(kw => headline.includes(kw) || summary.includes(kw))
                        })
                        
                        // Use slice(16, 22) for non-overlapping fallback if we have too few matching analysis articles
                        if (sidebarArticles.length < 3) {
                          sidebarArticles = news.slice(16, 22)
                        } else {
                          sidebarArticles = sidebarArticles.slice(0, 6)
                        }
                      }
                      
                      // Fallback in case of empty slice
                      if (!sidebarArticles || sidebarArticles.length === 0) {
                        sidebarArticles = news.slice(0, 6)
                      }
                      
                      return sidebarArticles.map((article, i) => (
                        <SidebarNewsCard key={i} article={article} index={i} />
                      ))
                    })()}
                  </div>
                  <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60">
                    <button
                      onClick={() => {
                        const el = document.getElementById('news')
                        if (el) el.scrollIntoView({ behavior: 'smooth' })
                      }}
                      className="flex items-center gap-1.5 text-[12px] font-bold text-saffron hover:text-saffron-dark transition-colors"
                    >
                      More News <ArrowRight size={11} />
                    </button>
                  </div>
                </div>

                {/* Sidebar movers table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[14px] font-extrabold text-slate-900">Market Movers</h3>
                      <Link to="/stocks" className="text-[11px] text-saffron font-bold hover:text-saffron-dark transition-colors">View all →</Link>
                    </div>
                    <div className="flex gap-0 bg-slate-100 rounded-lg p-0.5">
                      {TABS.map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-all ${
                            activeTab === tab.key
                              ? 'bg-white text-saffron shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {tab.key === 'gainers' ? 'Gainers' : tab.key === 'losers' ? 'Losers' : 'Active'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 text-[10px] font-black text-slate-400 uppercase tracking-wider px-4 py-2 bg-slate-50 border-b border-slate-100">
                    <span>Name</span>
                    <span className="text-right">Price</span>
                    <span className="text-right">Chg%</span>
                  </div>
                  {moversLoading ? (
                    <div className="space-y-1 p-3">
                      {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-9 rounded-lg" />)}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {movers[activeTab].slice(0, 7).map((stock, i) => {
                        const isPos = (stock.change_pct ?? 0) > 0
                        const isNeg = (stock.change_pct ?? 0) < 0
                        const sym = stock.symbol.replace('.NS','').replace('.BO','')
                        return (
                          <Link
                            key={i}
                            to={`/company/${stock.symbol}`}
                            className="grid grid-cols-3 py-2.5 px-4 hover:bg-saffron/[0.04] transition-colors group items-center"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-slate-300 w-4">{i+1}</span>
                              <span className="text-[12px] font-bold text-slate-800 group-hover:text-saffron truncate transition-colors">{sym}</span>
                            </div>
                            <span className="text-[12px] text-slate-600 text-right font-semibold">
                              {stock.price != null ? `₹${Number(stock.price).toFixed(2)}` : '—'}
                            </span>
                            <div className="flex justify-end">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                isPos ? 'bg-emerald-50 text-emerald-600' :
                                isNeg ? 'bg-red-50 text-red-600' :
                                'bg-slate-100 text-slate-400'
                              }`}>
                                {stock.change_pct != null
                                  ? `${isPos?'+':''}${Number(stock.change_pct).toFixed(2)}%`
                                  : '—'}
                              </span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

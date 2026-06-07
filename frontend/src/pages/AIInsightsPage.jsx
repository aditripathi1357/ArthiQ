import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Sparkles, Loader2, TrendingUp, TrendingDown,
  Activity, ArrowRight, ShieldAlert, Play, Brain, BarChart3,
  Newspaper, AlertTriangle, ChevronRight, Zap, Target, Eye
} from 'lucide-react'
import useCompany from '../hooks/useCompany'
import { getLogoUrl } from '../utils/logoUtils'
import {
  getWhyMoved,
  getStockSummary,
  getCompanyOutlook,
} from '../api/client'

// ── Company Logo ──────────────────────────────────────────────────────────────
function CompanyLogo({ symbol, name, size = 44 }) {
  const [err, setErr] = useState(false)
  const url = getLogoUrl(symbol)
  const initial = (name || symbol || '?').charAt(0).toUpperCase()

  return (
    <div
      className="rounded-xl overflow-hidden bg-bg-secondary flex items-center justify-center shrink-0 border border-saffron/20"
      style={{ width: size, height: size }}
    >
      {url && !err ? (
        <img src={url} alt={symbol} loading="lazy" onError={() => setErr(true)} className="w-full h-full object-contain p-1" />
      ) : (
        <span className="font-extrabold text-saffron" style={{ fontSize: size * 0.42 }}>{initial}</span>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AIInsightsPage() {
  const { symbol } = useParams()
  const { profile, overview, loading: companyLoading } = useCompany(symbol)

  const [activeTab, setActiveTab] = useState('why-moved')
  const [whyData, setWhyData] = useState(null)
  const [summaryData, setSummaryData] = useState(null)
  const [outlookData, setOutlookData] = useState(null)
  const [loading, setLoading] = useState(true)

  const data = overview || profile || {}
  const price = data.current_price
  const change = data.change
  const changePct = data.change_pct
  const isPositive = change > 0

  // Fetch data per tab (lazy)
  useEffect(() => {
    if (!symbol) return
    setLoading(true)

    if (activeTab === 'why-moved') {
      if (whyData) return setLoading(false)
      getWhyMoved(symbol)
        .then(res => { setWhyData(res.data); setLoading(false) })
        .catch(() => setLoading(false))
    } else if (activeTab === 'bull-bear') {
      if (summaryData) return setLoading(false)
      getStockSummary(symbol)
        .then(res => { setSummaryData(res.data); setLoading(false) })
        .catch(() => setLoading(false))
    } else if (activeTab === 'outlook') {
      if (outlookData) return setLoading(false)
      getCompanyOutlook(symbol)
        .then(res => { setOutlookData(res.data); setLoading(false) })
        .catch(() => setLoading(false))
    } else {
      // sentiment tab reuses whyData
      if (whyData) return setLoading(false)
      getWhyMoved(symbol)
        .then(res => { setWhyData(res.data); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [activeTab, symbol])

  const TABS = [
    { id: 'why-moved', label: 'Why It Moved', icon: Zap },
    { id: 'bull-bear', label: 'Bull or Bear', icon: Target },
    { id: 'outlook', label: '2-4 Week Outlook', icon: Eye },
    { id: 'sentiment', label: 'News Sentiment', icon: Newspaper },
  ]

  if (companyLoading) {
    return (
      <div className="w-full px-6 lg:px-10 xl:px-16 py-8">
        <div className="flex items-center justify-center py-32 text-saffron">
          <Loader2 size={36} className="animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-6 lg:px-10 xl:px-16 py-6">
      {/* Breadcrumb */}
      <Link
        to={`/company/${symbol}`}
        className="inline-flex items-center gap-2 text-base font-bold text-text-secondary hover:text-saffron transition-colors mb-6"
      >
        <ArrowLeft size={16} className="stroke-[3px]" /> Back to {data.name || symbol}
      </Link>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="ai-page-header rounded-2xl p-6 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-4 right-8"><Sparkles size={120} className="text-saffron" /></div>
          <div className="absolute bottom-4 left-8"><Brain size={80} className="text-saffron" /></div>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <CompanyLogo symbol={symbol} name={data.name} size={52} />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-text-primary">{data.name || symbol}</h1>
                <span className="px-2 py-0.5 rounded-full bg-saffron text-bg-primary text-[10px] font-bold">
                  {data.exchange || 'NSE'}
                </span>
              </div>
              <p className="text-sm text-text-muted mt-0.5 font-mono">{symbol}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Price */}
            <div className="text-right">
              <span className="text-3xl font-extrabold text-text-primary">
                {price != null ? `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
              </span>
              {change != null && (
                <div className={`text-sm font-bold mt-0.5 ${isPositive ? 'text-positive' : 'text-negative'}`}>
                  {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(2)} ({isPositive ? '+' : ''}{changePct?.toFixed(2)}%)
                </div>
              )}
            </div>

            {/* AI Badge */}
            <div className="ai-badge-glow px-4 py-2.5 rounded-xl flex items-center gap-2">
              <Sparkles size={18} className="text-saffron" />
              <div>
                <span className="text-sm font-bold text-text-primary block">AI Analysis</span>
                <span className="text-[10px] text-saffron font-semibold uppercase tracking-wider">
                  ArthiQ AI
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT: Tab Navigation + Content (8 cols) */}
        <div className="lg:col-span-8">

          {/* Tabs */}
          <div className="flex gap-1 bg-bg-card border border-border rounded-xl p-1.5 mb-6 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-saffron text-bg-primary shadow-md'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-hover'
                  }`}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <div className="glass-card p-0 overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-saffron">
                <Loader2 size={36} className="animate-spin mb-4" />
                <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                  Analyzing {symbol.replace('.NS','').replace('.BO','')}...
                </p>
              </div>
            ) : (
              <div className="animate-in fade-in duration-300">
                {activeTab === 'why-moved' && <WhyMovedSection data={whyData} symbol={symbol} />}
                {activeTab === 'bull-bear' && <BullBearSection data={summaryData} />}
                {activeTab === 'outlook' && <OutlookSection data={outlookData} />}
                {activeTab === 'sentiment' && <SentimentSection data={whyData} />}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Sidebar Quick Stats (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Quick Stats Card */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-5 flex items-center gap-2">
              <BarChart3 size={14} className="text-saffron" /> Quick Stats
            </h3>
            <div className="space-y-4">
              <QuickStat label="Current Price" value={price ? `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'} />
              <QuickStat label="Market Cap" value={data.market_cap ? `₹${(data.market_cap / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr` : '—'} />
              <QuickStat label="P/E Ratio" value={data.pe_ratio ? data.pe_ratio.toFixed(2) : '—'} />
              <QuickStat label="EPS" value={data.eps ? `₹${data.eps.toFixed(2)}` : '—'} />
              <QuickStat label="Volume" value={data.volume ? data.volume.toLocaleString() : '—'} />
              <QuickStat label="Sector" value={data.sector || '—'} />
              <QuickStat label="Industry" value={data.industry || '—'} />
            </div>
          </div>

          {/* Model Info */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Brain size={14} className="text-saffron" /> About This Analysis
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Models</span>
                <span className="text-text-primary font-medium text-right">
                  ArthiQ AI Engine
                  <span className="block text-[10px] text-text-muted font-normal">NLP Analysis</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Sentiment</span>
                <span className="text-text-primary font-medium">ArthiQ Sentiment</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Data Sources</span>
                <span className="text-text-primary font-medium">NSE, NewsAPI, RSS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Cache Duration</span>
                <span className="text-text-primary font-medium">15-60 min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Analysis Type</span>
                <span className="text-text-primary font-medium">NLP + Technical</span>
              </div>
            </div>
          </div>

          {/* Back link */}
          <Link
            to={`/company/${symbol}`}
            className="glass-card p-4 flex items-center justify-between hover:border-saffron transition-all group"
          >
            <span className="text-sm font-semibold text-text-secondary group-hover:text-saffron transition-colors">
              ← View Full Company Details
            </span>
            <ChevronRight size={16} className="text-text-muted group-hover:text-saffron transition-colors" />
          </Link>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-10 py-4 border-t border-border text-center">
        <p className="text-[11px] text-text-muted uppercase tracking-wider flex items-center justify-center gap-2">
          <AlertTriangle size={12} />
          AI predictions are for informational purposes only. Not financial advice. Always do your own research.
        </p>
      </div>
    </div>
  )
}

// ── Helper Components ─────────────────────────────────────────────────────────

function QuickStat({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-text-muted font-medium">{label}</span>
      <span className="text-sm font-bold text-text-primary">{value}</span>
    </div>
  )
}

// ── Why It Moved Section ──────────────────────────────────────────────────────

function WhyMovedSection({ data, symbol }) {
  if (!data) return <EmptyState message="Unable to load price movement analysis." />

  const pct = data.price_change_pct
  const isPositive = pct > 0

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-1 flex items-center gap-2">
            <Zap size={20} className="text-saffron" /> Why Did {symbol.replace('.NS','').replace('.BO','')} Move?
          </h2>
          <p className="text-sm text-text-muted">AI-powered analysis of recent price movement</p>
        </div>
        <div className="flex items-center gap-3">
          {pct != null && (
            <span className={`text-lg font-bold px-3 py-1.5 rounded-lg ${
              isPositive ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'
            }`}>
              {isPositive ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
            </span>
          )}
          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${
            data.confidence === 'high' ? 'bg-positive/10 text-positive border border-positive/30'
            : data.confidence === 'low' ? 'bg-negative/10 text-negative border border-negative/30'
            : 'bg-saffron/10 text-saffron border border-saffron/30'
          }`}>
            {(data.confidence || 'medium')} confidence
          </span>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-bg-card-hover rounded-xl p-6 border border-border mb-8">
        <h3 className="text-xs font-bold uppercase text-text-muted tracking-wider mb-3">Analysis</h3>
        <p className="text-base text-text-primary leading-relaxed">{data.explanation}</p>
      </div>

      {/* Key Factors */}
      <div className="mb-8">
        <h3 className="text-xs font-bold uppercase text-text-muted tracking-wider mb-4">Key Factors</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.key_factors && data.key_factors.map((f, i) => {
            const isPos = f.toLowerCase().match(/(positive|growth|upward|buy|bull|increase|strong)/)
            const isNeg = f.toLowerCase().match(/(negative|down|sell|bear|decrease|weak)/)
            return (
              <div key={i} className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
                isPos ? 'bg-positive/8 text-positive border border-positive/20'
                : isNeg ? 'bg-negative/8 text-negative border border-negative/20'
                : 'bg-bg-primary text-text-secondary border border-border'
              }`}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{
                  backgroundColor: isPos ? 'var(--positive)' : isNeg ? 'var(--negative)' : 'var(--saffron)'
                }}></span>
                {f}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent News */}
      {data.recent_news && data.recent_news.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase text-text-muted tracking-wider mb-4">Related Headlines</h3>
          <div className="space-y-2">
            {data.recent_news.map((headline, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-border/30 last:border-0">
                <Newspaper size={14} className="text-saffron mt-0.5 shrink-0" />
                <p className="text-sm text-text-secondary leading-relaxed">{headline}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <SourceBadge source={data.source} generatedAt={data.generated_at} />
    </div>
  )
}

// ── Bull or Bear Section ──────────────────────────────────────────────────────

function BullBearSection({ data }) {
  if (!data) return <EmptyState message="Unable to load investment summary." />

  const sig = data.signal ? data.signal.toUpperCase() : 'HOLD'
  const isBuy = sig === 'BUY'
  const isSell = sig === 'SELL'
  const isWatch = sig === 'WATCH'

  const bg = isBuy ? 'bg-positive' : isSell ? 'bg-negative' : isWatch ? 'bg-saffron' : 'bg-neutral'
  const textCol = isBuy || isSell ? 'text-white' : isWatch ? 'text-black' : 'text-white'
  const Icon = isBuy ? TrendingUp : isSell ? TrendingDown : isWatch ? Activity : ArrowRight
  const riskIndex = data.risk_level === 'high' ? 3 : data.risk_level === 'medium' ? 2 : 1

  return (
    <div className="p-8">
      {/* Header */}
      <h2 className="text-xl font-bold text-text-primary mb-1 flex items-center gap-2">
        <Target size={20} className="text-saffron" /> Investment Signal
      </h2>
      <p className="text-sm text-text-muted mb-8">AI-generated buy/sell/hold recommendation</p>

      {/* Signal Display */}
      <div className="flex flex-col sm:flex-row items-center gap-8 mb-10">
        <div className={`flex flex-col items-center justify-center w-36 h-36 rounded-2xl ${bg} ${textCol} shadow-lg relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          <Icon size={40} className="mb-2 relative z-10" />
          <span className="text-2xl font-extrabold tracking-widest relative z-10">{sig}</span>
        </div>

        <div className="flex-1 space-y-5">
          {/* Confidence */}
          <div>
            <div className="flex justify-between text-xs font-bold text-text-muted mb-2">
              <span>Confidence</span>
              <span className="text-saffron">{((data.confidence || 0.5) * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-saffron rounded-full transition-all duration-1000"
                style={{ width: `${(data.confidence || 0.5) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Risk Level */}
          <div>
            <div className="flex justify-between text-xs font-bold text-text-muted mb-2">
              <span>Low Risk</span>
              <span className="text-saffron">Risk Level: {(data.risk_level || 'medium').toUpperCase()}</span>
              <span>High Risk</span>
            </div>
            <div className="w-full flex h-2.5 rounded-full overflow-hidden bg-bg-primary gap-1">
              <div className={`flex-1 rounded-l-full ${riskIndex >= 1 ? 'bg-positive' : 'bg-border'}`}></div>
              <div className={`flex-1 ${riskIndex >= 2 ? 'bg-saffron' : 'bg-border'}`}></div>
              <div className={`flex-1 rounded-r-full ${riskIndex >= 3 ? 'bg-negative' : 'bg-border'}`}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <div className="bg-bg-card-hover rounded-xl p-6 border border-border mb-8">
        <h3 className="text-xs font-bold uppercase text-text-muted tracking-wider mb-3">Reasoning</h3>
        <p className="text-base text-text-primary leading-relaxed">{data.reasoning}</p>
      </div>

      {/* Key Reasons */}
      {data.reasons && data.reasons.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase text-text-muted tracking-wider mb-4">Key Reasons</h3>
          <div className="space-y-3">
            {data.reasons.map((r, i) => (
              <div key={i} className="flex gap-3 items-start text-sm text-text-secondary bg-bg-primary p-4 rounded-xl border border-border">
                <span className="text-saffron font-bold mt-0.5">{i + 1}.</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <SourceBadge source={data.source} generatedAt={data.generated_at} />
    </div>
  )
}

// ── Outlook Section ───────────────────────────────────────────────────────────

function OutlookSection({ data }) {
  if (!data) return <EmptyState message="Unable to load price outlook." />

  const dir = data.direction || 'neutral'
  const rec = (data.recommendation || 'hold').replace('_', ' ').toUpperCase()
  const low = data.price_target_low
  const high = data.price_target_high
  const cur = data.current_price

  const isBull = dir === 'bullish'
  const isBear = dir === 'bearish'
  const Arrow = isBull ? TrendingUp : isBear ? TrendingDown : ArrowRight

  return (
    <div className="p-8">
      {/* Header */}
      <h2 className="text-xl font-bold text-text-primary mb-1 flex items-center gap-2">
        <Eye size={20} className="text-saffron" /> 2-4 Week Outlook
      </h2>
      <p className="text-sm text-text-muted mb-8">Technical + AI-driven forward-looking analysis</p>

      {/* Direction Card */}
      <div className="flex items-center gap-6 mb-8 bg-bg-card-hover rounded-xl p-6 border border-border">
        <div className={`p-5 rounded-2xl flex items-center justify-center ${
          isBull ? 'bg-positive-bg text-positive' : isBear ? 'bg-negative-bg text-negative' : 'bg-saffron-glow text-saffron'
        }`}>
          <Arrow size={40} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-lg font-bold uppercase ${
              isBull ? 'text-positive' : isBear ? 'text-negative' : 'text-saffron'
            }`}>{dir}</span>
            <span className="text-xs font-bold uppercase text-text-muted bg-bg-primary px-2.5 py-1 rounded-lg border border-border">
              {rec}
            </span>
            {data.technical_view && (
              <span className="text-xs font-bold uppercase text-text-muted bg-bg-primary px-2.5 py-1 rounded-lg border border-border">
                {data.technical_view}
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary">{data.short_summary}</p>
        </div>
      </div>

      {/* Price Target Range */}
      {low && high && cur && (
        <div className="bg-bg-primary rounded-xl p-6 border border-border mb-8">
          <h3 className="text-xs font-bold uppercase text-text-muted tracking-wider mb-5">Price Target Range</h3>
          <div className="flex justify-between text-sm font-bold mb-3">
            <span className="text-negative">₹{low}</span>
            <span className="text-text-primary text-lg">₹{cur}</span>
            <span className="text-positive">₹{high}</span>
          </div>
          <div className="relative w-full h-2.5 bg-border rounded-full flex items-center">
            <div
              className="absolute h-full bg-gradient-to-r from-negative via-saffron to-positive rounded-full transition-all"
              style={{ width: '100%' }}
            ></div>
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-bg-primary bg-white shadow-lg transition-all"
              style={{ left: `calc(${Math.max(0, Math.min(100, ((cur - low) / (high - low)) * 100))}% - 8px)` }}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] text-text-muted mt-2 font-medium">
            <span>Bear Target</span>
            <span>Current</span>
            <span>Bull Target</span>
          </div>
        </div>
      )}

      {/* Catalysts & Risks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div className="bg-bg-card-hover rounded-xl p-5 border border-border">
          <h4 className="text-xs font-bold uppercase text-text-secondary mb-4 flex items-center gap-2">
            <Play size={12} className="text-positive fill-current" /> Catalysts
          </h4>
          <ul className="space-y-2.5">
            {data.key_catalysts?.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="text-positive mt-0.5">•</span> <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-bg-card-hover rounded-xl p-5 border border-border">
          <h4 className="text-xs font-bold uppercase text-text-secondary mb-4 flex items-center gap-2">
            <ShieldAlert size={14} className="text-negative" /> Risks
          </h4>
          <ul className="space-y-2.5">
            {data.risks?.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="text-negative mt-0.5">•</span> <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <SourceBadge source={data.source} generatedAt={data.generated_at} />
    </div>
  )
}

// ── Sentiment Section ─────────────────────────────────────────────────────────

function SentimentSection({ data }) {
  if (!data) return <EmptyState message="Unable to load sentiment analysis." />

  const headlines = data.recent_news || []
  const factors = data.key_factors || []
  const pct = data.price_change_pct
  const confidence = data.confidence || 'medium'

  // Derive a simple sentiment from the data
  const sentiment = pct > 2 ? 'Positive' : pct < -2 ? 'Negative' : 'Neutral'
  const sentimentColor = pct > 2 ? 'text-positive' : pct < -2 ? 'text-negative' : 'text-saffron'
  const sentimentBg = pct > 2 ? 'bg-positive/10' : pct < -2 ? 'bg-negative/10' : 'bg-saffron/10'

  return (
    <div className="p-8">
      {/* Header */}
      <h2 className="text-xl font-bold text-text-primary mb-1 flex items-center gap-2">
        <Newspaper size={20} className="text-saffron" /> News Sentiment
      </h2>
      <p className="text-sm text-text-muted mb-8">AI analysis of recent news headlines and market impact</p>

      {/* Sentiment Gauge */}
      <div className="flex flex-col sm:flex-row items-center gap-8 mb-10">
        <div className={`w-32 h-32 rounded-2xl ${sentimentBg} flex flex-col items-center justify-center`}>
          <span className={`text-2xl font-extrabold ${sentimentColor}`}>{sentiment}</span>
          <span className="text-xs text-text-muted mt-1 uppercase tracking-wider">Overall</span>
        </div>
        <div className="flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-muted font-medium">Sentiment Score</span>
            <span className={`text-lg font-bold ${sentimentColor}`}>
              {pct != null ? `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%` : 'N/A'}
            </span>
          </div>
          <div className="w-full h-3 bg-border rounded-full overflow-hidden relative">
            <div className="absolute inset-0 flex">
              <div className="flex-1 bg-negative/20"></div>
              <div className="flex-1 bg-saffron/20"></div>
              <div className="flex-1 bg-positive/20"></div>
            </div>
            <div
              className="absolute top-0 h-full w-1 bg-text-primary rounded-full"
              style={{ left: `${Math.max(0, Math.min(100, 50 + (pct || 0) * 2.5))}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] text-text-muted font-medium">
            <span>Bearish</span>
            <span>Neutral</span>
            <span>Bullish</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Confidence:</span>
            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
              confidence === 'high' ? 'bg-positive/10 text-positive' : confidence === 'low' ? 'bg-negative/10 text-negative' : 'bg-saffron/10 text-saffron'
            }`}>{confidence}</span>
          </div>
        </div>
      </div>

      {/* Key Themes */}
      {factors.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase text-text-muted tracking-wider mb-4">Key Themes Detected</h3>
          <div className="flex flex-wrap gap-2">
            {factors.map((f, i) => (
              <span key={i} className="px-3 py-2 rounded-xl text-sm font-medium bg-bg-primary text-text-secondary border border-border">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Headlines */}
      {headlines.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase text-text-muted tracking-wider mb-4">
            Recent Headlines ({headlines.length})
          </h3>
          <div className="space-y-1">
            {headlines.map((headline, i) => (
              <div key={i} className="flex items-start gap-3 py-3 px-4 border-b border-border/30 last:border-0 hover:bg-bg-card-hover rounded-lg transition-colors">
                <span className="text-saffron font-bold text-sm mt-0.5">{i + 1}</span>
                <p className="text-sm text-text-secondary leading-relaxed">{headline}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <SourceBadge source={data.source} generatedAt={data.generated_at} />
    </div>
  )
}

// ── Shared Sub-Components ─────────────────────────────────────────────────────

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-8">
      <AlertTriangle size={40} className="text-text-muted/30 mb-4" />
      <p className="text-sm font-semibold text-text-secondary">{message}</p>
      <p className="text-xs text-text-muted mt-2">
        This could be due to API rate limits or the symbol not being supported. Try again later.
      </p>
    </div>
  )
}

function SourceBadge({ source, generatedAt }) {
  const modelLabel = (() => {
    if (!source) return 'Unknown'
    if (source.includes('groq') || source.includes('llama')) return '⚡ Groq llama-3.3-70b (free)'
    if (source.includes('openai') || source.includes('gpt')) return '🤖 OpenAI GPT-4o-mini'
    if (source.includes('rule') || source.includes('fallback')) return '📊 Rule-based Analysis'
    if (source.includes('vader') || source.includes('sentiment')) return '🔬 VADER Sentiment'
    return source
  })()

  return (
    <div className="mt-8 pt-4 border-t border-border/50 flex justify-between items-center text-[10px] text-text-muted">
      <span className="font-medium">{modelLabel}</span>
      {generatedAt && (
        <span>Generated: {new Date(generatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
      )}
    </div>
  )
}


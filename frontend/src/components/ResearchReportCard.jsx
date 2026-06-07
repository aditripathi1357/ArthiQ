import { useState } from 'react'
import {
  RefreshCw, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronUp, Zap, Target, Brain, Shield
} from 'lucide-react'

/**
 * ResearchReportCard — displays a single AI research report.
 * Props:
 *   report        (object)  – the report from /api/notifications/reports/{symbol}
 *   onRegenerate  (fn)      – called when user clicks "Regenerate"
 *   loading       (bool)    – show skeleton/spinner
 */
export default function ResearchReportCard({ report, onRegenerate, loading = false }) {
  const [expanded, setExpanded] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  if (loading) {
    return (
      <div className="rounded-2xl border p-5 animate-pulse" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="skeleton h-10 w-10 rounded-xl" />
          <div className="flex-1">
            <div className="skeleton h-4 w-36 mb-2" />
            <div className="skeleton h-3 w-20" />
          </div>
        </div>
        <div className="skeleton h-3 w-full mb-2" />
        <div className="skeleton h-3 w-4/5" />
      </div>
    )
  }

  if (!report) return null

  const {
    symbol = '',
    company_name = symbol,
    summary = '',
    sentiment = 'neutral',
    impact_level = 'neutral',
    short_term_outlook = '',
    confidence_score = 0,
    key_events = [],
    analyst_view = '',
    risk_factors = [],
    supporting_data = {},
    generated_at = null,
    pending = false,
  } = report

  const confidence = Math.round((confidence_score || 0) * 100)
  const shortSymbol = symbol.replace('.NS', '').replace('.BO', '')

  const sentimentConfig = {
    positive: { color: '#16a34a', bg: '#dcfce7', label: 'Positive', icon: TrendingUp },
    negative: { color: '#dc2626', bg: '#fee2e2', label: 'Negative', icon: TrendingDown },
    neutral:  { color: '#64748b', bg: '#f1f5f9', label: 'Neutral',  icon: Minus },
  }

  const impactConfig = {
    bullish: { color: '#16a34a', bg: '#dcfce7', label: 'Bullish' },
    bearish: { color: '#dc2626', bg: '#fee2e2', label: 'Bearish' },
    neutral: { color: '#f59e0b', bg: '#fef3c7', label: 'Neutral' },
  }

  const sc = sentimentConfig[sentiment] || sentimentConfig.neutral
  const ic = impactConfig[impact_level] || impactConfig.neutral
  const SentimentIcon = sc.icon

  const confColor = confidence >= 75 ? '#16a34a' : confidence >= 50 ? '#f59e0b' : '#dc2626'

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      await onRegenerate?.(symbol)
    } finally {
      setTimeout(() => setRegenerating(false), 3000)
    }
  }

  const price = supporting_data?.price || 0
  const changePct = supporting_data?.change_pct || 0
  const changeColor = changePct > 0 ? '#16a34a' : changePct < 0 ? '#dc2626' : '#64748b'
  const changeArrow = changePct > 0 ? '▲' : changePct < 0 ? '▼' : '▶'

  if (pending) {
    return (
      <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-saffron/10 flex items-center justify-center">
            <Brain size={20} className="text-saffron animate-pulse" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{company_name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{shortSymbol}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <RefreshCw size={14} className="animate-spin text-saffron" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>AI report is being generated...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl border transition-all duration-300 overflow-hidden"
      style={{
        borderColor: 'var(--border)',
        backgroundColor: 'var(--bg-card)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Company info */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
              style={{ backgroundColor: `${sc.color}18`, color: sc.color }}
            >
              {shortSymbol.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{company_name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{shortSymbol} · NSE</p>
            </div>
          </div>

          {/* Price */}
          {price > 0 && (
            <div className="text-right shrink-0">
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              <p className="text-xs font-semibold" style={{ color: changeColor }}>{changeArrow} {Math.abs(changePct).toFixed(2)}%</p>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span
            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: sc.bg, color: sc.color }}
          >
            <SentimentIcon size={11} />
            {sc.label}
          </span>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: ic.bg, color: ic.color }}
          >
            {ic.label}
          </span>
        </div>

        {/* Confidence bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Confidence
            </span>
            <span className="text-xs font-bold" style={{ color: confColor }}>{confidence}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${confidence}%`,
                background: `linear-gradient(90deg, ${confColor}, ${confColor}cc)`,
              }}
            />
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {summary}
        </p>
      </div>

      {/* Expand/Collapse */}
      {(short_term_outlook || key_events.length > 0 || analyst_view) && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-semibold transition-colors hover:bg-black/5"
            style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}
          >
            <span>{expanded ? 'Show less' : 'Full analysis'}</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expanded && (
            <div className="px-5 pb-5 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>

              {/* Short-term outlook */}
              {short_term_outlook && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Target size={13} className="text-saffron" />
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Short-Term Outlook</p>
                  </div>
                  <div
                    className="text-sm leading-relaxed p-3 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                  >
                    {short_term_outlook}
                  </div>
                </div>
              )}

              {/* Key events */}
              {key_events.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap size={13} className="text-saffron" />
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Key Events</p>
                  </div>
                  <ul className="space-y-1.5">
                    {key_events.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <span className="text-saffron mt-0.5 shrink-0">⚡</span>
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Analyst view */}
              {analyst_view && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Brain size={13} className="text-saffron" />
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Analyst View</p>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{analyst_view}</p>
                </div>
              )}

              {/* Risk factors */}
              {risk_factors?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Shield size={13} className="text-negative" />
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Risk Factors</p>
                  </div>
                  <ul className="space-y-1">
                    {risk_factors.map((r, i) => (
                      <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--text-muted)' }}>
                        <span className="text-negative shrink-0">⚠️</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}
      >
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {generated_at
            ? `Updated ${new Date(generated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
            : 'Just generated'}
        </p>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          style={{
            color: regenerating ? 'var(--text-muted)' : 'var(--text-primary)',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          <RefreshCw size={11} className={regenerating ? 'animate-spin' : ''} />
          {regenerating ? 'Generating...' : 'Refresh'}
        </button>
      </div>
    </div>
  )
}

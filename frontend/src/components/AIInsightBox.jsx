import { useState, useEffect } from 'react'
import { Brain, Sparkles, AlertTriangle, Loader2 } from 'lucide-react'
import { getWhyMoved, getStockSummary } from '../api/client'

export function WhyMovedBox({ symbol }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    setError(null)
    getWhyMoved(symbol)
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error('WhyMoved error:', err)
        setError('Unable to load AI analysis')
      })
      .finally(() => setLoading(false))
  }, [symbol])

  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={16} className="text-accent" />
          <h3 className="text-sm font-semibold text-text-secondary">Why did this stock move?</h3>
        </div>
        <div className="flex items-center justify-center py-8 text-text-muted">
          <Loader2 size={20} className="animate-spin mr-2" />
          <span className="text-sm">Analyzing with AI...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-negative" />
          <h3 className="text-sm font-semibold text-text-secondary">AI Analysis</h3>
        </div>
        <p className="text-sm text-text-muted">{error}</p>
      </div>
    )
  }

  if (!data) return null

  const pct = data.price_change_pct
  const isPositive = pct > 0

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Brain size={16} className="text-accent" />
        <h3 className="text-sm font-semibold text-text-secondary">Why did this stock move?</h3>
        {data.source && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
            {data.source === 'openai-gpt4o-mini' ? 'AI' : 'Rule-based'}
          </span>
        )}
      </div>

      {/* Change badge */}
      {pct != null && (
        <div className={`inline-flex items-center gap-1 text-sm font-bold mb-3 px-2 py-1 rounded-md ${
          isPositive ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'
        }`}>
          {isPositive ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}% over 7 days
        </div>
      )}

      {/* Explanation */}
      <p className="text-sm text-text-secondary leading-relaxed mb-3">
        {data.explanation}
      </p>

      {/* Key factors */}
      {data.key_factors && data.key_factors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {data.key_factors.map((f, i) => (
            <span key={i} className="text-[11px] px-2 py-1 rounded-md bg-navy-700 text-text-secondary border border-navy-600">
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function SummaryBox({ symbol }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    setError(null)
    getStockSummary(symbol)
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error('Summary error:', err)
        setError('Unable to load summary')
      })
      .finally(() => setLoading(false))
  }, [symbol])

  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-accent" />
          <h3 className="text-sm font-semibold text-text-secondary">Investment Summary</h3>
        </div>
        <div className="flex items-center justify-center py-6 text-text-muted">
          <Loader2 size={20} className="animate-spin mr-2" />
          <span className="text-sm">Generating summary...</span>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-text-muted" />
          <h3 className="text-sm font-semibold text-text-secondary">Investment Summary</h3>
        </div>
        <p className="text-sm text-text-muted">{error || 'No data'}</p>
      </div>
    )
  }

  const signalColors = {
    buy: 'bg-positive/15 text-positive border-positive/30',
    sell: 'bg-negative/15 text-negative border-negative/30',
    hold: 'bg-navy-600 text-text-secondary border-navy-500',
    watch: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  }

  const riskColors = {
    low: 'text-positive',
    medium: 'text-yellow-400',
    high: 'text-negative',
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={16} className="text-accent" />
        <h3 className="text-sm font-semibold text-text-secondary">Investment Summary</h3>
      </div>

      {/* Signal + Risk */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`text-xs font-bold uppercase px-3 py-1.5 rounded-md border ${
          signalColors[data.signal] || signalColors.hold
        }`}>
          {data.signal}
        </span>
        <div className="text-xs text-text-muted">
          Risk: <span className={`font-semibold ${riskColors[data.risk_level] || 'text-text-secondary'}`}>
            {data.risk_level?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Reasoning */}
      <p className="text-sm text-text-secondary leading-relaxed mb-3">
        {data.reasoning}
      </p>

      {/* Reasons */}
      {data.reasons && data.reasons.length > 0 && (
        <ul className="space-y-1.5">
          {data.reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-text-muted">
              <span className="text-accent mt-0.5">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

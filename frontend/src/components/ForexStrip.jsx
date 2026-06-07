import { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownRight, RefreshCw, Radio } from 'lucide-react'
import { getINRRates } from '../api/client'

export default function ForexStrip() {
  const [rates, setRates] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchRates = async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const res = await getINRRates()
      setRates(res.data.rates || {})
    } catch (err) {
      console.error('Forex strip error:', err)
    } finally {
      setLoading(false)
      if (manual) setTimeout(() => setRefreshing(false), 600)
    }
  }

  useEffect(() => {
    fetchRates()
    const interval = setInterval(() => fetchRates(), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="border-b border-border shadow-sm" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex gap-6 overflow-x-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-5 w-28 shrink-0" />
          ))}
        </div>
      </div>
    )
  }

  const pairs = Object.entries(rates)
  if (pairs.length === 0) return null

  return (
    <div className="border-b border-border shadow-sm" style={{ backgroundColor: 'var(--bg-card)' }}>
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-6 overflow-x-auto scrollbar-none">

        {/* Label — no spinning icon, just the live dot */}
        <span className="text-[10px] text-saffron uppercase tracking-widest shrink-0 font-bold flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-saffron opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-saffron" />
          </span>
          Live Forex
        </span>

        <div className="w-px h-4 bg-border shrink-0" />

        {pairs.map(([pair, rate]) => (
          <div key={pair} className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              {pair.replace('=X', '')}
            </span>
            <span className="text-sm font-bold tracking-widest" style={{ color: 'var(--text-primary)' }}>
              {Number(rate).toFixed(3)}
            </span>
          </div>
        ))}

        {/* Single working refresh button */}
        <button
          onClick={() => fetchRates(true)}
          disabled={refreshing}
          className="ml-auto shrink-0 p-1.5 rounded-lg transition-colors hover:text-saffron"
          style={{ color: 'var(--text-muted)' }}
          title="Refresh forex rates"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin text-saffron' : ''} />
        </button>
      </div>
    </div>
  )
}

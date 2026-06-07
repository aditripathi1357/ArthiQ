import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import IndexCard from '../components/IndexCard'
import { CardSkeleton } from '../components/LoadingSkeleton'
import { getMarketIndices } from '../api/client'

export default function IndicesPage() {
  const [indices, setIndices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMarketIndices()
      .then((res) => setIndices(res.data.indices || []))
      .catch((err) => console.error('Indices error:', err))
      .finally(() => setLoading(false))

    // Auto-refresh every 60s
    const interval = setInterval(() => {
      getMarketIndices()
        .then((res) => setIndices(res.data.indices || []))
        .catch(() => {})
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full px-6 lg:px-10 xl:px-16 py-6">
      {/* Back */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-base font-bold text-text-secondary hover:text-saffron transition-colors mb-6"
      >
        <ArrowLeft size={16} className="stroke-[3px]" />
        Back to Markets
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 size={20} className="text-accent" />
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Market Indices
          </h1>
        </div>
        <p className="text-sm text-text-secondary">
          Live data for all major Indian market indices — Nifty 50, Sensex, sector indices, and more.
        </p>
      </div>

      {/* Indices grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
          : indices.map((idx) => (
              <IndexCard
                key={idx.symbol}
                name={idx.name}
                symbol={idx.symbol}
                value={idx.value}
                change={idx.change}
                changePct={idx.change_pct}
              />
            ))}
      </div>

      {!loading && indices.length === 0 && (
        <div className="glass-card p-8 text-center text-text-secondary text-sm mt-4">
          Index data is loading. Please wait a moment and refresh.
        </div>
      )}
    </div>
  )
}


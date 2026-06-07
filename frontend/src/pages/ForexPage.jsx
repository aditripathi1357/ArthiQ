import { useState, useEffect } from 'react'
import { ArrowLeft, DollarSign, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getForexRates, getINRRates, getForexPair } from '../api/client'
import { CardSkeleton } from '../components/LoadingSkeleton'

const KEY_PAIRS = ['USD-INR', 'EUR-INR', 'GBP-INR']

export default function ForexPage() {
  const [inrRates, setInrRates] = useState({})
  const [allRates, setAllRates] = useState({})
  const [loading, setLoading] = useState(true)
  const [allLoading, setAllLoading] = useState(true)

  const fetchINR = async () => {
    try {
      const res = await getINRRates()
      setInrRates(res.data.rates || {})
    } catch (err) {
      console.error('INR rates error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAll = async () => {
    try {
      const res = await getForexRates('USD')
      setAllRates(res.data.rates || {})
    } catch (err) {
      console.error('All rates error:', err)
    } finally {
      setAllLoading(false)
    }
  }

  useEffect(() => {
    fetchINR()
    fetchAll()
  }, [])

  const usdInr = inrRates['USD-INR']

  return (
    <div className="w-full px-6 lg:px-10 xl:px-16 py-6">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-2 text-base font-bold text-text-secondary hover:text-saffron transition-colors mb-6">
        <ArrowLeft size={16} className="stroke-[3px]" />
        Back to Markets
      </Link>

      {/* Hero */}
      <div className="glass-card p-8 mb-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-accent/5" />
        <div className="relative">
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign size={24} className="text-accent" />
            <h1 className="text-3xl font-bold text-text-primary">Forex Rates</h1>
          </div>
          <p className="text-text-secondary text-sm mb-6">Live exchange rates · Updated from ExchangeRate-API</p>

          {loading ? (
            <div className="skeleton h-16 w-48 mx-auto" />
          ) : usdInr ? (
            <div>
              <span className="text-xs text-text-muted uppercase tracking-wider">USD / INR</span>
              <div className="text-5xl font-extrabold text-text-primary mt-1 tracking-tight">
                ₹{Number(usdInr).toFixed(4)}
              </div>
            </div>
          ) : (
            <p className="text-text-muted">Rate unavailable</p>
          )}
        </div>
      </div>

      {/* Key pairs cards */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          Key INR Pairs
          <button onClick={fetchINR} className="text-text-muted hover:text-accent transition-colors">
            <RefreshCw size={14} />
          </button>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
            : KEY_PAIRS.map((pair) => {
                const rate = inrRates[pair]
                return (
                  <div key={pair} className="glass-card p-6 text-center hover:border-accent/30 transition-all">
                    <div className="text-sm text-text-muted font-medium mb-2">{pair}</div>
                    <div className="text-3xl font-bold text-text-primary tracking-tight">
                      {rate ? `₹${Number(rate).toFixed(4)}` : '—'}
                    </div>
                  </div>
                )
              })}
        </div>
      </section>

      {/* All rates table */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">All USD Rates</h2>
        {allLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => <div key={i} className="skeleton h-8" />)}
          </div>
        ) : Object.keys(allRates).length === 0 ? (
          <div className="glass-card p-6 text-center text-text-muted text-sm">
            No exchange rates available at the moment. Please try again later.
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-600">
                    <th className="text-left py-3 px-4 text-text-muted font-medium">Currency</th>
                    <th className="text-right py-3 px-4 text-text-muted font-medium">Rate (per 1 USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(allRates)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([currency, rate]) => (
                      <tr key={currency} className="border-b border-navy-700/50 hover:bg-navy-800/50 transition-colors">
                        <td className="py-2.5 px-4 font-medium text-text-primary">{currency}</td>
                        <td className="py-2.5 px-4 text-right text-text-secondary font-mono">
                          {Number(rate).toFixed(4)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}


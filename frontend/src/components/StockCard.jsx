import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function StockCard({ symbol, name, price, change, changePct, loading }) {
  const navigate = useNavigate()
  const isPositive = change > 0
  const isNegative = change < 0

  if (loading) {
    return (
      <div className="glass-card p-5 space-y-3 animate-pulse">
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-8 w-1/2" />
        <div className="skeleton h-3 w-1/3" />
      </div>
    )
  }

  return (
    <div
      onClick={() => navigate(`/company/${symbol}`)}
      className={`glass-card p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-accent/40 group ${
        isPositive ? 'border-l-2 border-l-positive' : isNegative ? 'border-l-2 border-l-negative' : 'border-l-2 border-l-navy-500'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
            {name || symbol}
          </h3>
          <span className="text-xs text-text-muted font-mono">{symbol}</span>
        </div>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
          isPositive ? 'bg-positive/10' : isNegative ? 'bg-negative/10' : 'bg-navy-600'
        }`}>
          {isPositive ? <TrendingUp size={14} className="text-positive" /> :
           isNegative ? <TrendingDown size={14} className="text-negative" /> :
           <Minus size={14} className="text-text-muted" />}
        </div>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-text-primary tracking-tight">
          {price != null ? `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
        </span>
      </div>

      {/* Change */}
      <div className="mt-1 flex items-center gap-2">
        <span className={`text-sm font-semibold ${
          isPositive ? 'text-positive' : isNegative ? 'text-negative' : 'text-text-muted'
        }`}>
          {change != null ? `${isPositive ? '+' : ''}${change.toFixed(2)}` : '—'}
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
          isPositive ? 'bg-positive/10 text-positive' :
          isNegative ? 'bg-negative/10 text-negative' :
          'bg-navy-600 text-text-muted'
        }`}>
          {changePct != null ? `${isPositive ? '+' : ''}${changePct.toFixed(2)}%` : '—'}
        </span>
      </div>
    </div>
  )
}

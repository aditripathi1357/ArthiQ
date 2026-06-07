import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/**
 * Index display card — used in the full-width indices strip and indices page.
 * compact mode: tighter padding, shown in the sticky strip
 */
export default function IndexCard({ name, symbol, value, change, changePct, compact = false }) {
  const isPositive = change > 0
  const isNegative = change < 0

  const borderColor = isPositive
    ? 'border-positive/25 hover:border-positive/50'
    : isNegative
    ? 'border-negative/25 hover:border-negative/50'
    : 'border-border hover:border-saffron/30'

  const valueBg = isPositive
    ? 'bg-positive/4'
    : isNegative
    ? 'bg-negative/4'
    : ''

  return (
    <div
      className={`
        shrink-0 rounded-xl border transition-all duration-200 cursor-default select-none
        ${compact ? 'px-3.5 py-2.5 min-w-[130px]' : 'p-5'}
        ${borderColor} ${valueBg}
        bg-bg-card hover:shadow-md
      `}
    >
      {/* Name row */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h3 className={`font-bold text-text-secondary truncate ${compact ? 'text-[10px] uppercase tracking-wide' : 'text-sm'}`}>
          {name}
        </h3>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
          isPositive ? 'bg-positive/12' : isNegative ? 'bg-negative/12' : 'bg-bg-secondary'
        }`}>
          {isPositive
            ? <TrendingUp  size={10} className="text-positive" />
            : isNegative
            ? <TrendingDown size={10} className="text-negative" />
            : <Minus size={9} className="text-text-muted" />}
        </div>
      </div>

      {/* Value */}
      <div className={`font-extrabold text-text-primary tracking-tight leading-none ${compact ? 'text-base' : 'text-2xl'}`}>
        {value != null
          ? value.toLocaleString('en-IN', { maximumFractionDigits: 2 })
          : '—'}
      </div>

      {/* Change row */}
      <div className="flex items-center gap-1.5 mt-1.5">
        {change != null && (
          <span className={`text-[11px] font-semibold ${
            isPositive ? 'text-positive' : isNegative ? 'text-negative' : 'text-text-muted'
          }`}>
            {isPositive ? '+' : ''}{change.toFixed(2)}
          </span>
        )}
        {changePct != null && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
            isPositive
              ? 'bg-positive/10 text-positive'
              : isNegative
              ? 'bg-negative/10 text-negative'
              : 'bg-bg-secondary text-text-muted'
          }`}>
            {isPositive ? '+' : ''}{changePct.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  )
}

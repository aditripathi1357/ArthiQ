import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Minus, ArrowUpDown } from 'lucide-react'

/**
 * Reusable sortable stock table component.
 * Used by Dashboard (top movers), StocksListPage, and sector drill-down.
 */
export default function StockTable({
  stocks = [],
  loading = false,
  onSort,
  sortBy,
  sortOrder,
  compact = false,
  showRank = false,
}) {
  const navigate = useNavigate()

  const columns = [
    ...(showRank ? [{ key: '#', label: '#', sortable: false, width: 'w-10' }] : []),
    { key: 'symbol', label: 'Symbol', sortable: true, width: 'w-28' },
    { key: 'name', label: 'Company', sortable: true, width: 'flex-1 min-w-[120px]' },
    { key: 'price', label: 'Price', sortable: true, width: 'w-24 text-right' },
    { key: 'change', label: 'Change', sortable: true, width: 'w-24 text-right' },
    { key: 'change_pct', label: 'Chg%', sortable: true, width: 'w-20 text-right' },
    ...(!compact ? [{ key: 'volume', label: 'Volume', sortable: true, width: 'w-28 text-right hidden sm:table-cell' }] : []),
  ]

  const handleSort = (key) => {
    if (!onSort) return
    if (sortBy === key) {
      onSort(key, sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(key, key === 'price' || key === 'change_pct' || key === 'volume' ? 'desc' : 'asc')
    }
  }

  if (loading) {
    return (
      <div className="glass-card overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-8" />
          ))}
        </div>
      </div>
    )
  }

  if (!stocks || stocks.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-text-secondary text-sm">
        No stock data available yet. Market data is loading...
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-600">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-3 text-text-muted font-medium text-xs uppercase tracking-wider ${col.width} ${
                    col.sortable ? 'cursor-pointer hover:text-accent transition-colors select-none' : ''
                  } ${col.key === 'name' ? 'text-left' : ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortBy === col.key && (
                      <ArrowUpDown size={10} className="text-accent" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock, i) => {
              const isPositive = stock.change > 0
              const isNegative = stock.change < 0

              return (
                <tr
                  key={stock.symbol || i}
                  onClick={() => navigate(`/company/${stock.symbol}`)}
                  className="border-b border-navy-700/50 hover:bg-navy-800/60 transition-colors cursor-pointer group"
                >
                  {showRank && (
                    <td className="py-2.5 px-3 text-text-muted text-xs">{i + 1}</td>
                  )}

                  {/* Symbol */}
                  <td className="py-2.5 px-3">
                    <span className="font-mono text-xs font-semibold text-accent group-hover:text-text-primary transition-colors">
                      {stock.symbol?.replace('.NS', '').replace('.BO', '') || '—'}
                    </span>
                  </td>

                  {/* Name */}
                  <td className="py-2.5 px-3">
                    <span className="text-text-primary text-xs font-medium truncate block max-w-[200px]">
                      {stock.name || stock.symbol || '—'}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="py-2.5 px-3 text-right">
                    <span className="text-text-primary font-semibold text-xs">
                      {stock.price != null
                        ? `₹${stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                        : '—'}
                    </span>
                  </td>

                  {/* Change */}
                  <td className="py-2.5 px-3 text-right">
                    <span className={`text-xs font-semibold ${
                      isPositive ? 'text-positive' : isNegative ? 'text-negative' : 'text-text-muted'
                    }`}>
                      {stock.change != null
                        ? `${isPositive ? '+' : ''}${stock.change.toFixed(2)}`
                        : '—'}
                    </span>
                  </td>

                  {/* Change % */}
                  <td className="py-2.5 px-3 text-right">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isPositive ? 'bg-positive/10 text-positive'
                        : isNegative ? 'bg-negative/10 text-negative'
                        : 'bg-navy-600 text-text-muted'
                    }`}>
                      {stock.change_pct != null
                        ? `${isPositive ? '+' : ''}${stock.change_pct.toFixed(2)}%`
                        : '—'}
                    </span>
                  </td>

                  {/* Volume */}
                  {!compact && (
                    <td className="py-2.5 px-3 text-right hidden sm:table-cell">
                      <span className="text-text-secondary text-xs font-mono">
                        {stock.volume != null
                          ? Number(stock.volume).toLocaleString('en-IN')
                          : '—'}
                      </span>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

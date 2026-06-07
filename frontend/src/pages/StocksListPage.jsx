import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Search, ChevronLeft, ChevronRight, ListFilter,
  TrendingUp, TrendingDown, BarChart2, RefreshCw, AlertTriangle,
  ChevronUp, ChevronDown, Filter, X
} from 'lucide-react'
import { getAllStocks, getMarketSectors, clearCache } from '../api/client'
import { getLogoUrl } from '../utils/logoUtils'

// ── Sector → keyword map (matches NSE company names via backend search) ───────
const SECTOR_KEYWORD_MAP = {
  'Banking & Finance':      'bank',
  'Information Technology': 'tech',
  'Pharmaceuticals':        'pharma',
  'Automobile':             'motor',
  'FMCG':                   'foods',
  'Energy & Power':         'power',
  'Metals & Mining':        'steel',
  'Infrastructure':         'infra',
  'Real Estate':            'realty',
  'Chemicals':              'chem',
  'Textiles':               'textile',
  'Healthcare':             'health',
  'Telecom':                'telecom',
  'Media & Entertainment':  'media',
  'Agriculture':            'agro',
}

// ── CompanyLogo ───────────────────────────────────────────────────────────────
function CompanyLogo({ symbol, name, size = 32 }) {
  const [err, setErr] = useState(false)
  const url = getLogoUrl(symbol)
  const initial = (name || symbol || 'S').charAt(0).toUpperCase()

  return (
    <div
      className="rounded-lg overflow-hidden bg-bg-secondary flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {url && !err ? (
        <img src={url} alt={symbol} loading="lazy" onError={() => setErr(true)} className="w-full h-full object-contain" />
      ) : (
        <span className="font-extrabold text-saffron" style={{ fontSize: size * 0.42 }}>{initial}</span>
      )}
    </div>
  )
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmt(n, digits = 2) {
  if (n == null) return '—'
  return n.toLocaleString('en-IN', { maximumFractionDigits: digits })
}
function fmtPrice(n) {
  if (n == null) return '—'
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtVol(v) {
  if (!v) return '—'
  if (v >= 1e7) return `${(v / 1e7).toFixed(1)} Cr`
  if (v >= 1e5) return `${(v / 1e5).toFixed(1)} L`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)} K`
  return String(v)
}

// ── Sort header ───────────────────────────────────────────────────────────────
function SortTh({ label, sortKey, currentSort, currentOrder, onSort }) {
  const active = currentSort === sortKey
  const next   = active && currentOrder === 'asc' ? 'desc' : 'asc'
  return (
    <th
      onClick={() => onSort(sortKey, next)}
      className="px-4 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wider cursor-pointer hover:text-saffron select-none whitespace-nowrap transition-colors group"
    >
      <div className="flex items-center gap-1">
        {label}
        <span className={`transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
          {active && currentOrder === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </span>
      </div>
    </th>
  )
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-border/50">
      <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="skeleton w-8 h-8 rounded-lg" /><div className="space-y-1.5"><div className="skeleton h-3 w-20" /><div className="skeleton h-2.5 w-28" /></div></div></td>
      <td className="px-4 py-3"><div className="skeleton h-3 w-16" /></td>
      <td className="px-4 py-3"><div className="skeleton h-3 w-14" /></td>
      <td className="px-4 py-3"><div className="skeleton h-3 w-14" /></td>
      <td className="px-4 py-3 hidden sm:table-cell"><div className="skeleton h-3 w-14" /></td>
      <td className="px-4 py-3 hidden md:table-cell"><div className="skeleton h-3 w-18" /></td>
    </tr>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════
export default function StocksListPage() {
  const navigate = useNavigate()

  const [stocks,     setStocks]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [page,       setPage]       = useState(1)
  const [perPage]                   = useState(50)
  const [total,      setTotal]      = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [search,      setSearch]      = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [sortBy,      setSortBy]      = useState('symbol')
  const [sortOrder,   setSortOrder]   = useState('asc')

  // Sector filter
  const [sectors,        setSectors]        = useState([])
  const [selectedSector, setSelectedSector] = useState('')
  const [sectorOpen,     setSectorOpen]     = useState(false)

  // ── Fetch sectors ──────────────────────────────────────────────────────────
  useEffect(() => {
    getMarketSectors()
      .then(res => setSectors(res.data.sectors || []))
      .catch(() => {})
  }, [])

  // ── Fetch stocks ───────────────────────────────────────────────────────────
  const fetchStocks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await getAllStocks(page, perPage, search || undefined, sortBy, sortOrder)
      const data = res.data
      setStocks(data.stocks || [])
      setTotal(data.total || 0)
      setTotalPages(data.total_pages || 0)
    } catch (err) {
      console.error('Stocks fetch error:', err)
      setError('Failed to load stocks. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [page, perPage, search, sortBy, sortOrder])

  useEffect(() => {
    fetchStocks()
  }, [fetchStocks])

  // ── Sector select → maps to a backend search keyword ──────────────────────
  const handleSectorSelect = (sectorName) => {
    setSelectedSector(sectorName)
    setSectorOpen(false)
    setPage(1)
    if (!sectorName) {
      setSearch('')
      setSearchInput('')
    } else {
      const keyword = SECTOR_KEYWORD_MAP[sectorName] || sectorName.split(/\s/)[0].toLowerCase()
      setSearch(keyword)
      setSearchInput(keyword)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setSelectedSector('')  // clear sector badge on manual search
    setPage(1)
  }

  const handleSort = (key, order) => {
    setSortBy(key)
    setSortOrder(order)
  }

  const clearSearch = () => {
    setSearch('')
    setSearchInput('')
    setSelectedSector('')
    setPage(1)
  }

  const startIndex = (page - 1) * perPage + 1
  const endIndex   = Math.min(page * perPage, total)

  // ── Change color ───────────────────────────────────────────────────────────
  const changeCls = (v) =>
    v == null  ? 'text-text-muted'
    : v > 0    ? 'text-positive font-semibold'
    : v < 0    ? 'text-negative font-semibold'
               : 'text-text-muted'

  return (
    <div className="w-full px-6 lg:px-10 xl:px-16 py-6">

      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-2 text-base font-bold text-text-secondary hover:text-saffron transition-colors mb-6">
        <ArrowLeft size={16} className="stroke-[3px]" /> Back to Markets
      </Link>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <ListFilter size={22} className="text-saffron" />
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">All NSE Stocks</h1>
          {total > 0 && (
            <span className="text-xs text-saffron bg-saffron/10 border border-saffron/20 px-2.5 py-1 rounded-full font-bold">
              {total.toLocaleString()} listed
            </span>
          )}
        </div>
        <p className="text-sm text-text-secondary">
          Browse all NSE-listed companies with live prices. Click any row to view full details.
        </p>
      </div>

      {/* ── Controls bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by symbol or company name…"
              className="w-full pl-9 pr-10 py-2.5 bg-bg-card border border-border rounded-xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/20 transition-all"
            />
            {searchInput && (
              <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        </form>

        {/* Sector filter dropdown */}
        <div className="relative">
          <button
            onClick={() => setSectorOpen(!sectorOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              selectedSector
                ? 'bg-saffron/10 border-saffron/40 text-saffron'
                : 'bg-bg-card border-border text-text-secondary hover:border-saffron/30 hover:text-text-primary'
            }`}
          >
            <Filter size={14} />
            {selectedSector || 'All Sectors'}
            <ChevronDown size={13} className={`transition-transform ${sectorOpen ? 'rotate-180' : ''}`} />
          </button>

          {sectorOpen && (
            <div className="absolute right-0 top-full mt-1 bg-bg-card border border-border rounded-xl shadow-2xl z-50 py-1 min-w-[220px] max-h-72 overflow-y-auto">
              {/* All Sectors option */}
              <button
                onClick={() => handleSectorSelect('')}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-bg-secondary transition-colors ${!selectedSector ? 'text-saffron font-bold' : 'text-text-secondary'}`}
              >
                All Sectors
              </button>
              <div className="border-t border-border my-1" />
              {sectors.length === 0 ? (
                <div className="px-4 py-2">
                  {Object.keys(SECTOR_KEYWORD_MAP).map(s => (
                    <button
                      key={s}
                      onClick={() => handleSectorSelect(s)}
                      className={`w-full text-left px-0 py-2 text-sm hover:text-saffron transition-colors ${selectedSector === s ? 'text-saffron font-bold' : 'text-text-secondary'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : sectors.map(s => (
                <button
                  key={s.name}
                  onClick={() => handleSectorSelect(s.name)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-bg-secondary transition-colors flex justify-between items-center ${
                    selectedSector === s.name ? 'text-saffron font-bold' : 'text-text-secondary'
                  }`}
                >
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Refresh */}
        <button
          onClick={() => { clearCache(); fetchStocks() }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-card text-sm font-semibold text-text-secondary hover:text-saffron hover:border-saffron/30 disabled:opacity-60 transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Active filters */}
      {(search || selectedSector) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedSector && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-saffron/10 border border-saffron/20 text-saffron px-2.5 py-1 rounded-full font-semibold">
              Sector: {selectedSector}
              <button onClick={() => handleSectorSelect('')}><X size={11} /></button>
            </span>
          )}
          {search && !selectedSector && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-saffron/10 border border-saffron/20 text-saffron px-2.5 py-1 rounded-full font-semibold">
              Search: "{search}"
              <button onClick={clearSearch}><X size={11} /></button>
            </span>
          )}
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="glass-card p-8 text-center mb-6">
          <AlertTriangle size={36} className="text-negative mx-auto mb-3" />
          <p className="text-sm text-text-secondary mb-4">{error}</p>
          <button onClick={fetchStocks} className="px-5 py-2 bg-saffron text-bg-primary text-sm font-bold rounded-lg hover:bg-saffron/90 transition-colors">
            Try Again
          </button>
        </div>
      )}

      {/* ── Stock Table ───────────────────────────────────────────────────────── */}
      {!error && (
        <div className="glass-card overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-secondary/50 border-b border-border">
                <tr>
                  <SortTh label="Company"    sortKey="name"       currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  <SortTh label="Price"      sortKey="price"      currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  <SortTh label="Change"     sortKey="change_pct" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">Day Range</th>
                  <SortTh label="Volume"     sortKey="volume"     currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wider hidden md:table-cell">Prev Close</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/50">
                {loading
                  ? Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} />)
                  : stocks.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-16 text-center">
                        <BarChart2 size={40} className="text-text-muted/30 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-text-secondary mb-1">
                          {search ? `No stocks matching "${search}"` : 'No market data available yet'}
                        </p>
                        <p className="text-xs text-text-muted">
                          {search ? 'Try a different search term or sector.' : 'Market data loads on startup. Please wait a moment.'}
                        </p>
                      </td>
                    </tr>
                  )
                  : stocks.map(stock => {
                    const isPos = (stock.change_pct ?? 0) > 0
                    const isNeg = (stock.change_pct ?? 0) < 0
                    return (
                      <tr
                        key={stock.symbol}
                        onClick={() => navigate(`/company/${stock.symbol}`)}
                        className="hover:bg-saffron/5 cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-[180px]">
                            <CompanyLogo symbol={stock.symbol} name={stock.name} size={34} />
                            <div>
                              <div className="text-sm font-bold text-text-primary group-hover:text-saffron transition-colors leading-tight">
                                {stock.symbol.replace('.NS', '').replace('.BO', '')}
                              </div>
                              <div className="text-[11px] text-text-muted truncate max-w-[160px] leading-tight">
                                {stock.name || '—'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-bold text-sm text-text-primary whitespace-nowrap">
                          {fmtPrice(stock.price)}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {stock.change_pct != null ? (
                            <div className={`flex items-center gap-1 text-sm ${changeCls(stock.change_pct)}`}>
                              {isPos ? <TrendingUp size={13} /> : isNeg ? <TrendingDown size={13} /> : null}
                              <span>{isPos ? '+' : ''}{fmt(stock.change_pct)}%</span>
                            </div>
                          ) : <span className="text-text-muted text-sm">—</span>}
                          {stock.change != null && (
                            <div className={`text-[11px] ${changeCls(stock.change)}`}>
                              {isPos ? '+' : ''}{fmt(stock.change)}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                          {stock.low != null && stock.high != null
                            ? <span>₹{fmt(stock.low)} <span className="text-text-muted">–</span> ₹{fmt(stock.high)}</span>
                            : '—'}
                        </td>

                        <td className="px-4 py-3 text-sm text-text-secondary hidden sm:table-cell whitespace-nowrap">
                          {fmtVol(stock.volume)}
                        </td>

                        <td className="px-4 py-3 text-sm text-text-secondary hidden md:table-cell whitespace-nowrap">
                          {fmtPrice(stock.previous_close)}
                        </td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────────────── */}
      {!error && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">
            Showing <span className="text-text-secondary font-semibold">{startIndex}–{endIndex}</span> of{' '}
            <span className="text-text-secondary font-semibold">{total.toLocaleString()}</span> stocks
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg bg-bg-card border border-border text-text-secondary hover:text-saffron hover:border-saffron/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p
                if (totalPages <= 5) p = i + 1
                else if (page <= 3) p = i + 1
                else if (page >= totalPages - 2) p = totalPages - 4 + i
                else p = page - 2 + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 text-xs font-bold rounded-lg transition-all ${
                      p === page
                        ? 'bg-saffron text-white'
                        : 'bg-bg-card border border-border text-text-secondary hover:text-saffron hover:border-saffron/30'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg bg-bg-card border border-border text-text-secondary hover:text-saffron hover:border-saffron/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Click-outside to close dropdown */}
      {sectorOpen && <div className="fixed inset-0 z-40" onClick={() => setSectorOpen(false)} />}
    </div>
  )
}

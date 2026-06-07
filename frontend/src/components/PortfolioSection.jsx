import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, X, RefreshCw, PlusCircle, FlaskConical,
  ChevronUp, ChevronDown, Minus, ArrowUpRight,
  TrendingUp, TrendingDown, Zap, BarChart2, ChevronsUpDown
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getStockQuote, searchCompanies, addToResearchList, removeFromResearchList } from '../api/client'
import { getAvatarColors, getLogoUrl } from '../utils/logoUtils'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n, d = 2) {
  if (n == null || isNaN(n)) return '—'
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d })
}
function fmtBig(n) {
  if (!n || isNaN(n)) return '—'
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e7)  return `${(n / 1e7).toFixed(2)}Cr`
  if (n >= 1e5)  return `${(n / 1e5).toFixed(1)}L`
  return fmt(n, 0)
}
function fmtVol(v) {
  if (!v) return '—'
  if (v >= 1e7) return `${(v / 1e7).toFixed(2)}Cr`
  if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return String(v)
}

// ── Stock Logo ────────────────────────────────────────────────────────────────
function StockAvatar({ symbol, size = 8 }) {
  const logoUrl = getLogoUrl(symbol)
  const [err, setErr] = useState(false)
  const { from, to } = getAvatarColors(symbol)
  const initial = symbol.replace('.NS', '').replace('.BO', '').charAt(0)
  const cls = `w-${size} h-${size} rounded-lg shrink-0`
  if (logoUrl && !err) {
    return (
      <div className={`${cls} overflow-hidden bg-bg-secondary flex items-center justify-center ring-1 ring-border`}>
        <img src={logoUrl} alt="" loading="lazy" onError={() => setErr(true)} className="w-full h-full object-contain" />
      </div>
    )
  }
  return (
    <div className={`${cls} flex items-center justify-center font-extrabold text-white text-xs`}
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}>
      {initial}
    </div>
  )
}

// ── Add Stock Modal ───────────────────────────────────────────────────────────
function AddStockModal({ onClose, onAdd, existing }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding]   = useState(null)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchCompanies(query)
        setResults((res.data.results || []).filter(r => !existing.includes(r.symbol)))
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 280)
    return () => clearTimeout(t)
  }, [query, existing])

  const handleAdd = async (stock) => {
    setAdding(stock.symbol)
    setError(null)
    try {
      await onAdd(stock.symbol, stock.name)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to add stock to research list.')
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-in" style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 24px 64px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Modal header */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '20px 20px 16px' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={{ background: 'rgba(255,153,51,0.2)', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Search size={16} color="#FF9933" />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: '-0.2px' }}>Add to Research List</div>
                <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 1 }}>Search NSE-listed companies</div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <X size={15} />
            </button>
          </div>

          {/* Search field */}
          <div style={{ marginTop: 16, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Company name or ticker symbol…"
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                paddingLeft: 36, paddingRight: 36, paddingTop: 10, paddingBottom: 10,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none',
                fontFamily: 'inherit', caretColor: '#FF9933'
              }}
            />
            {searching && <RefreshCw size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#FF9933', animation: 'spin 1s linear infinite' }} />}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            background: '#fee2e2',
            borderBottom: '1px solid #fca5a5',
            color: '#b91c1c',
            padding: '10px 20px',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10
          }}>
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>×</button>
          </div>
        )}

        {/* Results */}
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {query.length < 2 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Type at least 2 characters to search
            </div>
          ) : !searching && results.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              No results for "<strong style={{ color: '#475569' }}>{query}</strong>"
            </div>
          ) : (
            results.map(r => {
              const { from, to } = getAvatarColors(r.symbol)
              const initial = (r.name || r.symbol).charAt(0)
              return (
                <button
                  key={r.symbol}
                  onClick={() => handleAdd(r)}
                  disabled={adding === r.symbol}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 20px', background: 'none', border: 'none',
                    borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                    textAlign: 'left', transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,153,51,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${from}, ${to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 13, flexShrink: 0 }}>
                    {initial}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{r.symbol.replace('.NS','').replace('.BO','')} · NSE</div>
                  </div>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: adding === r.symbol ? 'rgba(255,153,51,0.15)' : '#f8fafc',
                    border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {adding === r.symbol
                      ? <RefreshCw size={12} style={{ color: '#FF9933', animation: 'spin 1s linear infinite' }} />
                      : <PlusCircle size={13} style={{ color: '#94a3b8' }} />}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ── 52W Range Bar ─────────────────────────────────────────────────────────────
function RangeBar({ low, high, current }) {
  if (!low || !high || !current) return <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
  const pct = Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
      <div style={{ display: 'flex', gap: 6, fontSize: 10, fontWeight: 600 }}>
        <span style={{ color: '#dc2626' }}>{fmt(low)}</span>
        <span style={{ color: '#94a3b8' }}>–</span>
        <span style={{ color: '#16a34a' }}>{fmt(high)}</span>
      </div>
      <div style={{ width: 72, height: 4, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
        {/* gradient track */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #fef2f2, #f0fdf4)', borderRadius: 99 }} />
        {/* thumb line */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${pct}%`, width: 2, marginLeft: -1,
          background: '#FF9933', borderRadius: 99,
          boxShadow: '0 0 4px rgba(255,153,51,0.6)'
        }} />
      </div>
    </div>
  )
}

// ── Sortable column header ────────────────────────────────────────────────────
function SortHeader({ label, field, sortBy, sortDir, onSort, align = 'right' }) {
  const active = sortBy === field
  return (
    <th
      onClick={() => onSort(field)}
      style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
        color: active ? '#FF9933' : '#94a3b8', padding: '10px 14px', background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0', cursor: 'pointer', userSelect: 'none',
        textAlign: align, whiteSpace: 'nowrap', transition: 'color 0.15s'
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        {active
          ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
          : <ChevronsUpDown size={10} style={{ opacity: 0.4 }} />}
      </span>
    </th>
  )
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════
export default function PortfolioSection({ user }) {
  const [entries, setEntries]   = useState([])
  const [quotes, setQuotes]     = useState({})
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal]   = useState(false)
  const [removing, setRemoving]     = useState(null)
  const [sortBy, setSortBy]         = useState('change_pct')
  const [sortDir, setSortDir]       = useState('desc')
  const [filter, setFilter]         = useState('')

  const loadEntries = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('portfolios').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (!error && data) {
      setEntries(data)
      // Background auto-sync to backend notifications research list
      data.forEach(entry => {
        addToResearchList(user.id, entry.symbol, entry.name).catch(() => {})
      })
    }
    setLoading(false)
  }, [user])

  useEffect(() => { loadEntries() }, [loadEntries])

  const fetchQuotes = useCallback(async (silent = false) => {
    if (!entries.length) return
    if (!silent) setRefreshing(true)
    try {
      const results = await Promise.allSettled(entries.map(e => getStockQuote(e.symbol)))
      const map = {}
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') map[entries[i].symbol] = r.value.data
      })
      setQuotes(map)
    } catch {}
    finally { setRefreshing(false) }
  }, [entries])

  useEffect(() => { if (entries.length) fetchQuotes(true) }, [entries])

  const handleAdd = async (symbol, name) => {
    const { error } = await supabase.from('portfolios').upsert({
      user_id: user.id, symbol, name: name || symbol, quantity: 0, avg_buy_price: 0,
    }, { onConflict: 'user_id,symbol' })
    if (error) throw new Error(error.message)

    // Sync with backend notification research list
    try {
      await addToResearchList(user.id, symbol, name)
    } catch (err) {
      console.error("Failed to sync add to backend research list:", err)
    }

    await loadEntries()
  }

  const handleRemove = async (symbol) => {
    setRemoving(symbol)
    await supabase.from('portfolios').delete().eq('user_id', user.id).eq('symbol', symbol)

    // Sync with backend notification research list
    try {
      await removeFromResearchList(user.id, symbol)
    } catch (err) {
      console.error("Failed to sync remove from backend research list:", err)
    }

    setEntries(prev => prev.filter(e => e.symbol !== symbol))
    setRemoving(null)
  }

  const handleSort = (field) => {
    setSortDir(sortBy === field && sortDir === 'desc' ? 'asc' : 'desc')
    setSortBy(field)
  }

  // Sorted + filtered rows
  const rows = useMemo(() => {
    let list = entries.map(e => ({ ...e, q: quotes[e.symbol] || null }))
    if (filter.trim()) {
      const f = filter.toLowerCase()
      list = list.filter(r =>
        r.symbol.toLowerCase().includes(f) || (r.name || '').toLowerCase().includes(f)
      )
    }
    list.sort((a, b) => {
      const aVal = a.q?.[sortBy] ?? (sortDir === 'asc' ? Infinity : -Infinity)
      const bVal = b.q?.[sortBy] ?? (sortDir === 'asc' ? Infinity : -Infinity)
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
    return list
  }, [entries, quotes, sortBy, sortDir, filter])

  // Summary stats
  const loaded = entries.filter(e => quotes[e.symbol]?.price || quotes[e.symbol]?.close)
  const gainers = loaded.filter(e => (quotes[e.symbol]?.change_pct ?? 0) > 0).length
  const losers  = loaded.filter(e => (quotes[e.symbol]?.change_pct ?? 0) < 0).length
  const avgChg  = loaded.length
    ? loaded.reduce((s, e) => s + (quotes[e.symbol]?.change_pct ?? 0), 0) / loaded.length
    : null

  if (!user) return null

  return (
    <>
      <section style={{ marginBottom: 24 }}>

        {/* ── Panel wrapper ── */}
        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>

          {/* ── Dark header bar ── */}
          <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1a2744 100%)', padding: '14px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>

              {/* Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,153,51,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FlaskConical size={15} color="#FF9933" />
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '-0.2px' }}>Research List</div>
                  <div style={{ color: '#64748b', fontSize: 10, marginTop: 1, fontWeight: 500 }}>
                    {entries.length} stocks tracked
                  </div>
                </div>
              </div>

              {/* Divider */}
              {entries.length > 0 && loaded.length > 0 && (
                <>
                  <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

                  {/* Stats pills */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 8, padding: '4px 10px' }}>
                      <TrendingUp size={12} color="#16a34a" />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80' }}>{gainers}</span>
                      <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 500 }}>Gaining</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '4px 10px' }}>
                      <TrendingDown size={12} color="#dc2626" />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>{losers}</span>
                      <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 500 }}>Declining</span>
                    </div>
                    {avgChg != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,153,51,0.12)', border: '1px solid rgba(255,153,51,0.2)', borderRadius: 8, padding: '4px 10px' }}>
                        <BarChart2 size={12} color="#FF9933" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: avgChg >= 0 ? '#4ade80' : '#f87171' }}>
                          {avgChg >= 0 ? '+' : ''}{avgChg.toFixed(2)}%
                        </span>
                        <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 500 }}>Avg</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Right actions */}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Search filter */}
                {entries.length > 0 && (
                  <div style={{ position: 'relative' }}>
                    <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      value={filter}
                      onChange={e => setFilter(e.target.value)}
                      placeholder="Filter…"
                      style={{
                        paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6,
                        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none',
                        width: 110, fontFamily: 'inherit'
                      }}
                    />
                  </div>
                )}

                {/* Refresh */}
                {entries.length > 0 && (
                  <button
                    onClick={() => fetchQuotes(false)}
                    disabled={refreshing}
                    title="Refresh live data"
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: refreshing ? '#FF9933' : '#94a3b8', transition: 'all 0.2s'
                    }}
                  >
                    <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                  </button>
                )}

                {/* Add button */}
                <button
                  onClick={() => setShowModal(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8,
                    background: '#FF9933', border: 'none', cursor: 'pointer',
                    color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                    boxShadow: '0 2px 8px rgba(255,153,51,0.35)', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#e6830a'}
                  onMouseLeave={e => e.currentTarget.style.background = '#FF9933'}
                >
                  <PlusCircle size={13} /> Add Stock
                </button>
              </div>
            </div>
          </div>

          {/* ── Body ── */}
          {loading ? (
            <div style={{ background: '#fff', padding: '0' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                  <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', gap: 24 }}>
                    <div style={{ width: 120 }}><div className="skeleton" style={{ height: 12, borderRadius: 4, marginBottom: 6 }} /><div className="skeleton" style={{ height: 10, width: 70, borderRadius: 4 }} /></div>
                    {[80, 60, 60, 80, 50, 90].map((w, j) => <div key={j} className="skeleton" style={{ height: 14, width: w, borderRadius: 4 }} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            /* Empty state */
            <div style={{ background: '#fff', padding: '56px 20px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,153,51,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <FlaskConical size={26} color="#FF9933" />
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 8 }}>Build Your Research List</div>
              <div style={{ color: '#64748b', fontSize: 13, maxWidth: 380, margin: '0 auto 24px', lineHeight: 1.6 }}>
                Add stocks you're analyzing. Track live price, day change, 52-week range, volume, market cap and P/E — pure analysis, no trading.
              </div>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 22px', borderRadius: 10, background: '#FF9933',
                  border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13,
                  fontWeight: 700, fontFamily: 'inherit',
                  boxShadow: '0 4px 16px rgba(255,153,51,0.35)'
                }}
              >
                <PlusCircle size={15} /> Add Your First Stock
              </button>
            </div>
          ) : (
            /* Data table */
            <div style={{ background: '#fff', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', whiteSpace: 'nowrap' }}>
                      Company
                    </th>
                    <SortHeader label="LTP" field="price" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Chg %" field="change_pct" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Chg ₹" field="change" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Volume" field="volume" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Mkt Cap" field="market_cap" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="P/E" field="pe_ratio" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <th style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      52W Range
                    </th>
                    <th style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '32px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                        No stocks match "<strong>{filter}</strong>"
                      </td>
                    </tr>
                  ) : rows.map((row, idx) => {
                    const q = row.q
                    const isPos = (q?.change_pct ?? 0) > 0
                    const isNeg = (q?.change_pct ?? 0) < 0
                    const sym = row.symbol.replace('.NS', '').replace('.BO', '')
                    const { from, to } = getAvatarColors(row.symbol)
                    const logoUrl = getLogoUrl(row.symbol)

                    return (
                      <tr
                        key={row.symbol}
                        style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,153,51,0.025)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Company */}
                        <td style={{ padding: '12px 20px' }}>
                          <Link to={`/company/${row.symbol}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                            <div style={{ width: 34, height: 34, borderRadius: 9, overflow: 'hidden', background: `linear-gradient(135deg, ${from}, ${to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 12, flexShrink: 0, border: '1px solid #e2e8f0' }}>
                              {logoUrl ? (
                                <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                  onError={e => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = sym.charAt(0) }} />
                              ) : sym.charAt(0)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 4 }}>
                                {sym}
                                <ArrowUpRight size={11} style={{ color: '#94a3b8', flexShrink: 0 }} />
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                                {row.name || sym}
                              </div>
                            </div>
                          </Link>
                        </td>

                        {/* LTP */}
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          {(q?.price || q?.close)
                            ? <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>₹{fmt(q.price || q.close)}</span>
                            : <div className="skeleton" style={{ height: 14, width: 56, marginLeft: 'auto', borderRadius: 4 }} />}
                        </td>

                        {/* Chg % */}
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          {q?.change_pct != null ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 2,
                              fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                              background: isPos ? 'rgba(22,163,74,0.1)' : isNeg ? 'rgba(220,38,38,0.1)' : 'rgba(100,116,139,0.1)',
                              color: isPos ? '#16a34a' : isNeg ? '#dc2626' : '#64748b',
                              fontVariantNumeric: 'tabular-nums'
                            }}>
                              {isPos ? <ChevronUp size={11}/> : isNeg ? <ChevronDown size={11}/> : <Minus size={11}/>}
                              {isPos?'+':''}{fmt(q.change_pct)}%
                            </span>
                          ) : <div className="skeleton" style={{ height: 22, width: 52, marginLeft: 'auto', borderRadius: 6 }} />}
                        </td>

                        {/* Chg ₹ */}
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: isPos ? '#16a34a' : isNeg ? '#dc2626' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                          {q?.change != null ? `${isPos?'+':''}₹${fmt(q.change)}` : '—'}
                        </td>

                        {/* Volume */}
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 12, color: '#475569', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                          {q?.volume ? fmtVol(q.volume) : <span style={{ color: '#cbd5e1' }}>—</span>}
                        </td>

                        {/* Mkt Cap */}
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 12, color: '#475569', fontWeight: 500 }}>
                          {q?.market_cap ? `₹${fmtBig(q.market_cap)}` : <span style={{ color: '#cbd5e1' }}>—</span>}
                        </td>

                        {/* P/E */}
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#334155' }}>
                          {q?.pe_ratio ? `${fmt(q.pe_ratio, 1)}x` : <span style={{ color: '#cbd5e1' }}>—</span>}
                        </td>

                        {/* 52W range */}
                        <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                          <RangeBar low={q?.week_52_low} high={q?.week_52_high} current={q?.price || q?.close} />
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <Link
                              to={`/company/${row.symbol}/ai-insights`}
                              title="AI Insights"
                              style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: 'rgba(255,153,51,0.08)', border: '1px solid rgba(255,153,51,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                textDecoration: 'none', transition: 'all 0.15s'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,153,51,0.18)'; e.currentTarget.style.borderColor = '#FF9933' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,153,51,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,153,51,0.2)' }}
                            >
                              <Zap size={12} color="#FF9933" />
                            </Link>
                            <Link
                              to={`/company/${row.symbol}`}
                              title="Company Detail"
                              style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: '#f8fafc', border: '1px solid #e2e8f0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                textDecoration: 'none', transition: 'all 0.15s'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1' }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                            >
                              <ArrowUpRight size={12} color="#475569" />
                            </Link>
                            <button
                              onClick={() => handleRemove(row.symbol)}
                              disabled={removing === row.symbol}
                              title="Remove"
                              style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: '#f8fafc', border: '1px solid #e2e8f0',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.15s', flexShrink: 0
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.25)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                            >
                              {removing === row.symbol
                                ? <RefreshCw size={11} style={{ color: '#94a3b8', animation: 'spin 1s linear infinite' }} />
                                : <X size={11} color="#94a3b8" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Table footer */}
              <div style={{ padding: '8px 20px', borderTop: '1px solid #f1f5f9', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>
                  Click column headers to sort · Data delayed · For analysis only
                </span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>
                  {rows.length}/{entries.length} stocks
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {showModal && (
        <AddStockModal
          onClose={() => setShowModal(false)}
          onAdd={handleAdd}
          existing={entries.map(e => e.symbol)}
        />
      )}

      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

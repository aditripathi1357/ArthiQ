import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import {
  Search, TrendingUp, TrendingDown, X, LogOut, ChevronDown,
  BarChart2, BookOpen, Globe2, Bell, Menu, RefreshCw, Minus, Bot,
  Sun, Moon, Zap
} from 'lucide-react'
import { searchCompanies, getStockQuote } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'
import AuthModal from './AuthModal'

const NAV_LINKS = [
  { to: '/',             label: 'Markets',       icon: BarChart2, exact: true  },
  { to: '/forex',        label: 'Forex',         icon: Globe2,    exact: false },
  { to: '/trade',        label: 'Trade',         icon: Zap,       exact: false },
  { to: '/chat',         label: 'AI Chat',       icon: Bot,       exact: false },
  { to: '/tutorial',     label: 'Learn',         icon: BookOpen,  exact: false },
  { to: '/notifications', label: 'Alerts',       icon: Bell,      exact: false },
]

function fmt(n, d = 2) {
  if (n == null) return '—'
  return n.toLocaleString('en-IN', { maximumFractionDigits: d })
}

// ── Notification Panel ────────────────────────────────────────────────────────
function NotificationPanel({ watchlist, onClose }) {
  const navigate = useNavigate()
  const [quotes, setQuotes]   = useState({})
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)

  const fetchQuotes = useCallback(async () => {
    if (!watchlist.length) { setLoading(false); return }
    setLoading(true)
    try {
      const results = await Promise.allSettled(watchlist.map(sym => getStockQuote(sym)))
      const map = {}
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          const d = r.value.data
          map[watchlist[i]] = {
            price:      d.price,
            change:     d.change,
            change_pct: d.change_pct,
            name:       d.name || watchlist[i].replace('.NS', ''),
          }
        }
      })
      setQuotes(map)
      setLastRefresh(new Date())
    } catch {}
    finally { setLoading(false) }
  }, [watchlist])

  useEffect(() => { fetchQuotes() }, [fetchQuotes])

  // Auto-refresh every 2 min
  useEffect(() => {
    const t = setInterval(fetchQuotes, 120000)
    return () => clearInterval(t)
  }, [fetchQuotes])

  return (
    <div className="absolute right-0 top-full mt-2 w-80 border border-border rounded-2xl shadow-2xl z-50 overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div>
          <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Watchlist Updates</div>
          {lastRefresh && (
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Updated {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
        <button onClick={fetchQuotes} className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-saffron transition-colors" title="Refresh">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-80 overflow-y-auto">
        {watchlist.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell size={28} className="text-text-muted/30 mx-auto mb-2" />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No stocks in watchlist</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Add stocks from any company page</p>
          </div>
        ) : loading ? (
          <div className="divide-y divide-border/60">
            {watchlist.map(sym => (
              <div key={sym} className="px-4 py-3 flex items-center gap-3">
                <div className="skeleton w-8 h-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-20 rounded" />
                  <div className="skeleton h-2.5 w-16 rounded" />
                </div>
                <div className="skeleton h-4 w-14 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {watchlist.map(sym => {
              const q   = quotes[sym]
              const pct = q?.change_pct
              const isP = pct > 0
              const isN = pct < 0
              const color = isP ? 'text-positive' : isN ? 'text-negative' : 'text-text-muted'
              const bg    = isP ? 'bg-positive/8' : isN ? 'bg-negative/8' : 'bg-bg-secondary'
              const label = sym.replace('.NS', '').replace('.BO', '')
              const initial = (q?.name || label).charAt(0).toUpperCase()

              return (
                <button
                  key={sym}
                  onClick={() => { navigate(`/company/${sym}`); onClose() }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-saffron/4 transition-colors text-left group"
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-sm ${bg} ${color}`}>
                    {initial}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold group-hover:text-saffron transition-colors truncate" style={{ color: 'var(--text-primary)' }}>
                      {label}
                    </div>
                    <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{q?.name || '—'}</div>
                  </div>

                  {/* Price + change */}
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {q?.price != null ? `₹${fmt(q.price)}` : '—'}
                    </div>
                    <div className={`text-[11px] font-semibold flex items-center justify-end gap-0.5 ${color}`}>
                      {isP ? <TrendingUp size={10} /> : isN ? <TrendingDown size={10} /> : <Minus size={10} />}
                      {pct != null ? `${isP ? '+' : ''}${fmt(pct)}%` : '—'}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {watchlist.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <Link to="/" onClick={onClose} className="text-xs font-semibold text-saffron hover:underline">
            View full dashboard →
          </Link>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Navbar
// ═══════════════════════════════════════════════════════════════════════════════
export default function Navbar() {
  const [query,           setQuery]           = useState('')
  const [results,         setResults]         = useState([])
  const [showResults,     setShowResults]     = useState(false)
  const [searchLoading,   setSearchLoading]   = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false)
  const [userMenuOpen,    setUserMenuOpen]    = useState(false)
  const [notifOpen,       setNotifOpen]       = useState(false)
  const [watchlist,       setWatchlist]       = useState([])
  const [refreshing,      setRefreshing]      = useState(false)

  const searchRef = useRef(null)
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()

  // Load watchlist when user logs in
  useEffect(() => {
    if (!user) { setWatchlist([]); return }
    supabase.from('watchlists').select('symbol').eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!error && data) setWatchlist(data.map(i => i.symbol))
      })
  }, [user])

  // Close search on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = async (value) => {
    setQuery(value)
    if (value.length < 2) { setResults([]); setShowResults(false); return }
    setSearchLoading(true)
    try {
      const res = await searchCompanies(value)
      setResults(res.data.results || [])
      setShowResults(true)
    } catch { setResults([]) }
    finally { setSearchLoading(false) }
  }

  const handleSelect = (symbol) => {
    setQuery(''); setResults([]); setShowResults(false)
    navigate(`/company/${symbol}`)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    if (results.length > 0) handleSelect(results[0].symbol)
    else { navigate(`/company/${query.trim().toUpperCase()}`); setQuery(''); setShowResults(false) }
  }

  // Global page refresh — reloads live data by dispatching a custom event
  const handleGlobalRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    // Dispatch a custom event that pages/components can listen to
    window.dispatchEvent(new CustomEvent('arthiq:refresh'))
    // Also do a hard data refresh after a short delay
    setTimeout(() => {
      window.location.reload()
    }, 100)
  }

  const isActive = (link) =>
    link.exact ? location.pathname === link.to : location.pathname.startsWith(link.to)

  const userInitial = user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'
  const userName    = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-border"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >

        {/* Accent line */}
        <div className="h-0.5 bg-gradient-to-r from-saffron via-saffron/60 to-india-green" />

        {/* ── Full-width container ───────────────────────────────────────── */}
        <div className="w-full px-6 lg:px-10 xl:px-16">
          <div className="h-16 flex items-center justify-between gap-6">

            {/* ── LEFT: Logo + Nav ──────────────────────────────────────── */}
            <div className="flex items-center gap-8 shrink-0">
              {/* Logo — image and text flush with no gap */}
              <Link to="/" className="flex items-center shrink-0" style={{ gap: 0 }}>
                <img
                  src="/arthiqlogo.png"
                  className="h-9 w-auto block"
                  alt="ArthiQ"
                  style={{ display: 'block', marginRight: '4px' }}
                />
                <span className="text-xl font-extrabold tracking-tight hidden sm:block" style={{ color: 'var(--text-primary)', lineHeight: 1 }}>
                  Arthi<span style={{ color: '#138808' }}>Q</span>
                </span>
              </Link>

              {/* Desktop nav links */}
              <div className="hidden md:flex items-center gap-1">
                {NAV_LINKS.map(link => {
                  const active = isActive(link)
                  return (
                    <Link key={link.to} to={link.to}
                      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                        active
                          ? 'text-saffron bg-saffron/8'
                          : 'hover:bg-bg-secondary'
                      }`}
                      style={{ color: active ? undefined : 'var(--text-secondary)' }}
                    >
                      <link.icon size={16} className={active ? 'text-saffron' : 'text-text-muted group-hover:text-saffron transition-colors'} />
                      {link.label}
                      {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-saffron rounded-full" />}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* ── CENTER: Search ────────────────────────────────────────── */}
            <form onSubmit={handleSubmit} ref={searchRef} className="relative flex-1 max-w-2xl">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => results.length > 0 && setShowResults(true)}
                  placeholder="Search stocks… e.g. Reliance, TCS, HDFC, Infosys"
                  className="w-full pl-11 pr-10 py-2.5 border border-border rounded-xl text-sm placeholder-text-muted focus:outline-none focus:border-saffron/60 focus:ring-2 focus:ring-saffron/15 transition-all"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
                {query && (
                  <button type="button" onClick={() => { setQuery(''); setResults([]); setShowResults(false) }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>

              {showResults && (
                <div
                  className="absolute top-full mt-2 w-full border border-border rounded-2xl shadow-2xl max-h-80 overflow-y-auto z-50"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                >
                  {searchLoading ? (
                    <div className="p-5 space-y-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="skeleton w-8 h-8 rounded-lg" />
                          <div className="flex-1 space-y-1.5"><div className="skeleton h-3 w-32" /><div className="skeleton h-2.5 w-20" /></div>
                        </div>
                      ))}
                    </div>
                  ) : results.length === 0 ? (
                    <div className="p-5 text-center text-sm text-text-secondary">No results for "{query}"</div>
                  ) : (
                    <div className="py-1">
                      <div className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-widest border-b border-border">
                        NSE Listed Companies
                      </div>
                      {results.map(r => (
                        <button key={r.symbol} onClick={() => handleSelect(r.symbol)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-saffron/5 transition-colors text-left group">
                          <div className="w-9 h-9 rounded-xl border border-border flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                            <span className="text-sm font-extrabold text-saffron">{r.name?.charAt(0)}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold group-hover:text-saffron truncate transition-colors" style={{ color: 'var(--text-primary)' }}>{r.name}</div>
                            <div className="text-xs text-text-muted">{r.symbol.replace('.NS','').replace('.BO','')} · NSE</div>
                          </div>
                          <TrendingUp size={14} className="text-text-muted group-hover:text-positive shrink-0 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form>

            {/* ── RIGHT: Actions ────────────────────────────────────────── */}
            <div className="flex items-center gap-2 shrink-0">

              {/* ── Refresh Button (single, working) ──────────────────── */}
              <button
                onClick={handleGlobalRefresh}
                disabled={refreshing}
                className="flex items-center justify-center w-10 h-10 rounded-xl border border-border transition-all hover:border-saffron/40 hover:text-saffron"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                title="Refresh live data"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>

              {/* ── Theme Toggle ──────────────────────────────────────── */}
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-10 h-10 rounded-xl border border-border transition-all hover:border-saffron/40"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark'
                  ? <Sun size={16} className="text-saffron" />
                  : <Moon size={16} className="hover:text-saffron transition-colors" />
                }
              </button>

              {user ? (
                <>
                  {/* Notification Bell */}
                  <div className="relative">
                    <button
                      onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false) }}
                      className={`relative flex items-center justify-center w-10 h-10 rounded-xl border transition-all ${
                        notifOpen
                          ? 'border-saffron/40 bg-saffron/8 text-saffron'
                          : 'border-border hover:text-saffron hover:border-saffron/30'
                      }`}
                      style={{ backgroundColor: notifOpen ? undefined : 'var(--bg-secondary)', color: notifOpen ? undefined : 'var(--text-muted)' }}
                      title="Watchlist Notifications"
                    >
                      <Bell size={17} />
                      {watchlist.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-saffron rounded-full text-white text-[9px] font-extrabold flex items-center justify-center border-2 border-bg-primary">
                          {watchlist.length > 9 ? '9+' : watchlist.length}
                        </span>
                      )}
                    </button>

                    {notifOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                        <div className="relative z-50">
                          <NotificationPanel watchlist={watchlist} onClose={() => setNotifOpen(false)} />
                        </div>
                      </>
                    )}
                  </div>

                  {/* User Menu */}
                  <div className="relative">
                    <button
                      onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false) }}
                      className={`flex items-center gap-2.5 pl-2.5 pr-3.5 py-2 rounded-xl border transition-all ${
                        userMenuOpen
                          ? 'border-saffron/40 bg-saffron/5'
                          : 'border-border hover:border-saffron/30 hover:bg-saffron/3'
                      }`}
                      style={{ backgroundColor: userMenuOpen ? undefined : 'var(--bg-secondary)' }}
                    >
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-saffron to-orange-400 text-white flex items-center justify-center text-xs font-extrabold shadow-sm">
                        {userInitial}
                      </div>
                      <span className="hidden lg:block text-sm font-semibold truncate max-w-[120px]" style={{ color: 'var(--text-primary)' }}>{userName}</span>
                      <ChevronDown size={13} className={`text-text-muted transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {userMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 w-56 border border-border rounded-2xl shadow-2xl z-50 overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
                          <div className="px-4 py-3 border-b border-border" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                            <div className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Signed in as</div>
                            <div className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{user.email}</div>
                            {watchlist.length > 0 && (
                              <div className="text-xs text-saffron font-medium mt-1">{watchlist.length} stocks in watchlist</div>
                            )}
                          </div>
                          <div className="p-2">
                            <button
                              onClick={() => { signOut(); setUserMenuOpen(false) }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-negative hover:bg-negative/8 transition-colors"
                            >
                              <LogOut size={15} /> Sign Out
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button onClick={() => setIsAuthModalOpen(true)}
                    className="hidden sm:flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold border border-border transition-all hover:border-saffron/40 hover:text-saffron"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    Log In
                  </button>
                  <button onClick={() => setIsAuthModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-saffron text-white hover:bg-saffron/90 transition-all shadow-lg shadow-saffron/25 active:scale-95">
                    Get Started
                  </button>
                </>
              )}

              {/* Mobile hamburger */}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl border border-border transition-colors"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                <Menu size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border px-4 py-3 space-y-1" style={{ backgroundColor: 'var(--bg-card)' }}>
            {NAV_LINKS.map(link => {
              const active = isActive(link)
              return (
                <Link key={link.to} to={link.to} onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    active ? 'text-saffron bg-saffron/8' : 'hover:bg-bg-secondary'
                  }`}
                  style={{ color: active ? undefined : 'var(--text-secondary)' }}
                >
                  <link.icon size={16} />{link.label}
                </Link>
              )
            })}
            {/* Theme toggle in mobile menu */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-bg-secondary"
              style={{ color: 'var(--text-secondary)' }}
            >
              {theme === 'dark' ? <Sun size={16} className="text-saffron" /> : <Moon size={16} />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
            {!user && (
              <button onClick={() => { setIsAuthModalOpen(true); setMobileMenuOpen(false) }}
                className="w-full mt-2 py-3 rounded-xl bg-saffron text-white text-sm font-bold shadow-lg shadow-saffron/20">
                Get Started — Free
              </button>
            )}
          </div>
        )}
      </nav>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  )
}

import { useState, useEffect, useCallback } from 'react'
import {
  Bell, BellOff, Mail, MessageCircle, Search, Plus, Trash2,
  CheckCircle2, XCircle, Clock, RefreshCw, ChevronRight,
  Settings2, BookOpen, BarChart2, Activity, Zap, Shield,
  TrendingUp, AlertCircle, Save, Eye, EyeOff
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import NotificationToggle from '../components/NotificationToggle'
import ResearchReportCard from '../components/ResearchReportCard'
import { supabase } from '../lib/supabase'
import {
  getNotificationProfile, saveNotificationProfile,
  getResearchList, addToResearchList, removeFromResearchList,
  getAllResearchReports, generateResearchReport,
  getNotificationLogs, searchCompanies,
} from '../api/client'

const TABS = [
  { id: 'settings',  label: 'Settings',       icon: Settings2 },
  { id: 'research',  label: 'Research List',   icon: BookOpen },
  { id: 'reports',   label: 'AI Reports',      icon: BarChart2 },
  { id: 'history',   label: 'Delivery History', icon: Activity },
]

const PREF_FIELDS = [
  { key: 'market_news',       label: 'Market News',         description: 'Index movements, sector news, and macro updates' },
  { key: 'company_news',      label: 'Company News',        description: 'Breaking news for companies in your research list' },
  { key: 'earnings_updates',  label: 'Earnings Updates',    description: 'Upcoming earnings dates and result announcements' },
  { key: 'dividend_updates',  label: 'Dividend Updates',    description: 'Dividend declarations, ex-dates, and payment dates' },
  { key: 'price_alerts',      label: 'Price Alerts',        description: 'Significant price movements and breakouts' },
  { key: 'ai_research_reports', label: 'AI Research Reports', description: 'Daily AI-generated analysis for your research list' },
  { key: 'corporate_actions', label: 'Corporate Actions',   description: 'Mergers, splits, bonus issues, buybacks, and rights issues' },
]

export default function NotificationsPage() {
  const { user } = useAuth()
  const userId = user?.id

  const [activeTab, setActiveTab] = useState('settings')

  // Settings state
  const [profile, setProfile] = useState({
    email: user?.email || '',
    whatsapp_number: '',
    email_enabled: true,
    whatsapp_enabled: false,
    notification_preferences: {
      market_news: true, company_news: true, earnings_updates: true,
      dividend_updates: true, price_alerts: false, ai_research_reports: true,
      corporate_actions: true,
    },
  })
  const [profileLoading, setProfileLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  // Research list state
  const [researchList, setResearchList] = useState([])
  const [listLoading, setListLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(null)
  const [removing, setRemoving] = useState(null)

  // Reports state
  const [reports, setReports] = useState([])
  const [reportsLoading, setReportsLoading] = useState(false)

  // Logs state
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)

  // ── Load everything in parallel on mount ─────────────────────────────────────
  // This populates the header stats immediately and makes tab switching instant.
  useEffect(() => {
    if (!userId) return

    setProfileLoading(true)
    setListLoading(true)
    setReportsLoading(true)
    setLogsLoading(true)

    Promise.allSettled([
      getNotificationProfile(userId),
      getResearchList(userId),
      getAllResearchReports(userId),
      getNotificationLogs(userId, 30),
    ]).then(([profileRes, listRes, reportsRes, logsRes]) => {
      // Profile
      if (profileRes.status === 'fulfilled') {
        const d = profileRes.value.data
        setProfile(prev => ({
          ...prev,
          email: d.email || user?.email || '',
          whatsapp_number: d.whatsapp_number || '',
          email_enabled: d.email_enabled ?? true,
          whatsapp_enabled: d.whatsapp_enabled ?? false,
          notification_preferences: d.notification_preferences || prev.notification_preferences,
        }))
      }
      setProfileLoading(false)

      // Research list
      if (listRes.status === 'fulfilled') {
        setResearchList(listRes.value.data.research_list || [])
      }
      setListLoading(false)

      // Reports
      if (reportsRes.status === 'fulfilled') {
        setReports(reportsRes.value.data.reports || [])
      }
      setReportsLoading(false)

      // Logs
      if (logsRes.status === 'fulfilled') {
        setLogs(logsRes.value.data.logs || [])
      }
      setLogsLoading(false)
    })
  }, [userId])

  // ── Manual refresh helpers (for refresh buttons inside tabs) ────────────────
  const loadResearchList = useCallback(async () => {
    if (!userId) return
    setListLoading(true)
    try {
      const res = await getResearchList(userId)
      setResearchList(res.data.research_list || [])
    } catch {}
    finally { setListLoading(false) }
  }, [userId])

  const loadReports = useCallback(async () => {
    if (!userId) return
    setReportsLoading(true)
    try {
      const res = await getAllResearchReports(userId)
      setReports(res.data.reports || [])
    } catch {}
    finally { setReportsLoading(false) }
  }, [userId])

  const loadLogs = useCallback(async () => {
    if (!userId) return
    setLogsLoading(true)
    try {
      const res = await getNotificationLogs(userId, 30)
      setLogs(res.data.logs || [])
    } catch {}
    finally { setLogsLoading(false) }
  }, [userId])

  // ── Search companies ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    const timeout = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchCompanies(searchQuery)
        setSearchResults((res.data || []).slice(0, 8))
      } catch { setSearchResults([]) }
      finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  // ── Save profile ────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!userId) return
    setSaving(true)
    setSaveMsg(null)
    try {
      await saveNotificationProfile(userId, profile)
      setSaveMsg({ type: 'success', text: 'Settings saved successfully!' })
    } catch {
      setSaveMsg({ type: 'error', text: 'Failed to save. Please try again.' })
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 4000)
    }
  }

  // ── Add to research list ─────────────────────────────────────────────────────
  const handleAddStock = async (company) => {
    if (!userId) return
    const sym = company.symbol || company.ticker
    setAdding(sym)
    try {
      await addToResearchList(userId, sym, company.name || company.company_name)
      // Sync to Supabase portfolios table
      await supabase.from('portfolios').upsert({
        user_id: userId,
        symbol: sym,
        name: company.name || company.company_name || sym,
        quantity: 0,
        avg_buy_price: 0,
      }, { onConflict: 'user_id,symbol' })

      setSearchQuery('')
      setSearchResults([])
      await loadResearchList()
    } catch {}
    finally { setAdding(null) }
  }

  // ── Remove from research list ────────────────────────────────────────────────
  const handleRemove = async (symbol) => {
    if (!userId) return
    setRemoving(symbol)
    try {
      await removeFromResearchList(userId, symbol)
      // Sync to Supabase portfolios table
      await supabase.from('portfolios').delete().eq('user_id', userId).eq('symbol', symbol)

      setResearchList(prev => prev.filter(i => i.symbol !== symbol))
    } catch {}
    finally { setRemoving(null) }
  }

  // ── Regenerate report ────────────────────────────────────────────────────────
  const handleRegenerate = async (symbol) => {
    if (!userId) return
    await generateResearchReport(userId, symbol)
    setTimeout(() => loadReports(), 5000) // reload after delay
  }

  // ── Not logged in guard ──────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-saffron/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell size={32} className="text-saffron" />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Sign in Required</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Please sign in to access your personalized notification settings and AI research reports.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Hero header */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          borderBottom: '1px solid rgba(255,153,51,0.15)',
        }}
      >
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 relative">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-saffron/20 border border-saffron/30 flex items-center justify-center shrink-0">
              <Bell size={22} className="text-saffron" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-widest text-saffron">Personalized</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">Notification Center</h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                AI-powered research alerts · Email & WhatsApp delivery · Track companies you care about
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { label: 'Research List', value: researchList.length, loading: listLoading, icon: BookOpen },
              { label: 'Reports Ready', value: reports.filter(r => !r.pending).length, loading: reportsLoading, icon: BarChart2 },
              { label: 'Delivered', value: logs.length, loading: logsLoading, icon: CheckCircle2 },
            ].map(({ label, value, loading, icon: Icon }) => (
              <div key={label} className="rounded-xl px-3 py-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={12} className="text-saffron" />
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
                {loading
                  ? <div className="h-5 w-8 rounded animate-pulse bg-white/10 mt-0.5" />
                  : <p className="text-lg font-black text-white">{value}</p>
                }
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="sticky top-0 z-10 border-b" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex overflow-x-auto scrollbar-none">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={[
                  'flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold whitespace-nowrap shrink-0',
                  'border-b-2 transition-all duration-200',
                  activeTab === id
                    ? 'border-saffron text-saffron'
                    : 'border-transparent hover:border-border',
                ].join(' ')}
                style={{ color: activeTab === id ? undefined : 'var(--text-muted)' }}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Tab: Settings ──────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="grid gap-6 md:grid-cols-2">

            {/* Contact details */}
            <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
              <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Mail size={16} className="text-saffron" />
                Contact Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                    placeholder="your@email.com"
                    className="w-full rounded-xl px-4 py-2.5 text-sm border outline-none transition-all focus:ring-2 focus:ring-saffron/30 focus:border-saffron"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    WhatsApp Number
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold px-3 py-2.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                      +91
                    </span>
                    <input
                      type="tel"
                      value={profile.whatsapp_number?.replace('+91', '') || ''}
                      onChange={e => setProfile(p => ({ ...p, whatsapp_number: '+91' + e.target.value.replace(/\D/g, '') }))}
                      placeholder="9876543210"
                      maxLength={10}
                      className="flex-1 rounded-xl px-4 py-2.5 text-sm border outline-none transition-all focus:ring-2 focus:ring-saffron/30 focus:border-saffron"
                      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Channel toggles */}
              <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Delivery Channels</h3>
                <NotificationToggle
                  id="email-toggle"
                  label="Email Notifications"
                  description="Receive alerts in your inbox"
                  checked={profile.email_enabled}
                  onChange={v => setProfile(p => ({ ...p, email_enabled: v }))}
                />
                <NotificationToggle
                  id="whatsapp-toggle"
                  label="WhatsApp Notifications"
                  description="Instant messages via WhatsApp"
                  checked={profile.whatsapp_enabled}
                  onChange={v => setProfile(p => ({ ...p, whatsapp_enabled: v }))}
                />
              </div>
            </div>

            {/* Notification preferences */}
            <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
              <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Bell size={16} className="text-saffron" />
                Notification Preferences
              </h2>

              <div className="divide-y" style={{ '--tw-divide-opacity': 1 }}>
                {PREF_FIELDS.map(({ key, label, description }) => (
                  <NotificationToggle
                    key={key}
                    id={`pref-${key}`}
                    label={label}
                    description={description}
                    checked={profile.notification_preferences?.[key] ?? true}
                    onChange={v => setProfile(p => ({
                      ...p,
                      notification_preferences: { ...p.notification_preferences, [key]: v },
                    }))}
                  />
                ))}
              </div>
            </div>

            {/* Save button — full width */}
            <div className="md:col-span-2">
              {saveMsg && (
                <div
                  className={`flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl mb-4 ${
                    saveMsg.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {saveMsg.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  {saveMsg.text}
                </div>
              )}
              <button
                onClick={handleSaveProfile}
                disabled={saving || !userId}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all"
                style={{
                  background: 'linear-gradient(135deg, #FF9933, #e6830a)',
                  color: '#fff',
                  opacity: saving || !userId ? 0.7 : 1,
                  boxShadow: '0 4px 16px rgba(255,153,51,0.3)',
                }}
              >
                {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? 'Saving...' : 'Save Notification Settings'}
              </button>
            </div>
          </div>
        )}

        {/* ── Tab: Research List ─────────────────────────────────────────── */}
        {activeTab === 'research' && (
          <div className="space-y-6">

            {/* Search to add */}
            <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
              <h2 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Plus size={16} className="text-saffron" />
                Add Stock to Research List
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                When you add a stock, ArthiQ will automatically generate AI research reports and send notifications for major events.
              </p>

              <div className="relative">
                <div className="flex items-center gap-2 rounded-xl border px-4 py-2.5" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                  <Search size={15} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search company name or symbol..."
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  {searching && <RefreshCw size={13} className="animate-spin text-saffron" />}
                </div>

                {searchResults.length > 0 && (
                  <div
                    className="absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-xl z-20 overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
                  >
                    {searchResults.map((c, i) => {
                      const sym = c.symbol || c.ticker || ''
                      const inList = researchList.some(r => r.symbol === sym)
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between px-4 py-3 hover:bg-black/5 cursor-pointer transition-colors"
                          style={{ borderBottom: i < searchResults.length - 1 ? '1px solid var(--border)' : 'none' }}
                        >
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{c.name || c.company_name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sym} · {c.exchange || 'NSE'}</p>
                          </div>
                          <button
                            onClick={() => !inList && handleAddStock(c)}
                            disabled={inList || adding === sym}
                            className={[
                              'flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all',
                              inList ? 'opacity-50 cursor-not-allowed' : '',
                            ].join(' ')}
                            style={{
                              background: inList ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #FF9933, #e6830a)',
                              color: inList ? 'var(--text-muted)' : '#fff',
                            }}
                          >
                            {adding === sym ? <RefreshCw size={11} className="animate-spin" /> : <Plus size={11} />}
                            {inList ? 'Added' : 'Track'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Research list table */}
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <BookOpen size={16} className="text-saffron" />
                  Your Research List ({researchList.length})
                </h2>
                <button onClick={loadResearchList} className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <RefreshCw size={12} className={listLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {listLoading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="skeleton h-10 w-10 rounded-xl" />
                      <div className="flex-1"><div className="skeleton h-4 w-32 mb-1" /><div className="skeleton h-3 w-20" /></div>
                    </div>
                  ))}
                </div>
              ) : researchList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <div className="w-14 h-14 rounded-2xl bg-saffron/10 flex items-center justify-center mb-4">
                    <BookOpen size={24} className="text-saffron" />
                  </div>
                  <p className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>No stocks yet</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Search and add stocks above to start receiving AI research alerts.</p>
                </div>
              ) : (
                <div>
                  {researchList.map((item, i) => (
                    <div
                      key={item.id || i}
                      className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-black/5"
                      style={{ borderBottom: i < researchList.length - 1 ? '1px solid var(--border)' : 'none' }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                      >
                        {(item.symbol || '').replace('.NS', '').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{item.company_name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {item.symbol} · Added {item.added_at ? new Date(item.added_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                        </p>
                      </div>
                      <div className="text-right shrink-0 mr-2">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Last analyzed</p>
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {item.last_analyzed_at
                            ? new Date(item.last_analyzed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                            : 'Pending...'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemove(item.symbol)}
                        disabled={removing === item.symbol}
                        className="p-2 rounded-lg transition-colors hover:bg-red-50 hover:text-red-500"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {removing === item.symbol
                          ? <RefreshCw size={14} className="animate-spin" />
                          : <Trash2 size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: AI Reports ────────────────────────────────────────────── */}
        {activeTab === 'reports' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>AI Research Reports</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  AI-generated analysis refreshed every 6 hours for your tracked stocks
                </p>
              </div>
              <button
                onClick={loadReports}
                disabled={reportsLoading}
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border transition-all hover:border-saffron"
                style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}
              >
                <RefreshCw size={13} className={reportsLoading ? 'animate-spin' : ''} />
                Refresh all
              </button>
            </div>

            {reportsLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map(i => <ResearchReportCard key={i} loading />)}
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-saffron/10 flex items-center justify-center mb-4">
                  <BarChart2 size={28} className="text-saffron" />
                </div>
                <p className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>No reports yet</p>
                <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
                  Add stocks to your Research List to generate AI-powered research reports.
                </p>
                <button
                  onClick={() => setActiveTab('research')}
                  className="mt-4 flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-white"
                  style={{ background: 'linear-gradient(135deg, #FF9933, #e6830a)' }}
                >
                  <Plus size={14} /> Add Stocks
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {reports.map((report, i) => (
                  <ResearchReportCard
                    key={report.symbol || i}
                    report={report}
                    onRegenerate={handleRegenerate}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Delivery History ──────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Delivery History</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Recent notifications sent to your email and WhatsApp</p>
              </div>
              <button onClick={loadLogs} className="text-sm flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <RefreshCw size={13} className={logsLoading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            {logsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                    <div className="flex items-center gap-3">
                      <div className="skeleton h-9 w-9 rounded-xl" />
                      <div className="flex-1"><div className="skeleton h-4 w-48 mb-1" /><div className="skeleton h-3 w-28" /></div>
                      <div className="skeleton h-6 w-16 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-saffron/10 flex items-center justify-center mb-4">
                  <Activity size={28} className="text-saffron" />
                </div>
                <p className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>No notifications yet</p>
                <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
                  Once ArthiQ sends you alerts, they'll appear here with delivery status.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
                {logs.map((log, i) => {
                  const typeIcons = {
                    research_report: BarChart2,
                    earnings: Zap,
                    dividend: TrendingUp,
                    breaking_news: AlertCircle,
                    daily_digest: Activity,
                  }
                  const LogIcon = typeIcons[log.type] || Bell
                  const channelColor = log.channel === 'email' ? '#3b82f6' : '#25d366'
                  const statusColor = log.status === 'sent' ? '#16a34a' : log.status === 'failed' ? '#dc2626' : '#f59e0b'

                  return (
                    <div
                      key={log.id || i}
                      className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-black/5"
                      style={{ borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none' }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'var(--bg-secondary)' }}
                      >
                        <LogIcon size={15} className="text-saffron" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{log.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ backgroundColor: `${channelColor}15`, color: channelColor }}>
                            {log.channel === 'email' ? '✉️ Email' : '💬 WhatsApp'}
                          </span>
                          {log.symbol && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{log.symbol.replace('.NS', '')}</span>}
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {log.sent_at ? new Date(log.sent_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        </div>
                      </div>

                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                        style={{ backgroundColor: `${statusColor}15`, color: statusColor }}
                      >
                        {log.status === 'sent' ? '✓ Sent' : log.status === 'failed' ? '✗ Failed' : '⏳ Pending'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

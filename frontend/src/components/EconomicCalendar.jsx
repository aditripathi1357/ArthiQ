import { useState, useEffect } from 'react'
import { CalendarDays, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react'
import api, { getCalendarAll } from '../api/client'
import { useNavigate } from 'react-router-dom'

// ── ImportanceStars ────────────────────────────────────────────────────────
function ImportanceStars({ count }) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {[1, 2, 3].map(i => (
        <svg key={i} width="10" height="10" viewBox="0 0 24 24"
          fill={i <= count ? '#FF9933' : '#334155'}
          xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      ))}
    </div>
  )
}

// ── EventRow ──────────────────────────────────────────────────────────────
function EventRow({ evt, isExpanded, onToggle, onSymbolClick }) {
  const isEarnings = evt.type === 'earnings'
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-border/30 hover:bg-bg-primary/60 transition-colors cursor-pointer group"
      >
        <td className="py-2.5 px-4 text-text-secondary font-medium tabular-nums text-xs whitespace-nowrap">
          {isEarnings ? (evt.date || '—') : (evt.time || '—')}
        </td>
        <td className="py-2.5 px-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="text-base leading-none">{evt.flag || '🇮🇳'}</span>
            <span className="text-text-muted uppercase">{evt.cur || 'INR'}</span>
          </div>
        </td>
        <td className="py-2.5 px-4 text-[13px]">
          {isEarnings ? (
            <span
              className="text-text-primary font-medium group-hover:text-saffron transition-colors cursor-pointer hover:underline"
              onClick={(e) => { e.stopPropagation(); onSymbolClick && onSymbolClick(evt.symbol) }}
            >
              {evt.company || evt.event}
              <span className="ml-2 text-[10px] text-text-muted font-mono">({evt.symbol?.replace('.NS','') || ''})</span>
            </span>
          ) : (
            <span className="text-text-primary group-hover:text-saffron transition-colors">
              {evt.event}
            </span>
          )}
        </td>
        <td className="py-2.5 px-4 text-center">
          <ImportanceStars count={evt.importance || 2} />
        </td>
        <td className={`py-2.5 px-4 text-right font-semibold text-[13px] tabular-nums ${
          evt.actual
            ? (parseFloat(evt.actual) > 0 ? 'text-positive' : 'text-text-primary')
            : 'text-text-muted'
        }`}>
          {evt.actual || '—'}
        </td>
        <td className="py-2.5 px-4 text-right text-text-secondary text-[13px] tabular-nums">
          {evt.forecast || '—'}
        </td>
        <td className="py-2.5 px-6 text-right text-text-secondary text-[13px] tabular-nums">
          {evt.previous || '—'}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-bg-primary/30">
          <td colSpan="7" className="py-3 px-6 border-b border-border/30">
            <div className="flex flex-wrap gap-4 text-xs text-text-secondary bg-bg-card-hover p-3 rounded-lg border border-border/20">
              {evt.date && <span><strong className="text-text-primary">Date:</strong> {evt.date}</span>}
              {evt.country && <span><strong className="text-text-primary">Country:</strong> {evt.country}</span>}
              {evt.actual && <span><strong className="text-positive">Actual:</strong> {evt.actual}</span>}
              {evt.forecast && <span><strong className="text-text-primary">Forecast:</strong> {evt.forecast}</span>}
              {evt.previous && <span><strong className="text-text-primary">Previous:</strong> {evt.previous}</span>}
              <span className="text-text-muted italic">
                {isEarnings
                  ? 'Earnings date sourced from yfinance company calendar.'
                  : 'Economic data sourced from investpy / public data.'}
              </span>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── DateGroupHeader ───────────────────────────────────────────────────────
function DateGroupHeader({ label }) {
  return (
    <tr>
      <td colSpan="7" className="py-1.5 px-4 text-[11px] font-bold text-text-secondary uppercase tracking-widest bg-bg-card-hover border-y border-border/30">
        {label}
      </td>
    </tr>
  )
}

// ── Main EconomicCalendar ────────────────────────────────────────────────
export default function EconomicCalendar() {
  const [activeTab, setActiveTab] = useState('economic')
  const [timeStr, setTimeStr] = useState('')
  const [expandedRow, setExpandedRow] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const [calendarData, setCalendarData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // Live clock
  useEffect(() => {
    const update = () => {
      const now = new Date()
      let hrs = now.getHours()
      const ampm = hrs >= 12 ? 'pm' : 'am'
      hrs = hrs % 12 || 12
      const mins = now.getMinutes().toString().padStart(2, '0')
      const tzOffset = -(now.getTimezoneOffset() / 60)
      const tzStr = tzOffset >= 0 ? `+${tzOffset}:00` : `${tzOffset}:00`
      setTimeStr(`${hrs}:${mins} ${ampm} (GMT ${tzStr})`)
    }
    update()
    const timer = setInterval(update, 60000)
    return () => clearInterval(timer)
  }, [])

  // Fetch calendar data
  const fetchCalendar = async (bust = false) => {
    setLoading(true)
    setError(null)
    try {
      const url = bust ? '/api/calendar/all?force_refresh=true' : '/api/calendar/all'
      const res = await api.get(url)
      setCalendarData(res.data)
    } catch (err) {
      setError('Unable to load calendar data. Showing cached data if available.')
      console.error('Calendar fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCalendar(false)
  }, [])

  // Flatten economic events from grouped data
  const getEconomicEvents = () => {
    if (!calendarData) return { upcoming: [], released: [] }
    const allEco = [
      ...(calendarData.today || []),
      ...(calendarData.tomorrow || []),
      ...(calendarData.this_week || []),
      ...(calendarData.upcoming || []),
    ].filter(e => e.type === 'economic' || !e.type)

    const released = (calendarData.recently_released || []).filter(e => e.type === 'economic' || !e.type)
    return { upcoming: allEco, released }
  }

  // Flatten earnings events from grouped data
  const getEarningsEvents = () => {
    if (!calendarData) return { upcoming: [], released: [] }
    const allEarnings = [
      ...(calendarData.today || []),
      ...(calendarData.tomorrow || []),
      ...(calendarData.this_week || []),
      ...(calendarData.upcoming || []),
    ].filter(e => e.type === 'earnings')

    const released = (calendarData.recently_released || []).filter(e => e.type === 'earnings')
    return { upcoming: allEarnings, released }
  }

  const { upcoming: ecoUpcoming, released: ecoReleased } = getEconomicEvents()
  const { upcoming: earnUpcoming, released: earnReleased } = getEarningsEvents()

  const sourceUpcoming = activeTab === 'economic' ? ecoUpcoming : earnUpcoming
  const sourceReleased = activeTab === 'economic' ? ecoReleased : earnReleased

  const displayUpcoming = showAll ? sourceUpcoming : sourceUpcoming.slice(0, 4)
  const displayReleased = showAll ? sourceReleased : sourceReleased.slice(0, 2)

  const totalEvents = (calendarData?.total) || 0

  return (
    <section className="mb-10 w-full bg-bg-card border border-border shadow-sm rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-6 pt-5 pb-0 border-b border-border gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <CalendarDays size={18} className="text-saffron" />
              Calendars
            </h2>
            {totalEvents > 0 && (
              <span className="text-[10px] font-bold bg-saffron/10 text-saffron border border-saffron/20 px-2 py-0.5 rounded-full">
                {totalEvents} events
              </span>
            )}
          </div>
          <div className="flex gap-6 mt-2">
            <button
              onClick={() => setActiveTab('economic')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'economic'
                  ? 'border-saffron text-saffron'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              Economic
              {ecoUpcoming.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-saffron/10 text-saffron px-1.5 py-0.5 rounded-full font-bold">
                  {ecoUpcoming.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('earnings')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'earnings'
                  ? 'border-saffron text-saffron'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              Earnings
              {earnUpcoming.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-india-green/10 text-india-green px-1.5 py-0.5 rounded-full font-bold">
                  {earnUpcoming.length}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 pb-3">
          <span className="text-xs text-text-muted flex items-center gap-1">
            {timeStr}
          </span>
        <button
            onClick={() => fetchCalendar(true)}
            disabled={loading}
            className="text-text-muted hover:text-saffron transition-colors"
            title="Force refresh calendar"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-6 py-2 bg-yellow-50/50 border-b border-yellow-200/50 text-xs text-yellow-700">
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[680px]">
          <thead>
            <tr className="border-b border-border/50 bg-bg-primary/50 text-[11px] font-bold text-text-primary uppercase tracking-wider">
              <th className="py-2.5 px-4 w-20">{activeTab === 'earnings' ? 'Date' : 'Time'}</th>
              <th className="py-2.5 px-2 w-16">Cur.</th>
              <th className="py-2.5 px-4">Event</th>
              <th className="py-2.5 px-4 text-center w-20">Imp.</th>
              <th className="py-2.5 px-4 text-right">
                {activeTab === 'earnings' ? 'Actual EPS' : 'Actual'}
              </th>
              <th className="py-2.5 px-4 text-right">
                {activeTab === 'earnings' ? 'Fwd EPS Est.' : 'Forecast'}
              </th>
              <th className="py-2.5 px-6 text-right">
                {activeTab === 'earnings' ? 'Trailing EPS' : 'Previous'}
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr>
                <td colSpan="7" className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-text-secondary">
                    <RefreshCw size={20} className="animate-spin text-saffron" />
                    <span className="text-sm">Loading calendar events...</span>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {/* Upcoming section */}
                <DateGroupHeader
                  label={activeTab === 'economic' ? '📅 Upcoming Key Economic Events' : '📊 Upcoming Earnings Reports'}
                />
                {displayUpcoming.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-sm text-text-muted italic">
                      No upcoming {activeTab} events found
                    </td>
                  </tr>
                ) : (
                  displayUpcoming.map((evt, i) => (
                    <EventRow
                      key={`up-${i}`}
                      evt={evt}
                      isExpanded={expandedRow === `up-${i}`}
                      onToggle={() => setExpandedRow(expandedRow === `up-${i}` ? null : `up-${i}`)}
                      onSymbolClick={(sym) => navigate(`/company/${sym}`)}
                    />
                  ))
                )}

                {/* Released section */}
                {displayReleased.length > 0 && (
                  <>
                    <DateGroupHeader
                      label={activeTab === 'economic' ? '✅ Recently Released Events' : '✅ Recent Earnings'}
                    />
                    {displayReleased.map((evt, i) => (
                      <EventRow
                        key={`rel-${i}`}
                        evt={evt}
                        isExpanded={expandedRow === `rel-${i}`}
                        onToggle={() => setExpandedRow(expandedRow === `rel-${i}` ? null : `rel-${i}`)}
                        onSymbolClick={(sym) => navigate(`/company/${sym}`)}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border flex items-center justify-between">
        <span className="text-[11px] text-text-muted">
          {activeTab === 'economic'
            ? 'Economic data: investpy · Indian RBI/NSE events'
            : 'Earnings data: yfinance · NSE listed companies'}
        </span>
        {(sourceUpcoming.length > 4 || sourceReleased.length > 2) && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-bold text-saffron hover:text-saffron-dark tracking-wide flex items-center gap-1"
          >
            <TrendingUp size={12} />
            {showAll ? 'Show fewer' : `Show all ${sourceUpcoming.length + sourceReleased.length} events`}
          </button>
        )}
      </div>
    </section>
  )
}

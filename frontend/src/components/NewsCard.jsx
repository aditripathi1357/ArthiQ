import { useState } from 'react'
import { Newspaper, ExternalLink, Clock, TrendingUp } from 'lucide-react'

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function timeAgo(dateStr) {
  if (!dateStr) return ''
  try {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  } catch {
    return ''
  }
}

/* Source badge colors - maps source names to accent colors */
function sourceColor(source = '') {
  const s = source.toLowerCase()
  if (s.includes('reuters'))     return { bg: '#FF6B35', text: '#fff' }
  if (s.includes('bloomberg'))   return { bg: '#1B4FBB', text: '#fff' }
  if (s.includes('moneycontrol'))return { bg: '#0A3D91', text: '#fff' }
  if (s.includes('economic'))    return { bg: '#8B0000', text: '#fff' }
  if (s.includes('mint'))        return { bg: '#005A9C', text: '#fff' }
  if (s.includes('business'))    return { bg: '#1A1A2E', text: '#f59e0b' }
  return { bg: '#64748b', text: '#fff' }
}

/* Thumbnail component with graceful fallback */
function Thumb({ src, alt = '', className = '', size = 28 }) {
  const [err, setErr] = useState(false)
  return src && !err ? (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setErr(true)}
      className={`${className} object-cover`}
    />
  ) : (
    <div className={`${className} flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200`}>
      <Newspaper size={size} className="text-slate-300" />
    </div>
  )
}

/* Source Chip */
function SourceChip({ source }) {
  const col = sourceColor(source)
  return (
    <span
      className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide leading-none"
      style={{ background: col.bg, color: col.text }}
    >
      {source || 'Staff'}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   1. HERO card — large image top (mobile) / left (desktop), bold headline right
   Featured story at the top of the news section
────────────────────────────────────────────────────────────────────────────── */
export function HeroNewsCard({ article }) {
  if (!article) return null
  const ago = timeAgo(article.published_at)

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col sm:flex-row gap-0 overflow-hidden rounded-xl border border-slate-200 hover:border-saffron/40 hover:shadow-lg hover:shadow-saffron/5 transition-all duration-300 bg-white"
    >
      {/* Image */}
      <div className="sm:w-[340px] sm:min-h-[210px] h-[200px] sm:h-auto overflow-hidden shrink-0 relative">
        <Thumb
          src={article.image_url}
          alt={article.headline}
          size={48}
          className="w-full h-full group-hover:scale-105 transition-transform duration-500"
        />
        {/* Breaking / Live badge */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 bg-saffron text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
            <TrendingUp size={9} /> Top Story
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <SourceChip source={article.source} />
            {ago && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock size={10} /> {ago}
              </span>
            )}
          </div>
          <h2 className="text-[19px] sm:text-[22px] font-extrabold text-slate-900 leading-snug line-clamp-3 group-hover:text-saffron transition-colors duration-200 mb-3">
            {article.headline}
          </h2>
          {article.summary && (
            <p className="text-[13px] text-slate-500 leading-relaxed line-clamp-2">
              {article.summary}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
          <ExternalLink size={12} className="text-saffron opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="text-[11px] text-saffron font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Read full article</span>
        </div>
      </div>
    </a>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. GRID card — image on top, headline below (4-column secondary grid row)
────────────────────────────────────────────────────────────────────────────── */
export function GridNewsCard({ article }) {
  if (!article) return null
  const ago = timeAgo(article.published_at)

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 hover:border-saffron/40 hover:shadow-md hover:shadow-saffron/5 transition-all duration-300 bg-white"
    >
      {/* Image */}
      <div className="w-full h-[120px] overflow-hidden relative shrink-0">
        <Thumb
          src={article.image_url}
          alt={article.headline}
          size={24}
          className="w-full h-full group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      {/* Text */}
      <div className="p-3 flex flex-col flex-1 justify-between">
        <h3 className="text-[12.5px] font-bold text-slate-900 leading-snug line-clamp-3 group-hover:text-saffron transition-colors duration-200 mb-2">
          {article.headline}
        </h3>
        <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-slate-50">
          <SourceChip source={article.source} />
          {ago && <span className="text-[10px] text-slate-400 ml-auto">{ago}</span>}
        </div>
      </div>
    </a>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. LIST ROW card — thumbnail left, headline + excerpt + byline right
   Matches the long news list on Investing.com
────────────────────────────────────────────────────────────────────────────── */
export function ListNewsCard({ article, showDivider = true, index = 0 }) {
  if (!article) return null
  const ago = timeAgo(article.published_at)

  return (
    <>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex gap-4 py-4 items-start hover:bg-saffron/[0.02] -mx-3 px-3 rounded-xl transition-colors duration-200"
      >
        {/* Index number */}
        <div className="hidden sm:flex shrink-0 w-6 h-6 rounded-full bg-slate-100 items-center justify-center mt-1">
          <span className="text-[10px] font-black text-slate-400">{String(index + 1).padStart(2, '0')}</span>
        </div>

        {/* Thumbnail */}
        <div className="shrink-0 w-[120px] sm:w-[140px] h-[82px] sm:h-[90px] overflow-hidden rounded-xl bg-slate-100">
          <Thumb
            src={article.image_url}
            alt=""
            size={22}
            className="w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Text block */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[14.5px] font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-saffron transition-colors duration-200 mb-1.5">
            {article.headline}
          </h3>
          {article.summary && (
            <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-1 sm:line-clamp-2 mb-2 hidden sm:block">
              {article.summary}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <SourceChip source={article.source} />
            {ago && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock size={9} /> {ago}
              </span>
            )}
          </div>
        </div>

        {/* Arrow on hover */}
        <div className="hidden sm:flex shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink size={14} className="text-saffron" />
        </div>
      </a>
      {showDivider && <div className="border-b border-slate-100 mx-3" />}
    </>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. SIDEBAR card — tiny thumbnail + short headline (right sidebar)
────────────────────────────────────────────────────────────────────────────── */
export function SidebarNewsCard({ article, index = 0 }) {
  if (!article) return null
  const ago = timeAgo(article.published_at)

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 py-3 border-b border-slate-100 last:border-0 items-start hover:bg-saffron/[0.03] -mx-2 px-2 rounded-lg transition-colors duration-200"
    >
      {/* Thumbnail */}
      <div className="shrink-0 w-[60px] h-[60px] overflow-hidden rounded-lg bg-slate-100 relative">
        <Thumb
          src={article.image_url}
          alt=""
          size={16}
          className="w-full h-full group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-saffron transition-colors duration-200 mb-1">
          {article.headline}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 truncate">{article.source || 'Staff'}</span>
          {ago && <span className="text-[10px] text-slate-400 shrink-0">· {ago}</span>}
        </div>
      </div>
    </a>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   5. COMPACT SIDEBAR — super-dense, text only with index number
   Great for "Top Headlines" style tight lists
────────────────────────────────────────────────────────────────────────────── */
export function CompactSidebarCard({ article, index = 0 }) {
  if (!article) return null
  const ago = timeAgo(article.published_at)

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 py-3 border-b border-slate-100 last:border-0 items-start"
    >
      <span className="shrink-0 text-[11px] font-black text-saffron w-5 mt-0.5">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-saffron transition-colors duration-200 mb-1">
          {article.headline}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span>{article.source || 'Staff'}</span>
          {ago && <><span>·</span><span>{ago}</span></>}
        </div>
      </div>
    </a>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   6. DEFAULT export — backward compat for CompanyDetail.jsx
────────────────────────────────────────────────────────────────────────────── */
export default function NewsCard({ headline, source, url, publishedAt, imageUrl }) {
  const ago = timeAgo(publishedAt)

  return (
    <>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex gap-4 py-4 items-start hover:bg-saffron/[0.02] -mx-3 px-3 rounded-xl transition-colors duration-200"
      >
        <div className="shrink-0 w-[110px] h-[74px] overflow-hidden rounded-xl bg-slate-100">
          {imageUrl && imageUrl !== 'error' ? (
            <img
              src={imageUrl}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
              <Newspaper size={20} className="text-slate-300" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-saffron transition-colors duration-200 mb-2">
            {headline}
          </p>
          <div className="flex items-center gap-2">
            {source && <SourceChip source={source} />}
            {ago && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock size={9} /> {ago}
              </span>
            )}
          </div>
        </div>
      </a>
      <div className="border-b border-slate-100 mx-3" />
    </>
  )
}

/* ── Aliases for backward compat ─────────────────────────────────────────── */
export { HeroNewsCard as FeaturedNewsCard }
export { ListNewsCard as SmallNewsCard }

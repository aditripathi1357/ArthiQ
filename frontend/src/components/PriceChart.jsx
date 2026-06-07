import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
} from 'lightweight-charts'
import { ChartSkeleton } from './LoadingSkeleton'

const CHART_TYPES = [
  { key: 'candlestick', label: 'Candle' },
  { key: 'line',        label: 'Line'   },
  { key: 'area',        label: 'Area'   },
]

// Chart theme — professional dark
const THEME = {
  bg:           '#0f172a',
  text:         '#94a3b8',
  grid:         '#1e293b',
  crosshair:    '#FF9933',
  upColor:      '#138808',   // India green
  downColor:    '#ef4444',
  areaLine:     '#FF9933',
  areaTop:      'rgba(255,153,51,0.25)',
  areaBottom:   'rgba(255,153,51,0.0)',
  volumeUp:     'rgba(19,136,8,0.5)',
  volumeDown:   'rgba(239,68,68,0.4)',
}

function computeMA(data, period = 20) {
  const result = []
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1)
    const avg = slice.reduce((s, d) => s + d.close, 0) / period
    result.push({ time: data[i].time, value: parseFloat(avg.toFixed(2)) })
  }
  return result
}

function formatRupee(val) {
  if (val == null || isNaN(val)) return '—'
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatVolume(vol) {
  if (!vol) return '—'
  if (vol >= 1e7) return `${(vol / 1e7).toFixed(1)}Cr`
  if (vol >= 1e5) return `${(vol / 1e5).toFixed(1)}L`
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`
  return vol.toString()
}

function barsToChartData(bars) {
  return (bars || [])
    .map((b) => {
      let time
      if (typeof b.timestamp === 'number') {
        time = Math.floor(b.timestamp / 1000)
      } else if (b.timestamp && String(b.timestamp).includes('T')) {
        time = Math.floor(new Date(b.timestamp).getTime() / 1000)
      } else if (b.time) {
        time = typeof b.time === 'number' ? b.time : Math.floor(new Date(b.time).getTime() / 1000)
      } else {
        time = Math.floor(new Date(b.timestamp || Date.now()).getTime() / 1000)
      }
      return {
        time,
        open:   b.open   ?? b.close,
        high:   b.high   ?? b.close,
        low:    b.low    ?? b.close,
        close:  b.close,
        volume: b.volume || 0,
      }
    })
    .filter(d => d.close != null && !isNaN(d.close))
    .sort((a, b) => a.time - b.time)
}

export default function PriceChart({ bars, period, loading, symbol }) {
  const containerRef = useRef(null)
  const chartRef     = useRef(null)
  const priceRef     = useRef(null)
  const volumeRef    = useRef(null)

  const [chartType,  setChartType]  = useState('candlestick')
  const [hoveredBar, setHoveredBar] = useState(null)

  const chartData = barsToChartData(bars)

  const isPositive =
    chartData.length >= 2
      ? chartData[chartData.length - 1].close >= chartData[0].close
      : true

  // Build / rebuild chart whenever data or type changes
  useEffect(() => {
    if (!containerRef.current || chartData.length === 0) return

    // Remove previous chart
    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
      priceRef.current = null
      volumeRef.current = null
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: THEME.bg },
        textColor:  THEME.text,
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize:   11,
      },
      grid: {
        vertLines: { color: THEME.grid },
        horzLines: { color: THEME.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: THEME.crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: THEME.crosshair },
        horzLine: { color: THEME.crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: THEME.crosshair },
      },
      rightPriceScale: {
        borderColor:   THEME.grid,
        scaleMargins:  { top: 0.08, bottom: 0.28 },
      },
      timeScale: {
        borderColor:     THEME.grid,
        timeVisible:     period === '1d' || period === '5d',
        secondsVisible:  false,
      },
      handleScroll: true,
      handleScale:  true,
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    })

    chartRef.current = chart

    // ── Price series (v5 API: chart.addSeries(SeriesType, opts)) ──────────
    let priceSeries
    if (chartType === 'candlestick') {
      priceSeries = chart.addSeries(CandlestickSeries, {
        upColor:         THEME.upColor,
        downColor:       THEME.downColor,
        borderUpColor:   THEME.upColor,
        borderDownColor: THEME.downColor,
        wickUpColor:     THEME.upColor,
        wickDownColor:   THEME.downColor,
      })
      priceSeries.setData(chartData)
    } else if (chartType === 'area') {
      priceSeries = chart.addSeries(AreaSeries, {
        lineColor:    THEME.areaLine,
        topColor:     THEME.areaTop,
        bottomColor:  THEME.areaBottom,
        lineWidth:    2,
      })
      priceSeries.setData(chartData.map(d => ({ time: d.time, value: d.close })))
    } else {
      // line
      priceSeries = chart.addSeries(LineSeries, {
        color:     isPositive ? THEME.upColor : THEME.downColor,
        lineWidth: 2,
      })
      priceSeries.setData(chartData.map(d => ({ time: d.time, value: d.close })))
    }
    priceRef.current = priceSeries

    // ── 20-day MA overlay ─────────────────────────────────────────────────
    if (chartData.length >= 20 && chartType !== 'area') {
      const maSeries = chart.addSeries(LineSeries, {
        color:             THEME.areaLine,
        lineWidth:         1,
        lineStyle:         LineStyle.Dashed,
        priceLineVisible:  false,
        lastValueVisible:  false,
        title:             'MA20',
      })
      maSeries.setData(computeMA(chartData, 20))
    }

    // ── Volume bars ───────────────────────────────────────────────────────
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat:   { type: 'volume' },
      priceScaleId:  'volume',
    })
    // Configure the volume price scale via chart (v5 way)
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    })
    volumeSeries.setData(
      chartData.map(d => ({
        time:  d.time,
        value: d.volume,
        color: d.close >= d.open ? THEME.volumeUp : THEME.volumeDown,
      }))
    )
    volumeRef.current = volumeSeries

    // ── Crosshair tooltip ─────────────────────────────────────────────────
    chart.subscribeCrosshairMove((param) => {
      if (!param?.time || !param.seriesData) {
        setHoveredBar(null)
        return
      }
      const pData = param.seriesData.get(priceSeries)
      if (!pData) { setHoveredBar(null); return }
      const vData = param.seriesData.get(volumeSeries)
      setHoveredBar({
        open:   pData.open   ?? pData.value,
        high:   pData.high   ?? pData.value,
        low:    pData.low    ?? pData.value,
        close:  pData.close  ?? pData.value,
        volume: vData?.value || 0,
      })
    })

    chart.timeScale().fitContent()

    // ── Resize observer ───────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData.length, chartType, period])

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading) return <ChartSkeleton />
  if (!bars || bars.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary text-sm">
        No chart data available
      </div>
    )
  }

  const lastBar    = chartData[chartData.length - 1]
  const firstBar   = chartData[0]
  const priceChange = lastBar && firstBar ? lastBar.close - firstBar.close : 0
  const pricePct    = firstBar?.close ? (priceChange / firstBar.close) * 100 : 0
  const displayBar  = hoveredBar || lastBar

  return (
    <div className="flex flex-col gap-2">

      {/* ── Top bar: OHLCV + chart-type toggle ──────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-xs flex-wrap">
          {displayBar && (
            <>
              <span className="text-text-muted">O: <span className="text-text-primary font-semibold">{formatRupee(displayBar.open)}</span></span>
              <span className="text-text-muted">H: <span className="text-positive  font-semibold">{formatRupee(displayBar.high)}</span></span>
              <span className="text-text-muted">L: <span className="text-negative  font-semibold">{formatRupee(displayBar.low)}</span></span>
              <span className="text-text-muted">C: <span className="text-text-primary font-semibold">{formatRupee(displayBar.close)}</span></span>
              <span className="text-text-muted">V: <span className="text-text-secondary font-semibold">{formatVolume(displayBar.volume)}</span></span>
            </>
          )}
        </div>

        <div className="flex gap-1 bg-bg-primary border border-border rounded-lg p-0.5">
          {CHART_TYPES.map(ct => (
            <button
              key={ct.key}
              onClick={() => setChartType(ct.key)}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                chartType === ct.key
                  ? 'bg-saffron text-white'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart canvas (dark themed) ──────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden border border-[#1e293b] relative"
        style={{ height: 380 }}
      >
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Period % change badge */}
        {!hoveredBar && lastBar && (
          <div className={`absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded-lg ${
            priceChange >= 0
              ? 'bg-[#138808]/20 text-[#138808] border border-[#138808]/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {priceChange >= 0 ? '▲' : '▼'} {formatRupee(Math.abs(priceChange))} ({priceChange >= 0 ? '+' : ''}{pricePct.toFixed(2)}%)
          </div>
        )}

        {/* MA20 legend */}
        {chartData.length >= 20 && chartType !== 'area' && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] text-[#FF9933] pointer-events-none">
            <svg width="16" height="2"><line x1="0" y1="1" x2="16" y2="1" stroke="#FF9933" strokeWidth="1.5" strokeDasharray="3,2" /></svg>
            MA20
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sparkline export (for stock cards) ───────────────────────────────────────
export function Sparkline({ prices, isUp }) {
  if (!prices || prices.length < 2) return null

  const min   = Math.min(...prices)
  const max   = Math.max(...prices)
  const range = max - min || 1
  const W = 80, H = 30

  const path = prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * W
      const y = H - ((p - min) / range) * H
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg width={W} height={H} className="shrink-0">
      <path d={path} fill="none" stroke={isUp ? '#138808' : '#ef4444'} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

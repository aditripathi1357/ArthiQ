import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

const COLORS = {
  Promoters: '#FF9933',
  FII:       '#0033A0',
  DII:       '#138808',
  Retail:    '#94a3b8',
  Others:    '#64748b',
}

export default function OwnershipChart({ ownership, loading }) {
  if (loading) {
    return (
      <div className="card p-5 space-y-4">
        <div className="skeleton h-4 w-36" />
        <div className="flex items-center gap-6">
          <div className="skeleton h-36 w-36 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="space-y-1">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!ownership) {
    return (
      <div className="card p-5 text-center text-text-secondary text-sm py-10">
        Ownership data unavailable
      </div>
    )
  }

  const segments = []
  const labels = []
  const colors = []

  const add = (val, label) => {
    if (val) {
      segments.push(val)
      labels.push(label)
      colors.push(COLORS[label] || '#94a3b8')
    }
  }

  add(ownership.promoter_pct, 'Promoters')
  add(ownership.fii_pct,      'FII')
  add(ownership.dii_pct,      'DII')
  add(ownership.retail_pct,   'Retail')

  if (segments.length === 0) {
    return (
      <div className="card p-5 text-center text-text-secondary text-sm py-10">
        No ownership breakdown available
      </div>
    )
  }

  const data = {
    labels,
    datasets: [{
      data: segments,
      backgroundColor: colors,
      borderColor: '#ffffff',
      borderWidth: 2,
      hoverOffset: 4,
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        borderWidth: 1,
        titleColor: '#94a3b8',
        bodyColor: '#ffffff',
        bodyFont: { weight: '600', size: 13 },
        padding: 10,
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.raw.toFixed(2)}%`,
        },
      },
    },
  }

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-text-primary mb-4">Shareholding Breakdown</h3>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Donut */}
        <div className="relative shrink-0" style={{ width: 148, height: 148 }}>
          <Doughnut data={data} options={options} />
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wide">Total</span>
            <span className="text-base font-black text-text-primary">100%</span>
          </div>
        </div>

        {/* Progress bar legend — single, clean layout */}
        <div className="flex-1 w-full space-y-3">
          {labels.map((label, i) => {
            const pct = segments[i]
            const color = colors[i]
            return (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs font-semibold text-text-secondary">{label}</span>
                  </div>
                  <span className="text-xs font-bold text-text-primary">{pct.toFixed(2)}%</span>
                </div>
                <div className="h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

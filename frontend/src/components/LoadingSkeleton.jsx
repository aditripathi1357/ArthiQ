export default function LoadingSkeleton({ className = '', count = 1, height = 'h-4' }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`skeleton ${height} ${className}`} />
      ))}
    </>
  )
}

export function CardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3">
      <div className="skeleton h-4 w-2/3" />
      <div className="skeleton h-8 w-1/2" />
      <div className="skeleton h-3 w-1/3" />
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3">
      <div className="skeleton h-4 w-1/4" />
      <div className="skeleton h-48 w-full" />
    </div>
  )
}

export function NewsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass-card p-4 space-y-2">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-3 w-1/3" />
        </div>
      ))}
    </div>
  )
}

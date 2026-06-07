import { Link } from 'react-router-dom'
import { Home, AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="glass-card p-10 text-center max-w-md w-full">
        {/* 404 badge */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-negative/10 mb-6">
          <AlertCircle size={36} className="text-negative" />
        </div>

        {/* Heading */}
        <h1 className="text-6xl font-extrabold text-text-primary tracking-tight mb-2">
          404
        </h1>
        <h2 className="text-lg font-semibold text-text-secondary mb-3">
          Page not found
        </h2>
        <p className="text-sm text-text-muted mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
          Try searching for a stock or head back to the dashboard.
        </p>

        {/* CTA */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-navy-900 font-semibold text-sm hover:bg-accent-dim transition-colors"
        >
          <Home size={16} />
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}

import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * Error Boundary — catches JavaScript errors in child components
 * and renders a clean fallback UI instead of crashing the whole page.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComponent />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card p-8 m-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <AlertTriangle size={24} className="text-negative" />
            <h2 className="text-lg font-semibold text-text-primary">Something went wrong</h2>
          </div>
          <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto">
            An unexpected error occurred while rendering this section.
            Try refreshing, or go back to the Dashboard.
          </p>
          {this.state.error && (
            <p className="text-xs text-text-muted mb-4 font-mono bg-navy-800 rounded-lg px-4 py-2 inline-block max-w-full overflow-x-auto">
              {this.state.error.message}
            </p>
          )}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-navy-900 text-sm font-semibold hover:bg-accent-dim transition-colors"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

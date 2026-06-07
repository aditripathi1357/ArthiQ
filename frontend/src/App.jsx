import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Footer from './components/Footer'
import ChatAssistant from './components/ChatAssistant'

// Lazy loaded page components
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CompanyDetail = lazy(() => import('./pages/CompanyDetail'))
const AIInsightsPage = lazy(() => import('./pages/AIInsightsPage'))
const ForexPage = lazy(() => import('./pages/ForexPage'))
const IndicesPage = lazy(() => import('./pages/IndicesPage'))
const StocksListPage = lazy(() => import('./pages/StocksListPage'))
const NotFound = lazy(() => import('./pages/NotFound'))
const About = lazy(() => import('./pages/About'))
const Blog = lazy(() => import('./pages/Blog'))
const Support = lazy(() => import('./pages/Support'))
const Advertise = lazy(() => import('./pages/Advertise'))
const Authors = lazy(() => import('./pages/Authors'))
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const RiskWarning = lazy(() => import('./pages/RiskWarning'))
const Tutorial = lazy(() => import('./pages/Tutorial'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const VirtualTradingPage = lazy(() => import('./pages/VirtualTradingPage'))

function PageLoader() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen gap-4"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)' }}
    >
      <div
        className="w-10 h-10 rounded-full animate-spin"
        style={{
          border: '4px solid var(--border)',
          borderTopColor: '#FF9933',
        }}
      />
      <span className="text-sm font-semibold">Loading...</span>
    </div>
  )
}

export default function App() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
          <Navbar />
          <main className="pt-16 flex-1">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                <Route path="/indices" element={<ErrorBoundary><IndicesPage /></ErrorBoundary>} />
                <Route path="/stocks" element={<ErrorBoundary><StocksListPage /></ErrorBoundary>} />
                <Route path="/company/:symbol/ai-insights" element={<ErrorBoundary><AIInsightsPage /></ErrorBoundary>} />
                <Route path="/company/:symbol" element={<ErrorBoundary><CompanyDetail /></ErrorBoundary>} />
                <Route path="/forex" element={<ErrorBoundary><ForexPage /></ErrorBoundary>} />
                <Route path="/about" element={<ErrorBoundary><About /></ErrorBoundary>} />
                <Route path="/blog" element={<ErrorBoundary><Blog /></ErrorBoundary>} />
                <Route path="/support" element={<ErrorBoundary><Support /></ErrorBoundary>} />
                <Route path="/advertise" element={<ErrorBoundary><Advertise /></ErrorBoundary>} />
                <Route path="/authors" element={<ErrorBoundary><Authors /></ErrorBoundary>} />
                <Route path="/terms" element={<ErrorBoundary><TermsAndConditions /></ErrorBoundary>} />
                <Route path="/privacy" element={<ErrorBoundary><PrivacyPolicy /></ErrorBoundary>} />
                <Route path="/risk-warning" element={<ErrorBoundary><RiskWarning /></ErrorBoundary>} />
                <Route path="/tutorial" element={<ErrorBoundary><Tutorial /></ErrorBoundary>} />
                <Route path="/chat" element={<ErrorBoundary><ChatPage /></ErrorBoundary>} />
                <Route path="/notifications" element={<ErrorBoundary><NotificationsPage /></ErrorBoundary>} />
                <Route path="/trade" element={<ErrorBoundary><VirtualTradingPage /></ErrorBoundary>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
          <ChatAssistant />
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}

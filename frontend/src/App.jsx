import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import ErrorBoundary from './components/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import CompanyDetail from './pages/CompanyDetail'
import AIInsightsPage from './pages/AIInsightsPage'
import ForexPage from './pages/ForexPage'
import IndicesPage from './pages/IndicesPage'
import StocksListPage from './pages/StocksListPage'
import NotFound from './pages/NotFound'
import About from './pages/About'
import Blog from './pages/Blog'
import Support from './pages/Support'
import Advertise from './pages/Advertise'
import Authors from './pages/Authors'
import TermsAndConditions from './pages/TermsAndConditions'
import PrivacyPolicy from './pages/PrivacyPolicy'
import RiskWarning from './pages/RiskWarning'
import Tutorial from './pages/Tutorial'
import ChatPage from './pages/ChatPage'
import NotificationsPage from './pages/NotificationsPage'
import VirtualTradingPage from './pages/VirtualTradingPage'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Footer from './components/Footer'
import ChatAssistant from './components/ChatAssistant'

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
          </main>
          <Footer />
          <ChatAssistant />
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}

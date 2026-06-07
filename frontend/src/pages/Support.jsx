import { useState } from 'react'
import { Search, BookOpen, Code, Mail, ChevronDown, ChevronUp } from 'lucide-react'

const FAQS = [
  {
    category: "Getting Started",
    items: [
      {
        q: "What is Arthiq?",
        a: "Arthiq is India's AI-powered financial intelligence platform. We provide live NSE/BSE stock prices, AI-powered explanations of market movements, 2-4 week price predictions, company analysis, forex rates, and financial news — all in one place."
      },
      {
        q: "Is Arthiq free to use?",
        a: "Yes! Core features of Arthiq are completely free. This includes live stock prices, AI insights, price outlooks, company analysis, and forex rates. We may introduce premium features in the future but the core platform will always be free."
      },
      {
        q: "Which stocks does Arthiq cover?",
        a: "Currently we cover 50+ major NSE stocks including Nifty 50 companies. We are continuously adding more stocks. Global stocks and BSE-only listings are coming soon."
      }
    ]
  },
  {
    category: "Data & Accuracy",
    items: [
      {
        q: "Where does the stock data come from?",
        a: "We source live stock data from NSE via industry-standard data providers. Price data is refreshed every 5 minutes during market hours (Mon-Fri 9:15 AM - 3:30 PM IST)."
      },
      {
        q: "How accurate are the AI predictions?",
        a: "Our AI predictions are generated using technical analysis, news sentiment analysis, and market trend data. They are for informational purposes only and should not be treated as financial advice. Always do your own research before making investment decisions."
      },
      {
        q: "What is the AI Outlook feature?",
        a: "The 2-4 Week Outlook uses GPT-4o-mini AI to analyze recent price movements, news headlines, technical indicators, and Indian market factors to generate a forward-looking outlook. It includes a directional view (bullish/bearish/neutral), price target range, key catalysts, and risks."
      }
    ]
  },
  {
    category: "Technical",
    items: [
      {
        q: "Why is a stock showing no data?",
        a: "Some stocks may temporarily show no data if our data provider is experiencing delays. Try refreshing the page. If the problem persists, contact support."
      },
      {
        q: "How often is data refreshed?",
        a: "Stock prices: every 5 minutes during market hours. News: every 15 minutes. Forex rates: every 30 minutes. AI insights: cached for 30-60 minutes to optimize performance."
      }
    ]
  }
]

export default function Support() {
  const [query, setQuery] = useState('')
  const [openIds, setOpenIds] = useState(new Set())

  const toggleFaq = (id) => {
    const newIds = new Set(openIds)
    if (newIds.has(id)) newIds.delete(id)
    else newIds.add(id)
    setOpenIds(newIds)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      
      {/* SECTION 1 - Hero */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h1 className="text-4xl font-extrabold text-text-primary mb-4">Help & Support</h1>
        <p className="text-text-secondary text-lg mb-8">
          Get help with Arthiq — we're here to assist you
        </p>
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
          <input 
            type="text" 
            placeholder="Search help articles..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-bg-card border-2 border-border pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:border-saffron focus:ring-1 focus:ring-saffron text-text-primary shadow-sm text-lg"
          />
        </div>
      </div>

      {/* SECTION 2 - Quick Help */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
        
        <a href="#getting-started" className="glass-card p-8 flex flex-col items-center text-center hover:border-saffron transition-all group">
          <div className="w-14 h-14 rounded-full bg-bg-secondary flex items-center justify-center mb-6 group-hover:bg-saffron group-hover:text-white transition-colors">
            <BookOpen size={24} className="text-text-primary group-hover:text-white" />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">Getting Started</h3>
          <p className="text-sm text-text-secondary">New to Arthiq? Start here</p>
        </a>

        <a href="#api-data" className="glass-card p-8 flex flex-col items-center text-center hover:border-saffron transition-all group">
          <div className="w-14 h-14 rounded-full bg-bg-secondary flex items-center justify-center mb-6 group-hover:bg-saffron group-hover:text-white transition-colors">
            <Code size={24} className="text-text-primary group-hover:text-white" />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">API & Data</h3>
          <p className="text-sm text-text-secondary">Questions about our data sources</p>
        </a>

        <a href="mailto:support@arthiq.com" className="glass-card p-8 flex flex-col items-center text-center hover:border-saffron transition-all group">
          <div className="w-14 h-14 rounded-full bg-bg-secondary flex items-center justify-center mb-6 group-hover:bg-saffron group-hover:text-white transition-colors">
            <Mail size={24} className="text-text-primary group-hover:text-white" />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">Contact Us</h3>
          <p className="text-sm text-text-secondary">Can't find an answer? Email us</p>
        </a>

      </div>

      {/* SECTION 3 - FAQ */}
      <div className="max-w-4xl mx-auto mb-24">
        <h2 className="text-3xl font-extrabold text-text-primary text-center mb-12">Frequently Asked Questions</h2>
        
        <div className="space-y-12">
          {FAQS.map((category, i) => {
            // Filter logic
            const filteredItems = category.items.filter(item => 
              item.q.toLowerCase().includes(query.toLowerCase()) || 
              item.a.toLowerCase().includes(query.toLowerCase())
            )

            if (filteredItems.length === 0 && query) return null

            const idPrefix = category.category.toLowerCase().replace(/[^a-z0-9]/g, '-')

            return (
              <div key={i} id={idPrefix} className="scroll-mt-24">
                <h3 className="text-xl font-bold text-text-secondary mb-6 pl-2 border-l-4 border-saffron">
                  {category.category}
                </h3>
                <div className="space-y-4">
                  {filteredItems.map((item, j) => {
                    const id = `${idPrefix}-${j}`
                    const isOpen = openIds.has(id) || query.length > 2
                    return (
                      <div key={j} className="glass-card overflow-hidden border border-border">
                        <button 
                          onClick={() => toggleFaq(id)}
                          className="w-full flex items-center justify-between p-5 md:p-6 text-left hover:bg-bg-card-hover transition-colors focus:outline-none"
                        >
                          <span className="text-base md:text-lg font-bold text-text-primary pr-6">{item.q}</span>
                          {isOpen ? <ChevronUp className="text-saffron shrink-0" /> : <ChevronDown className="text-text-muted shrink-0" />}
                        </button>
                        {isOpen && (
                          <div className="p-5 md:p-6 pt-0 text-text-secondary leading-relaxed bg-bg-card">
                            <div className="w-full h-px bg-border mb-5"></div>
                            {item.a}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        
        {query && FAQS.every(c => c.items.every(item => 
          !item.q.toLowerCase().includes(query.toLowerCase()) && 
          !item.a.toLowerCase().includes(query.toLowerCase())
        )) && (
          <div className="text-center py-12 glass-card">
            <Search size={40} className="mx-auto text-text-muted mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-text-primary mb-2">No results found</h3>
            <p className="text-text-secondary">We couldn't find any FAQs matching "{query}".</p>
            <a href="mailto:support@arthiq.com" className="inline-block mt-6 text-saffron font-bold hover:underline">
              Contact Support &rarr;
            </a>
          </div>
        )}
      </div>

    </div>
  )
}

import { Search } from 'lucide-react'
import { Link } from 'react-router-dom'

const CATEGORIES = ['All', 'Market Analysis', 'AI Insights', 'Tutorials', 'Stock Deep Dives', 'Economy']

const ARTICLES = [
  {
    id: 1,
    tag: 'AI Insights',
    tagColor: 'bg-saffron text-white',
    title: "How Arthiq's AI Predicts Stock Movements",
    excerpt: "A deep dive into how we use GPT-4o-mini, technical analysis, and news sentiment to generate our 2-4 week price outlooks.",
    date: 'April 7, 2026',
    readTime: '4 min read'
  },
  {
    id: 2,
    tag: 'Market Analysis',
    tagColor: 'bg-blue-600 text-white',
    title: "RBI Rate Decision: What It Means for Your Stocks",
    excerpt: "The RBI held rates steady. Here's exactly which sectors benefit and which face headwinds.",
    date: 'April 6, 2026',
    readTime: '6 min read'
  },
  {
    id: 3,
    tag: 'Stock Deep Dive',
    tagColor: 'bg-green-600 text-white',
    title: "Reliance Industries: Complete AI Analysis",
    excerpt: "We ran Reliance through our full AI analysis engine. Here's what the data says about the next quarter.",
    date: 'April 5, 2026',
    readTime: '8 min read'
  },
  {
    id: 4,
    tag: 'Tutorials',
    tagColor: 'bg-purple-600 text-white',
    title: "How to Read the AI Insights Panel",
    excerpt: "A beginner's guide to understanding Arthiq's AI analysis features and how to use them for your investment decisions.",
    date: 'April 4, 2026',
    readTime: '3 min read'
  },
  {
    id: 5,
    tag: 'Economy',
    tagColor: 'bg-amber-600 text-white',
    title: "FII Flows in April 2026: Impact on Nifty 50",
    excerpt: "Foreign institutional investors have been net sellers. Our AI model explains the downstream impact on Indian large-caps.",
    date: 'April 3, 2026',
    readTime: '5 min read'
  },
  {
    id: 6,
    tag: 'Market Analysis',
    tagColor: 'bg-blue-600 text-white',
    title: "Nifty 50 Technical Analysis: Support and Resistance Levels",
    excerpt: "Using Chart.js and historical data, we mapped the key price levels every Nifty trader should know right now.",
    date: 'April 2, 2026',
    readTime: '7 min read'
  }
]

export default function Blog() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      
      {/* SECTION 1 - Hero */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h1 className="text-4xl font-extrabold text-text-primary mb-4">Arthiq Blog</h1>
        <p className="text-text-secondary text-lg mb-8">
          Market insights, AI analysis, and investing education for Indian investors
        </p>
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
          <input 
            type="text" 
            placeholder="Search articles..." 
            className="w-full bg-bg-card border-2 border-border pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-saffron focus:ring-1 focus:ring-saffron text-text-primary shadow-sm"
          />
        </div>
      </div>

      {/* SECTION 2 - Featured Article */}
      <div className="glass-card mb-16 overflow-hidden border-l-4 border-l-saffron hover:shadow-xl transition-shadow group cursor-pointer block">
        <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1">
            <span className="inline-block px-3 py-1 bg-saffron text-white text-xs font-bold rounded-full mb-4 tracking-wide">
              FEATURED
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4 leading-tight group-hover:text-saffron transition-colors">
              Why Indian Markets Fell 3% This Week: An AI Analysis
            </h2>
            <p className="text-text-secondary text-base leading-relaxed mb-6">
              Our AI analyzed over 200 news articles and price movements to explain exactly what caused the recent market selloff — and what comes next.
            </p>
            <div className="flex items-center gap-4 text-sm text-text-muted font-medium mb-6">
              <span className="text-text-primary font-bold">Arthiq AI Research</span>
              <span>&bull;</span>
              <span>April 8, 2026</span>
              <span>&bull;</span>
              <span>5 min read</span>
            </div>
            <button className="bg-saffron text-white font-bold px-6 py-2.5 rounded-lg hover:bg-saffron-dark transition-colors inline-flex items-center gap-2">
              Read Article &rarr;
            </button>
          </div>
          <div className="hidden lg:block w-1/3 shrink-0">
             <div className="aspect-video bg-bg-secondary rounded-xl border border-border flex items-center justify-center opacity-50 relative overflow-hidden">
                <Search size={40} className="text-border" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-saffron/10 to-transparent"></div>
             </div>
          </div>
        </div>
      </div>

      {/* SECTION 3 - Categories */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none border-b border-border">
        {CATEGORIES.map((cat, i) => (
          <button 
            key={cat}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm whitespace-nowrap transition-colors ${
              i === 0 ? 'bg-bg-primary text-text-primary border-2 border-border' : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary border-2 border-transparent'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* SECTION 4 - Article Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
        {ARTICLES.map((article) => (
          <article key={article.id} className="glass-card flex flex-col h-full hover:border-saffron transition-all group cursor-pointer">
            <div className="p-6 flex-1 flex flex-col">
              <div className="mb-4">
                <span className={`inline-block px-2.5 py-1 text-[10px] font-extrabold rounded uppercase tracking-wider ${article.tagColor}`}>
                  {article.tag}
                </span>
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-3 leading-snug group-hover:text-saffron transition-colors">
                {article.title}
              </h3>
              <p className="text-sm text-text-secondary line-clamp-3 mb-6 flex-1">
                {article.excerpt}
              </p>
              <div className="mt-auto">
                <div className="flex items-center gap-3 text-xs text-text-muted font-medium mb-4">
                  <span className="text-text-primary">Arthiq Staff</span>
                  <span>&bull;</span>
                  <span>{article.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted font-medium">{article.readTime}</span>
                  <span className="text-saffron font-bold text-sm group-hover:underline">Read &rarr;</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* SECTION 5 - Newsletter */}
      <div className="glass-card max-w-3xl mx-auto p-10 border-2 border-border relative overflow-hidden bg-bg-secondary/50">
        <div className="absolute top-0 left-0 w-2 h-full bg-saffron"></div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Get Weekly Market Intelligence</h2>
          <p className="text-text-secondary text-sm mb-8">Join 10,000+ Indian investors getting AI-powered market insights every week.</p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-4" onSubmit={(e) => e.preventDefault()}>
            <input 
              type="email" 
              placeholder="Enter your email address" 
              className="flex-1 bg-bg-primary border border-border px-4 py-3 rounded-lg focus:outline-none focus:border-saffron text-sm text-text-primary"
              required 
            />
            <button className="bg-saffron text-white font-bold px-6 py-3 rounded-lg hover:bg-saffron-dark transition-colors whitespace-nowrap">
              Subscribe
            </button>
          </form>
          <p className="text-xs text-text-muted">No spam. Unsubscribe anytime.</p>
        </div>
      </div>

    </div>
  )
}

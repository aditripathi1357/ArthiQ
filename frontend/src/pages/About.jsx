import { Brain, TrendingUp, Globe, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function About() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      {/* SECTION 1 - Hero */}
      <div className="mb-16 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-text-primary mb-4 pb-2 relative inline-block">
          About Arthiq
          <span className="absolute bottom-0 left-0 w-full h-1.5 bg-saffron rounded-full"></span>
        </h1>
        <p className="text-lg text-text-secondary mt-6 font-medium leading-relaxed">
          India's first AI-powered financial intelligence platform built for every Indian investor
        </p>
      </div>

      {/* SECTION 2 - Our Mission */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24 glass-card p-8 md:p-12">
        <div>
          <blockquote className="text-2xl font-bold text-saffron italic leading-snug">
            "We believe every Indian investor deserves the same quality of financial intelligence that was previously only available to institutional investors."
          </blockquote>
        </div>
        <div className="text-text-secondary space-y-6 text-base leading-relaxed">
          <p>
            Arthiq was built with one goal — to democratize financial intelligence in India. We combine live NSE/BSE market data with cutting-edge AI to explain not just what the markets are doing, but <strong className="text-text-primary font-bold">WHY</strong> they are doing it.
          </p>
          <p>
            From a first-time investor trying to understand why Reliance dropped 3% today, to a seasoned trader looking for AI-powered price predictions — Arthiq is built for every Indian investor.
          </p>
        </div>
      </div>

      {/* SECTION 3 - What Makes Us Different */}
      <div className="mb-24">
        <h2 className="text-3xl font-extrabold text-text-primary text-center mb-12">Why Arthiq?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          
          <div className="glass-card p-8 hover:border-saffron transition-colors group">
            <Brain size={40} className="text-saffron mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-xl font-bold text-text-primary mb-3">AI-Powered Explanations</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              We don't just show you numbers. Our AI analyzes news, price movements, and market trends to explain in plain English why a stock moved.
            </p>
          </div>

          <div className="glass-card p-8 hover:border-saffron transition-colors group">
            <TrendingUp size={40} className="text-saffron mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-xl font-bold text-text-primary mb-3">2-4 Week Price Outlook</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Our AI generates price predictions for the next 2-4 weeks based on technical analysis, news sentiment, and Indian market factors like RBI policy and FII flows.
            </p>
          </div>

          <div className="glass-card p-8 hover:border-saffron transition-colors group">
            <Globe size={40} className="text-saffron mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-xl font-bold text-text-primary mb-3">India-First Platform</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Built specifically for NSE and BSE. We understand Indian market hours, Indian companies, and Indian market dynamics better than any global platform.
            </p>
          </div>

          <div className="glass-card p-8 hover:border-saffron transition-colors group">
            <Shield size={40} className="text-saffron mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-xl font-bold text-text-primary mb-3">Always Free</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Core features of Arthiq will always be free. We believe financial intelligence should not be locked behind expensive subscriptions.
            </p>
          </div>

        </div>
      </div>

      {/* SECTION 4 - Platform Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-24">
        {[
          { stat: '50+', label: 'Indian Stocks Tracked' },
          { stat: '16+', label: 'AI-Powered Endpoints' },
          { stat: 'Real-time', label: 'NSE/BSE Data' },
          { stat: 'Free', label: 'Forever for Core Features' },
        ].map((item, i) => (
          <div key={i} className="glass-card p-8 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-extrabold text-saffron mb-2">{item.stat}</span>
            <span className="text-sm font-semibold text-text-muted">{item.label}</span>
          </div>
        ))}
      </div>

      {/* SECTION 5 - Our Story */}
      <div className="mb-24 max-w-4xl mx-auto">
        <h2 className="text-3xl font-extrabold text-text-primary text-center mb-12">Our Story</h2>
        <div className="relative border-l-2 border-border ml-4 md:ml-0 md:pl-0 md:w-full">
          {/* Timeline Items */}
          {[
            {
              date: "2025",
              title: "The Idea",
              desc: "Frustrated by financial platforms that showed data but never explained it, we set out to build something different — a platform that thinks like a financial analyst."
            },
            {
              date: "Early 2026",
              title: "Building Arthiq",
              desc: "We built the entire data infrastructure — live NSE/BSE price feeds, news aggregation, forex tracking, and a PostgreSQL database optimized for financial time-series data."
            },
            {
              date: "April 2026",
              title: "AI Integration",
              desc: "We integrated GPT-4o-mini to power our 'Why did this stock move?' and '2-4 Week Outlook' features — making Arthiq truly intelligent."
            },
            {
              date: "Mid 2026",
              title: "Launch",
              desc: "Arthiq launches to the public. India's first truly AI-native financial intelligence platform."
            }
          ].map((item, i) => (
            <div key={i} className="mb-10 ml-8 md:ml-12 relative w-full pr-4">
              <span className="absolute -left-[41px] md:-left-[57px] top-1 w-5 h-5 rounded-full bg-saffron border-4 border-bg-primary"></span>
              <div className="text-saffron font-bold text-sm mb-1">{item.date}</div>
              <h4 className="text-xl font-bold text-text-primary mb-2">{item.title}</h4>
              <p className="text-sm text-text-secondary leading-relaxed bg-bg-card p-5 rounded-xl border border-border">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 6 - Tech Stack */}
      <div className="mb-24 text-center pb-8 border-b border-border">
        <h2 className="text-2xl font-bold text-text-primary mb-8">Built With Modern Technology</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {['React', 'FastAPI', 'PostgreSQL', 'Python', 'OpenAI GPT-4o', 'Chart.js', 'TailwindCSS'].map((tech) => (
            <div key={tech} className="bg-bg-secondary px-5 py-2.5 rounded-lg border border-border text-text-primary text-sm font-semibold shadow-sm">
              {tech}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 7 - CTA */}
      <div className="text-center">
        <div className="glass-card max-w-3xl mx-auto p-12 border-2 border-saffron relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-saffron opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <h2 className="text-3xl font-extrabold text-text-primary mb-4 relative z-10">Start Exploring Indian Markets</h2>
          <p className="text-text-secondary mb-8 text-lg font-medium relative z-10">Get AI-powered insights for any NSE/BSE stock — free</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-saffron text-white font-bold text-lg px-8 py-4 rounded-xl hover:bg-saffron-dark transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 relative z-10">
            Go to Dashboard &rarr;
          </Link>
        </div>
      </div>

    </div>
  )
}

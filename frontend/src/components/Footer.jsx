import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-[#111827] text-[#9ca3af] pt-10 pb-6 text-sm font-sans mt-auto border-t-2 border-[#FF9933]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Top Section — Brand + Description */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-10 mb-10 pb-10 border-b border-[#1f2937]">
          <div className="max-w-xs">
            {/* Logo + Text */}
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <img src="/arthiqlogo.png" className="h-8 w-auto" alt="ArthiQ" />
              <span className="text-xl font-extrabold tracking-tight text-white">
                Arthi<span style={{ color: '#138808' }}>Q</span>
              </span>
            </Link>
            <p className="text-sm text-[#6b7280] leading-relaxed">
              India's AI-powered financial intelligence platform. Live NSE/BSE data, AI-driven stock insights, and smart portfolio tools — free forever.
            </p>
          </div>

          {/* Links Grid */}
          <div className="flex flex-wrap gap-12">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#FF9933] mb-5">Platform</h4>
              <ul className="space-y-3">
                <li><Link to="/" className="hover:text-white transition-colors">Markets</Link></li>
                <li><Link to="/forex" className="hover:text-white transition-colors">Forex</Link></li>
                <li><Link to="/indices" className="hover:text-white transition-colors">Indices</Link></li>
                <li><Link to="/stocks" className="hover:text-white transition-colors">All Stocks</Link></li>
                <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#FF9933] mb-5">Company</h4>
              <ul className="space-y-3">
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/authors" className="hover:text-white transition-colors">Authors</Link></li>
                <li><Link to="/advertise" className="hover:text-white transition-colors">Advertise</Link></li>
                <li><Link to="/support" className="hover:text-white transition-colors">Help & Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#FF9933] mb-5">Legal</h4>
              <ul className="space-y-3">
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/risk-warning" className="hover:text-white transition-colors">Risk Warning</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Risk Disclosure */}
        <div className="text-[11px] leading-relaxed text-[#4b5563] mb-8 max-w-5xl">
          <p className="mb-2">
            <strong className="text-[#6b7280]">Risk Disclosure:</strong> Trading in financial instruments involves high risks including the risk of losing some, or all, of your investment amount, and may not be suitable for all investors. Prices of stocks and other financial instruments are highly volatile and may be affected by external factors such as market sentiment, economic data, RBI policy decisions, FII/DII flows, and global geopolitical events.
          </p>
          <p className="mb-2">
            Before deciding to invest, you should be fully informed of the risks involved, carefully consider your investment objectives, level of experience, and risk appetite, and seek advice from a SEBI-registered investment advisor where needed.
          </p>
          <p>
            <strong className="text-[#6b7280]">ArthiQ</strong> provides AI-generated market insights and stock data for informational purposes only. Content on this platform does not constitute financial advice. Data may be delayed and is not guaranteed to be accurate or complete. ArthiQ will not accept liability for any trading losses incurred as a result of reliance on information displayed on this platform.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#4b5563] pt-6 border-t border-[#1f2937]">
          <p>&copy; 2026 ArthiQ. All Rights Reserved. Not a SEBI-registered investment advisor.</p>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/risk-warning" className="hover:text-[#FF9933] transition-colors font-semibold">Risk Warning</Link>
          </div>
        </div>

      </div>
    </footer>
  )
}

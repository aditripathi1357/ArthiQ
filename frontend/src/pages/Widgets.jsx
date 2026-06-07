export default function Widgets() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-24 text-center">
      <h1 className="text-4xl font-extrabold text-text-primary mb-6">Arthiq Widgets</h1>
      <p className="text-text-secondary text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
        Embed the power of Arthiq's AI financial intelligence directly onto your own website, blog, or application using our high-performance widgets.
      </p>
      
      <div className="glass-card p-12 border-2 border-dashed border-border bg-bg-secondary/30">
        <div className="w-16 h-16 rounded-full bg-bg-primary border flex items-center justify-center mx-auto mb-6 shadow-sm">
          <svg className="w-8 h-8 text-saffron" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-4">Coming Soon</h2>
        <p className="text-text-secondary max-w-lg mx-auto">
          We are currently developing customizable Web Components and React SDKs for stock tick tickers, AI prediction cards, and market heatmaps.
        </p>
        <button className="mt-8 bg-border text-text-secondary font-bold px-6 py-2.5 rounded-lg cursor-not-allowed">
          Join Waitlist
        </button>
      </div>
    </div>
  )
}

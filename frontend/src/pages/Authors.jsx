export default function Authors() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-24 text-center">
      <h1 className="text-4xl font-extrabold text-text-primary mb-6">Our Authors & Analysts</h1>
      <p className="text-text-secondary text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
        The intelligence behind Arthiq's insights is powered by a combination of elite financial experts and advanced AI models trained specifically for the Indian market ecosystem.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mt-12">
        <div className="glass-card p-8 border-t-4 border-t-saffron">
          <h3 className="text-2xl font-bold text-text-primary mb-3">Arthiq AI Core</h3>
          <p className="text-sm text-text-secondary mb-4 leading-relaxed">
            Our primary author for all automated insights, price predictions, and 'why it moved' explanations. The AI Core digests thousands of articles, NSE data points, and technical indicators in real-time.
          </p>
          <span className="inline-block px-3 py-1 bg-saffron/10 text-saffron font-bold text-xs rounded-full">AI System</span>
        </div>
        
        <div className="glass-card p-8 border-t-4 border-t-blue-500">
          <h3 className="text-2xl font-bold text-text-primary mb-3">Editorial Desk</h3>
          <p className="text-sm text-text-secondary mb-4 leading-relaxed">
            A dedicated team of quantitative analysts and financial writers who oversee the AI's output, write deep-dive macroeconomic columns, and curate the daily featured articles.
          </p>
          <span className="inline-block px-3 py-1 bg-blue-500/10 text-blue-500 font-bold text-xs rounded-full">Human Analysts</span>
        </div>
      </div>
    </div>
  )
}

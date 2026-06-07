import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, BookOpen, ChevronDown, ChevronUp, CheckCircle, Circle,
  TrendingUp, BarChart2, Globe, Brain, Shield, Rocket,
  Flag, Zap, X
} from 'lucide-react'

// ── Tutorial Data ─────────────────────────────────────────────────────────────
const TUTORIALS = [
  // ── SECTION 1: Stock Market Basics ─────────────────────────────────────────
  {
    id: 'what-is-stock-market',
    section: 'basics',
    category: 'Basics',
    level: 'Beginner',
    title: 'What is the Stock Market?',
    duration: '5 min read',
    summary: 'The stock market is a marketplace where buyers and sellers trade shares of publicly listed companies. Learn about NSE, BSE, and how becoming a shareholder works.',
    content: `The stock market is a marketplace where buyers and sellers trade shares of publicly listed companies. In India, stocks are traded on two main exchanges:

NSE (National Stock Exchange) — India's largest stock exchange, located in Mumbai. The benchmark index is NIFTY 50 which tracks the top 50 companies.

BSE (Bombay Stock Exchange) — Asia's oldest stock exchange, established in 1875. The benchmark index is SENSEX which tracks the top 30 companies.

When you buy a share of Reliance Industries, you become a part-owner of that company. If the company grows and earns more profit, your shares become more valuable.`,
    keyConcepts: [
      { term: 'Share', def: 'A unit of ownership in a company' },
      { term: 'Stock Exchange', def: 'Platform where shares are traded' },
      { term: 'Index', def: 'A basket of top stocks (like Nifty 50)' },
      { term: 'Bull Market', def: 'When prices are rising overall' },
      { term: 'Bear Market', def: 'When prices are falling overall' },
    ],
  },
  {
    id: 'how-to-read-stock-price',
    section: 'basics',
    category: 'Basics',
    level: 'Beginner',
    title: 'How to Read a Stock Price',
    duration: '4 min read',
    summary: 'Understand stock symbols, price displays, change percentages, and what Open/High/Low/Close/Volume mean in practice.',
    content: `When you look at any stock on Arthiq, you see:

RELIANCE.NS — ₹1,347.80 — +43.20 (+3.31%) ▲

Breaking this down:
• RELIANCE.NS — The stock symbol (.NS = NSE listed)
• ₹1,347.80 — Current market price per share
• +43.20 — Price increase from yesterday's close
• +3.31% — Percentage increase
• ▲ — Green arrow means price went UP today

The price changes every second during market hours (Monday to Friday, 9:15 AM to 3:30 PM IST).

Pre-market session: 9:00 AM – 9:15 AM
Regular session: 9:15 AM – 3:30 PM
Post-market: 3:30 PM – 4:00 PM`,
    keyTable: [
      ['Open', 'Price at market open (9:15 AM)'],
      ['High', 'Highest price of the day'],
      ['Low', 'Lowest price of the day'],
      ['Close', 'Final price at 3:30 PM'],
      ['Volume', 'Number of shares traded today'],
      ['52W High', 'Highest price in last 52 weeks'],
      ['52W Low', 'Lowest price in last 52 weeks'],
    ],
  },
  {
    id: 'nse-vs-bse',
    section: 'basics',
    category: 'Basics',
    level: 'Beginner',
    title: 'NSE vs BSE — What\'s the Difference?',
    duration: '3 min read',
    summary: 'Both NSE and BSE are Indian stock exchanges with key differences in history, benchmarks, and usage. Learn which one matters for your investments.',
    content: `Both NSE and BSE are Indian stock exchanges but have key differences:

NSE (National Stock Exchange):
• Founded: 1992
• Benchmark: NIFTY 50
• Known for: Derivatives (F&O) trading
• Daily turnover: ₹50,000+ crore
• Most liquid exchange in India

BSE (Bombay Stock Exchange):
• Founded: 1875 (Asia's oldest)
• Benchmark: SENSEX (S&P BSE 30)
• Known for: Largest number of listed companies
• Listed companies: 5,000+

For most investors, you can buy the same stock on either exchange at nearly the same price. The difference (called arbitrage) is usually less than ₹0.10.

In Arthiq, we show NSE prices (.NS suffix) as NSE has higher liquidity.`,
  },
  {
    id: 'nifty-sensex',
    section: 'basics',
    category: 'Basics',
    level: 'Beginner',
    title: 'What is NIFTY 50 and SENSEX?',
    duration: '4 min read',
    summary: 'Market indices measure the overall health of the Indian stock market. Learn how NIFTY 50 and SENSEX work and how to use them as a benchmark.',
    content: `NIFTY 50 and SENSEX are market indices — they measure the overall health of the Indian stock market.

NIFTY 50:
• Tracks the top 50 companies on NSE
• Covers 13 sectors of the Indian economy
• If Nifty goes up → most large companies are up
• Managed by NSE Indices Limited
• Base value: 1000 (November 3, 1995)

SENSEX:
• Tracks the top 30 companies on BSE
• 'Sensitive Index' — hence the name SENSEX
• Base value: 100 (1978–79)
• Current value: ~77,000+ points

How to use indices:
If NIFTY falls 2% today → Indian market had a bad day
If your stock falls 1% but NIFTY fell 2% → your stock outperformed the market`,
    keyConcepts: [
      { term: 'NIFTY BANK', def: 'Banking stocks benchmark' },
      { term: 'NIFTY IT', def: 'Technology companies benchmark' },
      { term: 'NIFTY PHARMA', def: 'Pharmaceutical sector benchmark' },
      { term: 'NIFTY AUTO', def: 'Automobile sector benchmark' },
    ],
  },

  // ── SECTION 2: Understanding Stock Analysis ─────────────────────────────────
  {
    id: 'what-is-fundamental-analysis',
    section: 'analysis',
    category: 'Fundamental Analysis',
    level: 'Intermediate',
    title: 'What is Fundamental Analysis?',
    duration: '7 min read',
    summary: 'Fundamental analysis studies a company\'s financial health. Learn P/E ratio, revenue, debt-to-equity, ROE, and market cap — the five key metrics.',
    content: `Fundamental analysis means studying a company's financial health to decide if its stock is worth buying.

1. P/E RATIO (Price to Earnings Ratio)
Formula: Current Price ÷ Earnings Per Share
Example: Reliance at ₹1,347 with EPS of ₹92 = P/E of 14.6
• P/E of 10–15 = Potentially undervalued
• P/E of 20–25 = Fairly valued
• P/E of 30+ = Expensive or high-growth stock
• Always compare P/E with industry average

2. REVENUE & NET PROFIT
Revenue = Total money company earned
Net Profit = Money left after all expenses
Look for: Consistent growth year over year
Red flag: Revenue growing but profit falling

3. DEBT TO EQUITY RATIO
Formula: Total Debt ÷ Shareholders Equity
• Below 1 = Low debt (generally good)
• Above 2 = High debt (risky in tough times)
• 0 = Debt-free company (very strong)

4. ROE (Return on Equity)
Formula: Net Profit ÷ Shareholders Equity × 100
• ROE of 15%+ = Good business
• ROE of 20%+ = Excellent business
• Compare with bank FD rate (6–7%)

5. MARKET CAPITALIZATION
Formula: Current Price × Total Shares Outstanding
• Large Cap: Market cap > ₹20,000 crore (Reliance, TCS)
• Mid Cap: ₹5,000 – ₹20,000 crore
• Small Cap: Below ₹5,000 crore

In Arthiq: All these metrics are shown in the Key Statistics section of any company page.`,
  },
  {
    id: 'how-to-read-charts',
    section: 'analysis',
    category: 'Technical Analysis',
    level: 'Intermediate',
    title: 'How to Read Stock Charts',
    duration: '8 min read',
    summary: 'Technical analysis uses price charts and patterns to predict future movements. Learn candlestick charts, support/resistance levels, and moving averages.',
    content: `Technical analysis uses price charts and patterns to predict future stock movements.

TYPES OF CHARTS:

1. Line Chart
Simply connects closing prices. Best for: Quick trend overview.

2. Candlestick Chart (most popular)
Each candle shows 4 prices: Open, High, Low, Close

GREEN candle (Bullish): Close is HIGHER than Open = buyers won today
RED candle (Bearish): Open is HIGHER than Close = sellers won today

The wicks (thin lines) show the High and Low extremes of the day.

3. SUPPORT & RESISTANCE LEVELS
Support = Price level where stock stops falling (buyers step in)
Resistance = Price level where stock stops rising (sellers step in)

When support breaks → stock may fall further
When resistance breaks → stock may rise further

KEY INDICATORS:
Moving Average (MA):
• 20-day MA = Average price of last 20 days
• 50-day MA = Average price of last 50 days
• If price > MA → bullish trend
• If price < MA → bearish trend

Golden Cross: 50-day MA crosses above 200-day MA = Strong buy signal
Death Cross: 50-day MA crosses below 200-day MA = Strong sell signal

In Arthiq: We show 20-day MA overlay on all charts.`,
  },
  {
    id: 'rsi-and-volume',
    section: 'analysis',
    category: 'Technical Analysis',
    level: 'Intermediate',
    title: 'Understanding RSI and Volume',
    duration: '6 min read',
    summary: 'RSI and Volume are two of the most important indicators for Indian stock traders. Learn how to interpret them and spot strong vs. weak moves.',
    content: `RSI (Relative Strength Index):
• Scale: 0 to 100
• RSI above 70 = OVERBOUGHT (stock may fall soon)
• RSI below 30 = OVERSOLD (stock may rise soon)
• RSI between 40–60 = NEUTRAL

How RSI works: RSI measures how fast and how much a stock's price has changed recently. High RSI = strong recent buying pressure. Low RSI = strong recent selling pressure.

VOLUME:
Volume = Number of shares traded in a day

Volume rules:
• Price UP + High Volume = Strong bullish move ✓
• Price UP + Low Volume = Weak, may not sustain ⚠
• Price DOWN + High Volume = Strong bearish move ✗
• Price DOWN + Low Volume = Weak selling pressure

Unusual Volume alert:
If volume is 2x or more than average → Something significant is happening:
• Quarterly results announced
• Major news (acquisition, contract)
• FII/DII bulk buying or selling
• Operator activity (be careful)

In Arthiq: Our AI detects unusual volume and includes it in the stock analysis.`,
  },

  // ── SECTION 3: Indian Market Specific ─────────────────────────────────────
  {
    id: 'fii-and-dii',
    section: 'indian',
    category: 'Indian Markets',
    level: 'Intermediate',
    title: 'FII and DII — Who Moves Indian Markets?',
    duration: '6 min read',
    summary: 'FII and DII flows are crucial for Indian investors. Foreign and domestic institutional investors can move the entire Nifty. Learn how to track them.',
    content: `Understanding FII and DII flows is CRUCIAL for Indian stock market investors.

FII (Foreign Institutional Investors):
Who: Foreign banks, hedge funds, pension funds investing in Indian stocks
Examples: BlackRock, Vanguard, Morgan Stanley
Impact: HUGE — FIIs hold 20–25% of NSE stocks

When FIIs BUY Indian stocks:
→ Demand increases → Stock prices rise
→ Indian Rupee strengthens (dollars flowing in)
→ Nifty usually goes up

When FIIs SELL Indian stocks:
→ Supply increases → Stock prices fall
→ Indian Rupee weakens (dollars flowing out)
→ Nifty usually goes down

DII (Domestic Institutional Investors):
Who: Indian mutual funds, insurance companies, banks
Examples: SBI MF, HDFC MF, LIC, ICICI Pru
Impact: Counter-balance to FIIs

When FIIs sell → DIIs usually BUY (SIP money provides steady buying)
This is why Indian market is more stable now.

Key insight: If a stock has high FII ownership (25%+) it is more volatile when FIIs sell globally.

In Arthiq ownership section: FII% = total FII ownership in a stock, DII% = total DII ownership.`,
  },
  {
    id: 'how-rbi-affects-stocks',
    section: 'indian',
    category: 'Indian Markets',
    level: 'Intermediate',
    title: 'How RBI Affects Your Stocks',
    duration: '5 min read',
    summary: 'The Reserve Bank of India\'s interest rate decisions directly impact your portfolio. Learn how repo rate changes flow through to stock prices.',
    content: `The Reserve Bank of India (RBI) is India's central bank. Its decisions directly impact your stock portfolio.

RBI MPC (Monetary Policy Committee) meets every 2 months and decides interest rates.

REPO RATE = Rate at which RBI lends to banks

When RBI RAISES rates (hawkish):
→ Banks raise loan interest rates → Companies pay more for debt
→ Consumer spending decreases → Company profits may fall
→ STOCK MARKET usually FALLS

When RBI CUTS rates (dovish):
→ Loans become cheaper → Companies invest and expand
→ Consumer spending increases → Company profits may rise
→ STOCK MARKET usually RISES

Sectors most affected by rate changes:

Rate SENSITIVE (fall when rates rise):
• Banks & NBFCs
• Real Estate
• Auto (car loans become expensive)
• Infrastructure (capital-intensive)

Rate RESISTANT (less affected):
• IT companies (minimal debt)
• FMCG (essentials — demand stable)
• Pharma (healthcare demand constant)

In Arthiq: Economic Calendar shows upcoming RBI MPC meeting dates.`,
  },
  {
    id: 'understanding-ipos',
    section: 'indian',
    category: 'Indian Markets',
    level: 'Intermediate',
    title: 'Understanding IPOs in India',
    duration: '5 min read',
    summary: 'IPOs are when private companies list on Indian exchanges. Learn how the allotment process works, what GMP means, and how to evaluate whether to apply.',
    content: `IPO (Initial Public Offering) is when a private company sells shares to the public for the first time.

HOW AN IPO WORKS:
1. Company decides to go public
2. Hires investment banks (book runners)
3. SEBI approval required
4. Sets price band (e.g. ₹400–420 per share)
5. IPO open for 3 days (investors apply)
6. Allotment (not everyone gets shares)
7. Listing on NSE/BSE

TYPES:
• Fresh Issue: Company raises new money
• Offer for Sale: Existing shareholders sell shares

HOW TO APPLY FOR AN IPO:
Through your broker's app (Zerodha, Groww etc.)
Using UPI to block funds (not deducted until allotment)
Minimum application: 1 lot (usually 10–15 shares)

GREY MARKET PREMIUM (GMP):
Unofficial indicator of expected listing price.
High GMP = strong demand = likely good listing.
Not official — use as rough indicator only.

LISTING GAIN vs LONG TERM INVESTING:
Some IPOs list at 50–100% premium on day 1.
Others list below issue price.
Research the company before applying — don't apply just because others are.`,
  },

  // ── SECTION 4: Forex & Currency ─────────────────────────────────────────────
  {
    id: 'what-is-forex',
    section: 'forex',
    category: 'Forex',
    level: 'Intermediate',
    title: 'What is Forex Trading?',
    duration: '5 min read',
    summary: 'Forex is the global currency market. Understand how USD/INR moves, which Indian sectors benefit from a weak rupee, and why FII flows matter for the rupee.',
    content: `Forex (Foreign Exchange) is the global market for trading currencies.

USD/INR = 93.15 means: 1 US Dollar = 93.15 Indian Rupees

MAJOR PAIRS for Indian investors:
• USD/INR — Most important (dollar vs rupee)
• EUR/INR — Euro vs Rupee
• GBP/INR — British Pound vs Rupee
• JPY/INR — Japanese Yen vs Rupee

HOW RUPEE AFFECTS INDIAN STOCKS:

Rupee WEAKENS (e.g. USD/INR goes from 83 to 93):
BAD for: Oil companies, companies with dollar debt, importers
GOOD for: IT companies (earn in dollars), pharmaceutical exporters, other exporters

Rupee STRENGTHENS (USD/INR falls):
Opposite effects apply.

WHY DOES RUPEE MOVE?
• FII flows (FIIs bring/take dollars)
• Oil prices (India imports 85% of oil)
• RBI intervention (buys/sells dollars)
• US Federal Reserve decisions
• Global risk sentiment

In Arthiq:
• Forex page shows live USD/INR, EUR/INR, GBP/INR
• AI analysis mentions rupee impact when relevant`,
  },

  // ── SECTION 5: Using Arthiq's AI Features ──────────────────────────────────
  {
    id: 'how-to-use-why-did-this-stock-move',
    section: 'arthiq',
    category: 'AI & Tools',
    level: 'Beginner',
    title: "How to Use 'Why Did This Stock Move?'",
    duration: '3 min read',
    summary: "Arthiq's AI explains stock price movements using news and market data. Learn how to use it, read confidence levels, and interpret key factor tags.",
    content: `Arthiq's most powerful feature is the AI explanation of stock movements.

HOW TO USE IT:
1. Go to any company page (e.g. /company/RELIANCE.NS)
2. Look for 'AI Analysis' panel on right side
3. Click 'View AI Insights' button
4. Select 'Why It Moved' tab
5. Wait 2–3 seconds for AI to analyze

WHAT THE AI ANALYZES:
• Last 7 days price movement
• Recent news headlines (10+ articles)
• Broader market trend
• Sector performance

UNDERSTANDING CONFIDENCE LEVELS:
• HIGH — Strong news correlation found
• MEDIUM — Some news found, trend is clear
• LOW — Limited news data, technical move only

KEY FACTORS TAGS:
Green tags = Positive factors (buying reasons)
Red tags = Negative factors (selling reasons)`,
  },
  {
    id: 'understanding-2-4-week-outlook',
    section: 'arthiq',
    category: 'AI & Tools',
    level: 'Intermediate',
    title: 'Understanding the 2–4 Week Outlook',
    duration: '4 min read',
    summary: "Arthiq's AI price prediction combines technical analysis with news sentiment. Learn to read bullish/bearish/neutral outlooks and price target ranges.",
    content: `The 2–4 Week Outlook is Arthiq's AI price prediction feature.

HOW IT WORKS:
1. AI analyzes 30 days of price history
2. Calculates technical signals: 7-day and 14-day price trend, price vs 30-day moving average, volume trend
3. Reads 15 recent news headlines
4. Considers Indian market factors: RBI policy, FII flows, sector rotation
5. Generates structured outlook

READING THE OUTLOOK:
• BULLISH ↑ (Green): AI expects price to rise in 2–4 weeks
• BEARISH ↓ (Red): AI expects price to fall in 2–4 weeks
• NEUTRAL → (Saffron): AI sees mixed signals, no clear direction

RECOMMENDATION LEVELS:
• STRONG BUY = Very strong bullish signal
• BUY = Positive outlook
• HOLD = Stay invested but don't add more
• SELL = Consider reducing position
• STRONG SELL = Strong bearish signal

IMPORTANT DISCLAIMER:
AI predictions are based on historical patterns and news sentiment. They are NOT guaranteed. Always do your own additional research and never invest more than you can afford to lose.`,
  },
  {
    id: 'how-to-search-stocks',
    section: 'arthiq',
    category: 'AI & Tools',
    level: 'Beginner',
    title: 'How to Search and Find Any Stock',
    duration: '2 min read',
    summary: 'Three methods to find any NSE stock on Arthiq — search bar, browse all stocks, and market movers. Plus a guide to reading stock symbols.',
    content: `Finding stocks on Arthiq is simple:

METHOD 1 — Search bar (top of every page)
Type company name: 'Reliance' or 'HDFC'
OR type symbol: 'RELIANCE.NS' or 'TCS.NS'
Results appear instantly as you type.

METHOD 2 — Browse All Stocks (/stocks page)
Filter by sector: Banking, IT, Pharma etc.
Sort by: Price, Gainers, Losers, Volume
Click any stock to see full analysis.

METHOD 3 — Market Movers (Dashboard)
Top Gainers → Stocks rising most today
Top Losers → Stocks falling most today
Most Active → Most traded stocks today

UNDERSTANDING STOCK SYMBOLS:
• .NS suffix = NSE listed (most common)
• .BO suffix = BSE listed`,
    keyTable: [
      ['RELIANCE.NS', 'Reliance Industries'],
      ['TCS.NS', 'Tata Consultancy Services'],
      ['INFY.NS', 'Infosys'],
      ['HDFCBANK.NS', 'HDFC Bank'],
      ['ICICIBANK.NS', 'ICICI Bank'],
      ['SBIN.NS', 'State Bank of India'],
      ['BAJFINANCE.NS', 'Bajaj Finance'],
      ['ZOMATO.NS', 'Zomato'],
    ],
  },

  // ── SECTION 6: Risk Management ─────────────────────────────────────────────
  {
    id: 'golden-rules-investing',
    section: 'risk',
    category: 'Risk Management',
    level: 'Beginner',
    title: 'Golden Rules of Stock Market Investing',
    duration: '5 min read',
    summary: 'Eight rules that protect your money in the Indian stock market — from diversification to understanding taxes on capital gains.',
    content: `RULE 1: Never invest money you need in 6 months
Stock market requires patience. Keep emergency fund in FD or savings.

RULE 2: Diversify across sectors
Example portfolio spread:
• Banking: 20% • IT: 20% • FMCG: 15% • Pharma: 15% • Auto: 10% • Others: 20%

RULE 3: Understand what you're buying
Before buying any stock, know: What does this company do? Is it profitable? What is its P/E ratio vs sector?

RULE 4: Invest in SIP style for long term
Invest fixed amount monthly (Rupee Cost Averaging).
You buy more shares when price is low.

RULE 5: Ignore short-term noise
Good companies recover from temporary falls.
Selling in panic locks in losses.

RULE 6: Never invest on tips
WhatsApp tips, YouTube tips = high risk.
Most 'tips' benefit the tipster, not you.

RULE 7: Understand taxation
• Short-term capital gains (< 1 year): 20% tax
• Long-term capital gains (> 1 year): 12.5% (above ₹1.25 lakh exemption)

RULE 8: Keep records
Track every buy/sell for ITR filing.`,
  },
  {
    id: 'how-to-read-ai-risk-levels',
    section: 'risk',
    category: 'Risk Management',
    level: 'Intermediate',
    title: 'How to Read AI Risk Levels on Arthiq',
    duration: '3 min read',
    summary: "Every company analysis shows a Risk Level: LOW, MEDIUM, or HIGH. Learn what factors Arthiq's AI uses to calculate each level and how to act on them.",
    content: `Every company analysis on Arthiq shows a RISK LEVEL indicator: LOW, MEDIUM, or HIGH.

HOW WE CALCULATE RISK:

LOW RISK indicators:
• Large market cap (Nifty 50 company)
• Low debt-to-equity ratio
• Consistent dividend history
• Price in normal range (not extreme RSI)
• Strong promoter holding (45%+)

MEDIUM RISK indicators:
• Mid-cap company
• Some debt present
• Recent price volatility
• Mixed FII/DII activity
• Sector facing headwinds

HIGH RISK indicators:
• Small-cap or micro-cap company
• High debt levels
• Recent sharp price movement (up or down)
• Unusual volume activity
• Negative news sentiment
• Low promoter holding

WHAT TO DO WITH RISK LEVELS:
• LOW RISK — Suitable for long-term investing
• MEDIUM RISK — Suitable for investors with 2+ year horizon
• HIGH RISK — Only for experienced investors who deeply understand the company

Remember: High risk does not always mean bad. Some high-risk stocks give the highest returns — but only if you truly understand the business.`,
  },

  // ── SECTION 7: Advanced Topics ──────────────────────────────────────────────
  {
    id: 'reading-quarterly-results',
    section: 'advanced',
    category: 'Fundamental Analysis',
    level: 'Advanced',
    title: 'Reading Quarterly Results Like a Pro',
    duration: '8 min read',
    summary: 'Quarterly results move stocks 5–20%. Learn to analyse revenue growth, PAT, EBITDA margins, EPS beats/misses, and management commentary like an analyst.',
    content: `Every 3 months, listed companies announce quarterly results. This is when stocks move 5–20%.

WHAT TO LOOK FOR IN RESULTS:

1. REVENUE (Sales) GROWTH
Compare with: Last quarter (QoQ) and same quarter last year (YoY).
Good: Revenue growing 10%+ YoY consistently.

2. NET PROFIT (PAT) GROWTH
More important than revenue.
Look for: PAT growing faster than revenue.

3. EBITDA MARGIN
EBITDA ÷ Revenue × 100 = EBITDA Margin %
Expanding margin = Company becoming more efficient
Contracting margin = Rising costs or pricing pressure

4. EPS (Earnings Per Share)
If analysts expected EPS of ₹50 and company delivered ₹65 → BEAT expectations → Stock usually rises 5–15%
If delivered ₹35 vs ₹50 expected → MISSED → Stock usually falls 5–20%

5. MANAGEMENT COMMENTARY
Read the press release, not just numbers.
What are they saying about next quarter?
Any new contracts, expansions, challenges?

6. ORDER BOOK (for infra/manufacturing)
Growing order book = Future revenue visibility.

In Arthiq: Financial Summary section shows quarterly data. AI analysis mentions earnings in price outlook.`,
  },
  {
    id: 'promoter-shareholding-changes',
    section: 'advanced',
    category: 'Technical Analysis',
    level: 'Advanced',
    title: 'Understanding Promoter Shareholding Changes',
    duration: '6 min read',
    summary: 'Promoter stake changes are one of the most important signals for Indian investors. Learn pledge risk, FII/DII changes, and how to read the ownership section.',
    content: `WHAT IS PROMOTER HOLDING?
Promoters = Founders/owners/controlling family.
In India: Most large companies have 40–75% promoter holding.

SIGNALS TO WATCH:

PROMOTER INCREASING stake:
→ They believe stock is undervalued
→ Very bullish signal (especially if pledging less)

PROMOTER DECREASING stake:
→ Could be routine or concerning
→ Must investigate WHY they are selling

PROMOTER PLEDGE:
Promoters pledge shares as loan collateral.
High pledge (>50% of promoter holding) = RISKY.
If stock falls → lenders sell pledged shares → more selling → stock falls further.
This is called 'pledge cascade risk'.

FII HOLDING CHANGES:
FIIs increase holding → Global confidence in India
FIIs decrease → Risk-off, global selling

DII HOLDING CHANGES:
DIIs increase → Domestic SIP money flowing in
DIIs decrease → Mutual funds booking profits

IN ARTHIQ:
Shareholding Pattern section shows Promoter%, FII%, DII%, Retail%.
Compare across quarters to spot changes.`,
  },
]

// ── Category pills config ─────────────────────────────────────────────────────
const CATEGORY_STYLE = {
  'Basics':                 'bg-slate-100 text-slate-700 border-slate-200',
  'Stock Market':           'bg-blue-50 text-blue-700 border-blue-200',
  'Technical Analysis':     'bg-purple-50 text-purple-700 border-purple-200',
  'Fundamental Analysis':   'bg-green-50 text-green-700 border-green-200',
  'Forex':                  'bg-teal-50 text-teal-700 border-teal-200',
  'AI & Tools':             'bg-amber-50 text-amber-700 border-amber-200',
  'Indian Markets':         'bg-orange-50 text-orange-700 border-orange-200',
  'Risk Management':        'bg-red-50 text-red-700 border-red-200',
}

const LEVEL_STYLE = {
  'Beginner':     'bg-india-green text-white',
  'Intermediate': 'bg-saffron text-white',
  'Advanced':     'bg-purple-600 text-white',
}

const SECTION_META = {
  basics:   { icon: '📈', title: 'Stock Market Basics',           badge: 'BEGINNER',        badgeClass: 'bg-india-green text-white', sub: "Start here if you're new to investing" },
  analysis: { icon: '🔍', title: 'Understanding Stock Analysis',   badge: 'INTERMEDIATE',    badgeClass: 'bg-saffron text-white',      sub: 'Technical and fundamental analysis for smarter decisions' },
  indian:   { icon: '🇮🇳', title: 'Indian Markets — Unique Concepts', badge: 'INTERMEDIATE', badgeClass: 'bg-saffron text-white',      sub: 'FII/DII, RBI policy, IPOs specific to Indian markets' },
  forex:    { icon: '💱', title: 'Forex & Currency Markets',       badge: 'INTERMEDIATE',    badgeClass: 'bg-saffron text-white',      sub: 'How currency movements affect your Indian portfolio' },
  arthiq:   { icon: '🤖', title: "Using Arthiq's AI Features",     badge: 'ARTHIQ SPECIFIC', badgeClass: 'bg-blue-700 text-white',     sub: 'Get the most out of every feature on the platform' },
  risk:     { icon: '⚠️', title: 'Risk Management',               badge: 'IMPORTANT',       badgeClass: 'bg-negative text-white',     sub: 'Protect your capital with these essential principles' },
  advanced: { icon: '🚀', title: 'Advanced Topics',               badge: 'ADVANCED',        badgeClass: 'bg-purple-600 text-white',    sub: 'Deep dives for experienced investors' },
}

const SECTION_ORDER = ['basics', 'analysis', 'indian', 'forex', 'arthiq', 'risk', 'advanced']

const ALL_CATEGORIES = ['All', 'Basics', 'Stock Market', 'Technical Analysis', 'Fundamental Analysis', 'Forex', 'AI & Tools', 'Indian Markets', 'Risk Management']

// ── Tutorial Card ─────────────────────────────────────────────────────────────
function TutorialCard({ tutorial, isExpanded, onToggle, isRead, onMarkRead }) {
  const { id, category, level, title, duration, summary, content, keyConcepts, keyTable } = tutorial

  return (
    <div
      id={id}
      className={`glass-card overflow-hidden transition-all duration-300 ${isRead ? 'border-india-green/30' : ''}`}
    >
      {/* Card Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${CATEGORY_STYLE[category] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {category}
            </span>
            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${LEVEL_STYLE[level] || 'bg-gray-500 text-white'}`}>
              {level}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isRead && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-india-green">
                <CheckCircle size={12} /> Read
              </span>
            )}
            <span className="text-[11px] text-text-muted whitespace-nowrap">{duration}</span>
          </div>
        </div>

        <h3 className="text-base font-bold text-text-primary mb-2 leading-snug">{title}</h3>
        <p className="text-sm text-text-muted leading-relaxed">{summary}</p>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border animate-in">
          <div className="p-5 space-y-5">
            {/* Main content */}
            <div className="bg-bg-secondary rounded-xl p-5 border border-border/50">
              {content.split('\n').map((line, i) => {
                if (!line.trim()) return <div key={i} className="h-2" />
                const isBullet = line.startsWith('•') || line.startsWith('-')
                const isHeading = /^[A-Z][A-Z\s()&/]+:/.test(line.trim()) && !isBullet
                return (
                  <p key={i} className={`text-sm leading-relaxed ${
                    isHeading
                      ? 'font-bold text-text-primary mt-3 mb-1'
                      : isBullet
                      ? 'text-text-secondary ml-3'
                      : 'text-text-secondary'
                  }`}>
                    {line}
                  </p>
                )
              })}
            </div>

            {/* Key Concepts */}
            {keyConcepts && (
              <div className="border-l-4 border-saffron bg-bg-card rounded-r-xl p-4">
                <h4 className="text-xs font-bold uppercase text-saffron tracking-wider mb-3">Key Concepts</h4>
                <div className="space-y-2">
                  {keyConcepts.map((kc, i) => (
                    <div key={i} className="flex gap-2 items-baseline">
                      <span className="w-2 h-2 rounded-full bg-saffron shrink-0 mt-1.5" />
                      <div className="text-sm">
                        <span className="font-semibold text-text-primary">{kc.term}</span>
                        <span className="text-text-muted"> — {kc.def}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Table */}
            {keyTable && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <tbody>
                    {keyTable.map(([key, val], i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4 font-semibold text-text-primary whitespace-nowrap w-1/3">{key}</td>
                        <td className="py-2 text-text-muted">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mark as read */}
            {!isRead && (
              <button
                onClick={() => onMarkRead(id)}
                className="flex items-center gap-2 text-xs font-semibold text-india-green hover:text-india-green/80 transition-colors border border-india-green/30 px-3 py-2 rounded-lg hover:bg-india-green/5"
              >
                <CheckCircle size={13} /> Mark as Read ✓
              </button>
            )}
          </div>
        </div>
      )}

      {/* Card Footer */}
      <div className="px-5 pb-4">
        <button
          onClick={() => onToggle(id)}
          className={`flex items-center gap-2 text-sm font-bold transition-colors ${
            isExpanded ? 'text-text-muted hover:text-saffron' : 'text-saffron hover:text-saffron-dark'
          }`}
        >
          {isExpanded ? (
            <><ChevronUp size={14} /> Collapse ↑</>
          ) : (
            <><ChevronDown size={14} /> Read Full Tutorial →</>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ sectionKey }) {
  const meta = SECTION_META[sectionKey]
  if (!meta) return null
  return (
    <div className="mb-6 mt-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-3xl">{meta.icon}</span>
        <h2 className="text-xl font-bold text-text-primary">{meta.title}</h2>
        <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${meta.badgeClass}`}>
          {meta.badge}
        </span>
      </div>
      <p className="text-sm text-text-muted mt-1 ml-12">{meta.sub}</p>
    </div>
  )
}

// ── Main Tutorial Page ────────────────────────────────────────────────────────
export default function Tutorial() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [expandedId, setExpandedId] = useState(null)
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('arthiq_read_tutorials') || '[]')
    } catch { return [] }
  })

  useEffect(() => {
    document.title = 'Learning Center | ArthiQ'
    return () => { document.title = 'ArthiQ' }
  }, [])

  // Persist read status
  useEffect(() => {
    localStorage.setItem('arthiq_read_tutorials', JSON.stringify(readIds))
  }, [readIds])

  const handleToggle = (id) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  const handleMarkRead = (id) => {
    setReadIds(prev => prev.includes(id) ? prev : [...prev, id])
  }

  // Filter tutorials
  const filtered = TUTORIALS.filter(t => {
    const matchCat = activeCategory === 'All' || t.category === activeCategory
    const matchSearch = !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.summary.toLowerCase().includes(search.toLowerCase()) ||
      t.content.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  // Group by section
  const grouped = SECTION_ORDER.reduce((acc, key) => {
    const items = filtered.filter(t => t.section === key)
    if (items.length) acc[key] = items
    return acc
  }, {})

  const totalRead = readIds.length
  const totalTutorials = TUTORIALS.length
  const progressPct = Math.round((totalRead / totalTutorials) * 100)

  const LEVEL_ANCHORS = [
    { label: 'Beginner', section: 'basics', color: 'text-india-green border-india-green' },
    { label: 'Intermediate', section: 'analysis', color: 'text-saffron border-saffron' },
    { label: 'Advanced', section: 'advanced', color: 'text-purple-500 border-purple-500' },
    { label: 'Expert', section: 'advanced', color: 'text-blue-500 border-blue-500' },
  ]

  return (
    <div className="w-full px-6 lg:px-10 xl:px-16 py-8">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-saffron/10 text-saffron px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-4 border border-saffron/20">
          <BookOpen size={12} /> Learning Center
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight mb-3">
          Master the Indian Stock Market
        </h1>
        <p className="text-text-secondary text-base max-w-2xl mx-auto">
          From complete beginner to confident investor — {totalTutorials} tutorials covering everything you need to know about NSE, BSE, Nifty, and the ArthiQ platform.
        </p>

        {/* Search bar */}
        <div className="relative max-w-xl mx-auto mt-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tutorials… (e.g. P/E ratio, candlestick, FII)"
            className="w-full pl-10 pr-10 py-3 bg-bg-card border border-border rounded-xl text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-saffron focus:ring-1 focus:ring-saffron/30 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Result count */}
        {search && (
          <p className="text-sm text-text-muted mt-2">
            {filtered.length === 0
              ? `No tutorials found for "${search}"`
              : `Showing ${filtered.length} of ${totalTutorials} tutorials`}
          </p>
        )}
      </div>

      {/* ── Progress Bar ────────────────────────────────────────────────── */}
      <div className="glass-card p-5 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-text-primary">Your Learning Progress</span>
              <span className="text-sm font-semibold text-saffron">{totalRead} / {totalTutorials} completed</span>
            </div>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-saffron to-india-green rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Level anchors */}
          <div className="flex gap-2 sm:ml-6 flex-wrap">
            {LEVEL_ANCHORS.map(({ label, section }) => (
              <a
                key={label}
                href={`#section-${section}`}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors hover:bg-saffron/5 ${
                  label === 'Beginner' ? 'border-india-green text-india-green' :
                  label === 'Intermediate' ? 'border-saffron text-saffron' :
                  label === 'Advanced' ? 'border-purple-500 text-purple-500' :
                  'border-blue-500 text-blue-500'
                }`}
              >
                {label}
              </a>
            ))}
            {totalRead > 0 && (
              <button
                onClick={() => { setReadIds([]); localStorage.removeItem('arthiq_read_tutorials') }}
                className="text-xs text-text-muted hover:text-negative transition-colors border border-border px-3 py-1.5 rounded-lg"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Category Filter Tabs ─────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8 no-scrollbar">
        {ALL_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-saffron text-white border-saffron shadow-sm'
                : 'border-border text-text-secondary hover:border-saffron/50 hover:text-saffron bg-bg-card'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Tutorial Sections ──────────────────────────────────────────── */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-24 text-text-muted">
          <Search size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold">No tutorials found</p>
          <p className="text-sm mt-1">Try a different search term or category</p>
        </div>
      ) : (
        <div className="space-y-14">
          {SECTION_ORDER.filter(key => grouped[key]).map(sectionKey => (
            <section key={sectionKey} id={`section-${sectionKey}`}>
              <SectionHeader sectionKey={sectionKey} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {grouped[sectionKey].map(tutorial => (
                  <TutorialCard
                    key={tutorial.id}
                    tutorial={tutorial}
                    isExpanded={expandedId === tutorial.id}
                    onToggle={handleToggle}
                    isRead={readIds.includes(tutorial.id)}
                    onMarkRead={handleMarkRead}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── Footer note ────────────────────────────────────────────────── */}
      <div className="mt-16 py-6 border-t border-border text-center">
        <p className="text-sm text-text-muted">
          All tutorials are for educational purposes only and do not constitute financial advice.
          {' '}
          <Link to="/risk-warning" className="text-saffron hover:underline">Read our Risk Warning →</Link>
        </p>
      </div>
    </div>
  )
}


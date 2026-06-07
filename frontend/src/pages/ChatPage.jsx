import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Send, Bot, User, RefreshCw, AlertTriangle, ArrowLeft, ArrowUpRight, Shield, Award, CheckCircle } from 'lucide-react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Custom animated robot character component
const AnimatedRobot = ({ className = "w-10 h-10", isMini = false }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} ${!isMini ? 'animate-bob' : ''} transition-all`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Robot Head Base */}
      <rect x="15" y="25" width="70" height="55" rx="20" fill="#FF9933" stroke="#e6830a" strokeWidth="4" />
      
      {/* Robot Ears */}
      <rect x="5" y="42" width="10" height="20" rx="3" fill="#e6830a" />
      <rect x="85" y="42" width="10" height="20" rx="3" fill="#e6830a" />
      
      {/* Antenna */}
      {!isMini && (
        <>
          <rect x="47" y="10" width="6" height="15" fill="#e6830a" />
          <circle cx="50" cy="8" r="6" fill="#FF9933" className="animate-pulse" />
        </>
      )}
      
      {/* Screen Face */}
      <rect x="23" y="33" width="54" height="38" rx="10" fill="#0f172a" />
      
      {/* Eyes */}
      <g className="animate-blink">
        <circle cx="38" cy="50" r="6" fill="#00ffcc" />
        <circle cx="62" cy="50" r="6" fill="#00ffcc" />
      </g>
      
      {/* Smile/Mouth */}
      <path d="M 40 62 Q 50 68 60 62" stroke="#00ffcc" strokeWidth="3" strokeLinecap="round" fill="transparent" />
    </svg>
  )
}

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: `Namaste! 🙏 I'm ArthiqAI Assistant — your smart investment companion.

Here's what I can do for you right now:

📈 Live stock prices & market snapshot
🔍 Deep analysis of any NSE/BSE stock
💡 Investment suggestions (short, medium & long term)
📰 Latest market news & earnings updates
💰 Mutual fund & SIP recommendations
🎯 Portfolio review & strategy

What would you like to explore today?`
}

const STARTER_PROMPTS = [
  { text: "What is the live price of RELIANCE.NS?", label: "Stock Quote" },
  { text: "Get the latest market news on Nifty 50", label: "Market News" },
  { text: "Show info for Mirae Asset Large Cap Fund", label: "Mutual Funds" },
  { text: "Explain P/E Ratio with HDFC Bank as example", label: "Learn Concepts" },
]

export default function ChatPage() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return

    const userMessage = { role: 'user', content: text }
    const updatedMessages = [...messages, userMessage]
    
    setMessages(updatedMessages)
    setIsLoading(true)
    setErrorMsg(null)

    try {
      const response = await axios.post(`${API_BASE}/api/chat`, {
        messages: updatedMessages.map(m => ({ role: m.role, content: m.content }))
      })
      
      if (response.data && response.data.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.data.content }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I did not receive a response.' }])
      }
    } catch (err) {
      console.error('Chat page error:', err)
      setErrorMsg('I\'m having trouble connecting to my servers right now. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = (e) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    const text = inputValue
    setInputValue('')
    sendMessage(text)
  }

  const handleClear = () => {
    setMessages([INITIAL_MESSAGE])
    setErrorMsg(null)
  }

  return (
    <div className="w-full px-6 lg:px-10 xl:px-16 py-6 min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Back Button */}
      <Link to="/" className="inline-flex items-center gap-2 text-base font-bold text-text-secondary hover:text-saffron transition-colors mb-6 shrink-0">
        <ArrowLeft size={16} className="stroke-[3px]" /> Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 flex-1 items-stretch max-h-[720px]">
        {/* Left Info Panel */}
        <div className="flex flex-col gap-4">
          <div className="card p-5 flex flex-col justify-between h-full bg-gradient-to-b from-white to-slate-50/50">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-saffron/15 flex items-center justify-center overflow-hidden">
                  <AnimatedRobot className="w-8 h-8" isMini={false} />
                </div>
                <div>
                  <h1 className="text-lg font-black text-text-primary leading-tight">ArthiqAI Assistant</h1>
                  <span className="text-xs text-saffron font-extrabold uppercase tracking-wider mt-0.5 block">India's Trusted AI Companion</span>
                </div>
              </div>

              <p className="text-sm font-semibold text-text-primary mb-5 leading-relaxed">
                Welcome to ArthiqAI's dedicated AI terminal. Ask about Indian stocks, mutual funds, market news, or learn key financial ratios with real-world examples.
              </p>

              {/* Starter prompts */}
              <div className="space-y-2.5 mb-6">
                <div className="text-xs font-extrabold text-text-secondary uppercase tracking-widest mb-1">Suggested Prompts</div>
                {STARTER_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!isLoading) {
                        sendMessage(prompt.text)
                      }
                    }}
                    disabled={isLoading}
                    className="w-full text-left p-3.5 rounded-xl border border-border bg-white hover:border-saffron hover:bg-saffron/[0.02] active:scale-[0.99] transition-all flex items-start justify-between group disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <span className="text-xs text-saffron font-extrabold block tracking-wide mb-1 uppercase">{prompt.label}</span>
                      <p className="text-sm font-bold text-text-primary truncate leading-snug">{prompt.text}</p>
                    </div>
                    <ArrowUpRight size={16} className="text-text-secondary group-hover:text-saffron shrink-0 mt-2.5 transition-colors stroke-[2.5px]" />
                  </button>
                ))}
              </div>
            </div>

            {/* Disclaimer & Trust badges */}
            <div className="border-t border-border pt-4 mt-auto">
              <div className="flex items-center gap-2 text-xs text-text-secondary font-extrabold uppercase tracking-wider mb-2">
                <Shield size={14} className="text-saffron stroke-[2.5px]" />
                <span>Regulatory Safety</span>
              </div>
              <p className="text-xs text-text-secondary font-medium leading-relaxed">
                ⚠️ This is for educational purposes only. Please consult a SEBI-registered financial advisor before making investment decisions.
              </p>
            </div>
          </div>
        </div>

        {/* Right Chat Console */}
        <div className="card overflow-hidden flex flex-col h-[600px] lg:h-full bg-white shadow-xl relative">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-800 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-saffron/20 flex items-center justify-center overflow-hidden">
                <AnimatedRobot className="w-8 h-8" isMini={false} />
              </div>
              <div>
                <h3 className="font-bold text-base leading-none">ArthiqAI Assistant</h3>
                <span className="text-xs text-white font-bold uppercase tracking-wider mt-1 block opacity-90">Live Agent</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Connected</span>
              </div>
              <button
                onClick={handleClear}
                title="Reset Conversation"
                className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 bg-slate-50 space-y-4">
            {messages.map((msg, idx) => {
              const isAssistant = msg.role === 'assistant'
              return (
                <div key={idx} className={`flex items-start gap-4.5 ${isAssistant ? '' : 'flex-row-reverse'}`}>
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden ${
                    isAssistant ? 'bg-saffron/12 border border-saffron/25' : 'bg-slate-200'
                  }`}>
                    {isAssistant ? <AnimatedRobot className="w-8 h-8" isMini={true} /> : <User size={16} className="text-slate-600" />}
                  </div>
                  {/* Bubble */}
                  <div className={`max-w-[70%] rounded-2xl p-4 text-base leading-relaxed ${
                    isAssistant 
                      ? 'bg-white text-slate-900 border border-slate-200/80 rounded-tl-none shadow-sm font-semibold' 
                      : 'bg-slate-900 text-white rounded-tr-none shadow-sm font-semibold'
                  }`}>
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              )
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-4.5">
                <div className="w-9 h-9 rounded-xl bg-saffron/12 border border-saffron/25 flex items-center justify-center shrink-0 overflow-hidden">
                  <AnimatedRobot className="w-8 h-8" isMini={true} />
                </div>
                <div className="bg-white text-slate-500 border border-slate-200/80 rounded-2xl rounded-tl-none px-4.5 py-4 flex gap-1.5 items-center shadow-sm">
                  <span className="w-2 h-2 bg-saffron rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-saffron rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-saffron rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-start gap-3 animate-in">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex items-center gap-3.5 shrink-0">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Ask about Nifty 50, Reliance quotes, Mutual Funds..."
              disabled={isLoading}
              className="flex-1 bg-slate-100 border border-transparent focus:border-slate-200 focus:bg-white text-slate-800 text-sm rounded-xl px-4.5 py-4 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="w-12 h-12 bg-saffron hover:bg-saffron-dark disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-md shadow-saffron/25 active:scale-95"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

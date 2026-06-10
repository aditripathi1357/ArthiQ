import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Send, X, User, RefreshCw, AlertTriangle } from 'lucide-react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const STORAGE_KEY = 'arthiq_chat_widget_history'

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
  content: `Namaste! 🙏 I'm ArthiqAI Assistant — your smart investment companion.\n\nHere's what I can do for you right now:\n\n📈 Live stock prices & market snapshot\n🔍 Deep analysis of any NSE/BSE stock\n💡 Investment suggestions (short, medium & long term)\n📰 Latest market news & earnings updates\n💰 Mutual fund & SIP recommendations\n🎯 Portfolio review & strategy\n\nWhat would you like to explore today?`
}

// Load messages from localStorage, fall back to initial message
function loadStoredMessages() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return [INITIAL_MESSAGE]
}

export default function ChatAssistant() {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  // ✅ ALL hooks declared before any conditional return
  const [messages, setMessages] = useState(loadStoredMessages)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const messagesEndRef = useRef(null)

  // Persist chat history to localStorage whenever messages change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch {}
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isLoading])

  // ✅ Don't render on /chat page — but AFTER all hooks (no hooks violation)
  if (location.pathname === '/chat') return null

  const handleSend = async (e) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage = { role: 'user', content: inputValue }
    const updatedMessages = [...messages, userMessage]
    
    setMessages(updatedMessages)
    setInputValue('')
    setIsLoading(true)
    setErrorMsg(null)

    try {
      const response = await axios.post(`${API_BASE}/api/chat`, {
        messages: updatedMessages.map(m => ({ role: m.role, content: m.content }))
      }, { timeout: 45000 })
      
      if (response.data && response.data.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.data.content }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I did not receive a response.' }])
      }
    } catch (err) {
      console.error('Chat error:', err)
      setErrorMsg('Having trouble connecting. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    const fresh = [INITIAL_MESSAGE]
    setMessages(fresh)
    setErrorMsg(null)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)) } catch {}
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans">
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 border-2 border-[#FF9933] relative group"
          style={{ boxShadow: '0 8px 32px rgba(255,153,51,0.3)' }}
        >
          <AnimatedRobot className="w-12 h-12" isMini={false} />
          {/* Unread indicator dot if messages > 1 (user has chatted) */}
          {messages.length > 1 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white text-[9px] font-black text-white flex items-center justify-center">
              {Math.min(messages.filter(m => m.role === 'user').length, 9)}
            </span>
          )}
          {/* Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-xs font-bold py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md border border-slate-700 pointer-events-none whitespace-nowrap">
            Chat with ArthiqAI!
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className="w-96 h-[500px] bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-2xl"
          style={{ boxShadow: '0 20px 48px rgba(15,23,42,0.15)' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] px-5 py-4 flex items-center justify-between text-white border-b border-slate-700 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF9933]/20 flex items-center justify-center overflow-hidden">
                <AnimatedRobot className="w-8 h-8" isMini={false} />
              </div>
              <div>
                <h3 className="font-bold text-base leading-snug text-white">ArthiqAI Assistant</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-slate-300 font-semibold">Live · {messages.filter(m=>m.role==='user').length} messages</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleClear}
                title="Clear conversation"
                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              >
                <RefreshCw size={15} />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3 min-h-0">
            {messages.map((msg, idx) => {
              const isAssistant = msg.role === 'assistant'
              return (
                <div key={idx} className={`flex items-start gap-2.5 ${isAssistant ? '' : 'flex-row-reverse'}`}>
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
                    isAssistant ? 'bg-[#FF9933]/12 border border-[#FF9933]/25' : 'bg-slate-200'
                  }`}>
                    {isAssistant ? <AnimatedRobot className="w-6 h-6" isMini={true} /> : <User size={13} className="text-slate-600" />}
                  </div>
                  {/* Bubble */}
                  <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    isAssistant 
                      ? 'bg-white text-slate-900 border border-slate-200 rounded-tl-none shadow-sm' 
                      : 'bg-[#0f172a] text-white rounded-tr-none'
                  }`}>
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              )
            })}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#FF9933]/12 border border-[#FF9933]/25 flex items-center justify-center shrink-0 overflow-hidden">
                  <AnimatedRobot className="w-6 h-6" isMini={true} />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-3.5 py-3 flex gap-1.5 items-center shadow-sm">
                  <span className="w-2 h-2 bg-[#FF9933] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[#FF9933] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[#FF9933] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {/* Error */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Ask about stocks, mutual funds..."
              disabled={isLoading}
              className="flex-1 bg-slate-100 border border-transparent focus:border-slate-200 focus:bg-white text-slate-800 text-sm rounded-xl px-3.5 py-2.5 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="w-9 h-9 bg-[#FF9933] hover:bg-[#e6830a] disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl flex items-center justify-center shrink-0 transition-colors"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

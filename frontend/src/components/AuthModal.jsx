import { useState, useRef } from 'react'
import { X, Mail, Lock, User, ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// STEP: 'form' | 'otp' | 'success'
export default function AuthModal({ isOpen, onClose }) {
  const { signInWithGoogle, signInWithEmail, signUp } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [step, setStep] = useState('form') // 'form' | 'otp' | 'success'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // OTP state — 8 individual digit inputs (Supabase sends 8-digit tokens)
  const OTP_LENGTH = 8
  const [otp, setOtp] = useState(Array(8).fill(''))
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]

  if (!isOpen) return null

  const resetModal = () => {
    setStep('form')
    setEmail('')
    setPassword('')
    setFullName('')
    setError('')
    setOtp(Array(8).fill(''))
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  // ── Form Submit ──────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isLogin) {
        const { error: signInError } = await signInWithEmail(email, password)
        if (signInError) throw signInError
        handleClose()
      } else {
        const { error: signUpError } = await signUp(email, password, fullName)
        if (signUpError) throw signUpError
        // Go to OTP step — Supabase sends a 6-digit OTP to the email
        setStep('otp')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── OTP Input Handling ───────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return // only digits
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    // Auto-focus next
    if (value && index < OTP_LENGTH - 1) {
      otpRefs[index + 1].current?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) otpRefs[index - 1].current?.focus()
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) otpRefs[index + 1].current?.focus()
  }

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (pasted.length === OTP_LENGTH) {
      setOtp(pasted.split(''))
      otpRefs[OTP_LENGTH - 1].current?.focus()
    }
  }

  // ── OTP Verify ──────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    const token = otp.join('')
    if (token.length !== OTP_LENGTH) {
      setError(`Please enter the full ${OTP_LENGTH}-digit code.`)
      return
    }
    setLoading(true)
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      })
      if (verifyError) throw verifyError
      setStep('success')
      setTimeout(() => handleClose(), 2000)
    } catch (err) {
      setError(err.message || 'Invalid or expired code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Resend OTP ───────────────────────────────────────────────────────
  const handleResend = async () => {
    setError('')
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) setError(error.message)
    else setError('') // show a temporary message
  }

  // ── Google Sign In ───────────────────────────────────────────────────
  const handleGoogle = async () => {
    setError('')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError('Google sign-in is not configured yet. Please use email & password.')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-bg-primary border border-border w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex justify-between items-center p-6 border-b border-border">
          {step === 'otp' ? (
            <button onClick={() => setStep('form')} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm font-semibold transition-colors">
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <h2 className="text-xl font-bold text-text-primary">
              {step === 'success' ? 'Verified!' : isLogin ? 'Welcome Back' : 'Create an Account'}
            </h2>
          )}
          <button onClick={handleClose} className="text-text-muted hover:text-text-primary transition-colors ml-auto">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">

          {/* ── SUCCESS STEP ─────────────────────────────────────────── */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle size={56} className="text-india-green mb-4" />
              <h3 className="text-2xl font-bold text-text-primary mb-2">Email Verified!</h3>
              <p className="text-text-secondary text-sm">Your account has been confirmed. Signing you in...</p>
            </div>
          )}

          {/* ── OTP STEP ─────────────────────────────────────────────── */}
          {step === 'otp' && (
            <div>
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-full bg-saffron/10 border-2 border-saffron flex items-center justify-center mx-auto mb-4">
                  <Mail size={24} className="text-saffron" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Check your email</h3>
                <p className="text-sm text-text-secondary">
                  We sent a 6-digit verification code to<br />
                  <strong className="text-text-primary">{email}</strong>
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleVerifyOtp}>
                {/* 6-Digit OTP Input */}
                <div className="flex gap-2 justify-center mb-6" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={otpRefs[i]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-2xl font-bold bg-bg-card border-2 border-border rounded-xl text-text-primary focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-all"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.join('').length !== OTP_LENGTH}
                  className="w-full py-3 rounded-xl bg-saffron text-white font-bold hover:bg-saffron-dark transition-colors disabled:opacity-60"
                >
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
              </form>

              <p className="text-center text-sm text-text-secondary mt-5">
                Didn't receive the code?{' '}
                <button onClick={handleResend} className="text-saffron font-semibold hover:underline">
                  Resend
                </button>
              </p>
              <p className="text-center text-xs text-text-muted mt-2">
                Check your spam/junk folder if you don't see it.
              </p>
            </div>
          )}

          {/* ── FORM STEP ────────────────────────────────────────────── */}
          {step === 'form' && (
            <>
              {/* Google Button */}
              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 bg-bg-card border border-border p-3 rounded-xl text-text-primary font-semibold hover:bg-bg-card-hover transition-colors mb-6 shadow-sm"
              >
                <img src="/google.png" alt="Google" className="w-5 h-5 object-contain" />
                Continue with Google
              </button>

              <div className="flex items-center gap-4 mb-5">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-xs text-text-muted font-medium uppercase tracking-wide">Or use email</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">Full Name</label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-saffron focus:ring-1 focus:ring-saffron/30"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-saffron focus:ring-1 focus:ring-saffron/30"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-saffron focus:ring-1 focus:ring-saffron/30"
                      placeholder="Min 6 characters"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-saffron text-white font-bold hover:bg-saffron-dark transition-colors disabled:opacity-70"
                >
                  {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <p className="text-center text-sm text-text-secondary mt-6">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => { setIsLogin(!isLogin); setError('') }}
                  className="text-saffron font-semibold hover:underline"
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

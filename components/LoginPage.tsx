import { useState } from "react"
import { Mail, Lock, AlertCircle, Loader, Eye, EyeOff } from "lucide-react"

interface LoginPageProps {
  onSwitchToSignup?: () => void
  onLoginSuccess?: () => void
  onSwitchToForgotPassword?: () => void
}

export default function LoginPage({ onSwitchToSignup, onLoginSuccess, onSwitchToForgotPassword }: LoginPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [mode, setMode] = useState<"password" | "otp">("password")
  const [otpSent, setOtpSent] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Submit handler: real auth for password mode and OTP mode
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    if (mode === "otp") {
      if (!otp || otp.length !== 6) {
        setError("Please enter the 6-digit code")
        return
      }
    }

    setLoading(true)

    try {
      if (mode === "password") {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || "Login failed")
          return
        }
      } else {
        const response = await fetch("/api/auth/login-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, otp }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || "Login with code failed")
          return
        }
      }

      setSuccess(true)
      setEmail("")
      setPassword("")
      setOtp("")
      // notify parent that login is "successful"
      onLoginSuccess?.()

      // Hide success after a few seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error(err)
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async () => {
    if (!email) {
      setError("Please enter your email first")
      return
    }

    setError("")
    setOtpSending(true)
    setOtpSent(false)

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to send code")
        return
      }

      setOtpSent(true)
    } catch (err) {
      console.error(err)
      setError("Failed to send code. Please try again.")
    } finally {
      setOtpSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand header above the card */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent tracking-tight">
            Nexus
          </h1>
          <p className="mt-1 text-sm text-slate-500">Connect &amp; share with your community</p>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-[0_24px_60px_rgba(15,23,42,0.25)] overflow-hidden border border-slate-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100 mb-1">
              Welcome back
            </p>
            <h2 className="text-2xl font-semibold text-white mb-1">Sign in to Nexus</h2>
            <p className="text-sm text-blue-100/90">
              Use your password or a one-time code to access your space.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="px-8 py-7 space-y-6">
            {/* Mode toggle */}
            <div className="flex items-center justify-between rounded-full bg-slate-100 p-1 text-xs font-medium text-slate-500">
              <button
                type="button"
                onClick={() => setMode("password")}
                className={`flex-1 px-3 py-2 rounded-full transition ${
                  mode === "password"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "hover:text-slate-700"
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => setMode("otp")}
                className={`flex-1 px-3 py-2 rounded-full transition ${
                  mode === "otp"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "hover:text-slate-700"
                }`}
              >
                One-time code
              </button>
            </div>
            {/* Email Input (shared) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition shadow-sm"
                  required
                />
              </div>
            </div>

            {/* Password or OTP Input */}
            {mode === "password" ? (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition shadow-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <div className="text-right mt-2">
                  <button
                    type="button"
                    onClick={onSwitchToForgotPassword}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  One-time code
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, "")
                        setOtp(digitsOnly)
                      }}
                      placeholder="123456"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition shadow-sm tracking-[0.3em] text-center font-mono text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpSending}
                    className="px-4 py-2.5 rounded-lg text-xs font-semibold border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {otpSending ? "Sending..." : otpSent ? "Resend" : "Send code"}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  We&apos;ll send a 6-digit code to your email for one-time access.
                </p>
              </div>
            )}

            {/* Error Message (kept for UI completeness, but not set anywhere yet) */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700 font-medium">Login successful!</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-2.5 rounded-lg transition duration-200 flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Secure space for your{" "}
              <span className="font-semibold text-slate-700">Nexus</span> conversations.
            </p>
            <p className="text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <button
                onClick={onSwitchToSignup}
                className="text-blue-600 hover:text-blue-700 font-semibold transition"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}



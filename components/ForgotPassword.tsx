import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { ThemeToggle } from './nexus/theme-toggle';

type Step = 'email' | 'otp' | 'reset' | 'success';

interface ForgotPasswordProps {
  onBackToLogin?: () => void;
}

export default function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send reset code');
        return;
      }

      setStep('otp');
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.join('').length !== 6) return;
    
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          otp: otp.join('') 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid or expired code');
        return;
      }

      setResetToken(data.resetToken);
      setStep('reset');
    } catch (err) {
      console.error('Verify OTP error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return;
    
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          resetToken, 
          newPassword 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to reset password');
        return;
      }

      setStep('success');
    } catch (err) {
      console.error('Reset password error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLoginClick = () => {
    setStep('email');
    setEmail('');
    setOtp(['', '', '', '', '', '']);
    setNewPassword('');
    setConfirmPassword('');
    setResetToken('');
    setError('');
    onBackToLogin?.();
  };

  const handleResendOtp = async () => {
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to resend code');
        return;
      }

      // Reset OTP input
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      console.error('Resend OTP error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Animated background elements for glassomorphism */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-400/20 to-pink-400/20 dark:from-purple-500/10 dark:to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-cyan-400/10 to-blue-400/10 dark:from-cyan-500/5 dark:to-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Glassomorphism Card */}
        <div className="bg-white/80 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50">
          {/* Gradient Header with Glass Effect */}
          <div className="relative bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-500 dark:to-cyan-400 p-8 text-white overflow-hidden">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10">
              {step !== 'email' && step !== 'success' && (
                <button
                  onClick={() => setStep(step === 'otp' ? 'email' : 'otp')}
                  className="mb-4 flex items-center gap-2 text-white/90 hover:text-white transition-colors"
                >
                  <ArrowLeft size={20} />
                  <span className="text-sm">Back</span>
                </button>
              )}
              <h1 className="text-3xl font-bold mb-2">
                {step === 'email' && 'Forgot Password?'}
                {step === 'otp' && 'Verify OTP'}
                {step === 'reset' && 'Reset Password'}
                {step === 'success' && 'Password Reset!'}
              </h1>
              <p className="text-blue-100 dark:text-blue-50">
                {step === 'email' && "No worries, we'll send you reset instructions."}
                {step === 'otp' && `Enter the 6-digit code sent to ${email}`}
                {step === 'reset' && 'Create a strong new password for your account.'}
                {step === 'success' && 'Your password has been successfully reset.'}
              </p>
            </div>
          </div>

          <div className="p-8">{step === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-500 dark:text-slate-400 z-10" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-white/50 focus:border-transparent transition-all outline-none"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2 backdrop-blur-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-500 dark:to-cyan-400 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-600 dark:hover:from-blue-600 dark:hover:to-cyan-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                >
                  {isLoading ? 'Sending...' : 'Send Reset Code'}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleBackToLoginClick}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-4 text-center">
                    Enter Verification Code
                  </label>
                  <div className="flex gap-2 justify-center">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-12 h-14 text-center text-xl font-semibold bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-white/50 focus:border-transparent transition-all outline-none"
                      />
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2 backdrop-blur-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || otp.join('').length !== 6}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-500 dark:to-cyan-400 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-600 dark:hover:from-blue-600 dark:hover:to-cyan-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                >
                  {isLoading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-50 transition-colors"
                  >
                    Didn't receive code?{' '}
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      {isLoading ? 'Sending...' : 'Resend'}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {step === 'reset' && (
              <form onSubmit={handlePasswordReset} className="space-y-6">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-500 dark:text-slate-400 z-10" />
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-white/50 focus:border-transparent transition-all outline-none"
                      placeholder="Enter new password"
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 z-10"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" />
                      ) : (
                        <Eye className="h-5 w-5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-500 dark:text-slate-400 z-10" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-white/50 focus:border-transparent transition-all outline-none"
                      placeholder="Confirm new password"
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3.5 z-10"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" />
                      ) : (
                        <Eye className="h-5 w-5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" />
                      )}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">Passwords do not match</p>
                  )}
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2 backdrop-blur-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || newPassword !== confirmPassword || !newPassword}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-500 dark:to-cyan-400 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-600 dark:hover:from-blue-600 dark:hover:to-cyan-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}

            {step === 'success' && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="bg-green-100 dark:bg-green-900/30 backdrop-blur-sm rounded-full p-4">
                    <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  Your password has been reset successfully. You can now log in with your new password.
                </p>
                <button
                  onClick={handleBackToLoginClick}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-500 dark:to-cyan-400 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-600 dark:hover:from-blue-600 dark:hover:to-cyan-500 transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm"
                >
                  Back to Login
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Need help?{' '}
            <a href="#" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
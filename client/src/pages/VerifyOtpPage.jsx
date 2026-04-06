import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HiOutlineMail } from 'react-icons/hi';

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const { user, verifyOtp, authStep } = useAuth();

  useEffect(() => {
    if (authStep !== 'otp') {
      navigate(authStep === 'totp' ? '/verify-totp' : '/login');
    }
  }, [authStep, navigate]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  function handleChange(index, value) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await verifyOtp(code);
      navigate('/verify-totp');
    } catch (err) {
      setError(err.message);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-500/20 flex items-center justify-center">
          <HiOutlineMail size={32} className="text-blue-400" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
        <p className="text-slate-400 mb-1">
          We sent a 6-digit code to
        </p>
        <p className="text-white font-medium mb-6">{user?.email}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="flex gap-2 justify-center mb-4" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-bold bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            ))}
          </div>

          {countdown > 0 ? (
            <p className="text-slate-500 text-sm mb-6">
              Code expires in{' '}
              <span className="text-blue-400 font-mono">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
            </p>
          ) : (
            <p className="text-red-400 text-sm mb-6">Code expired. Please request a new one.</p>
          )}

          <button
            type="submit"
            disabled={loading || otp.join('').length !== 6}
            className="btn-primary w-full mb-4"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Verifying...
              </span>
            ) : (
              'Verify Code'
            )}
          </button>
        </form>

        <button
          onClick={() => {
            setResendCooldown(30);
            setCountdown(300);
          }}
          disabled={resendCooldown > 0}
          className="text-blue-400 text-sm hover:text-blue-300 transition-colors disabled:text-slate-600"
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
        </button>
      </div>
    </div>
  );
}

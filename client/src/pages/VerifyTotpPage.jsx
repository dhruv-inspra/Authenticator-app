import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HiOutlineShieldCheck } from 'react-icons/hi';

export default function VerifyTotpPage() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [manualKey, setManualKey] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const { authStep, isNewUser, setupTotp, verifyTotp } = useAuth();

  useEffect(() => {
    if (authStep !== 'totp') {
      navigate(authStep === 'otp' ? '/verify-otp' : '/login');
    }
  }, [authStep, navigate]);

  useEffect(() => {
    if (isNewUser) {
      loadQrCode();
    } else {
      inputRefs.current[0]?.focus();
    }
  }, [isNewUser]);

  async function loadQrCode() {
    setSetupLoading(true);
    try {
      const data = await setupTotp();
      setQrData(data.qrCode);
      setManualKey(data.manualKey);
    } catch (err) {
      setError(err.message);
    } finally {
      setSetupLoading(false);
    }
  }

  function handleChange(index, value) {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const token = code.join('');
    if (token.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await verifyTotp(token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-purple-500/20 flex items-center justify-center">
          <HiOutlineShieldCheck size={32} className="text-purple-400" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {isNewUser ? 'Set Up Authenticator' : 'Authenticator Verification'}
        </h2>
        <p className="text-slate-400 mb-6">
          {isNewUser
            ? 'Scan the QR code with Google Authenticator, then enter the 6-digit code.'
            : 'Enter the 6-digit code from your Google Authenticator app.'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* QR Code for new users */}
        {isNewUser && (
          <div className="mb-6">
            {setupLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : qrData ? (
              <>
                <div className="bg-white rounded-xl p-4 inline-block mb-4">
                  <img src={qrData} alt="QR Code" className="w-48 h-48" />
                </div>
                <details className="text-left">
                  <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-300">
                    Can't scan? Enter key manually
                  </summary>
                  <div className="mt-2 p-3 bg-slate-700/50 rounded-lg">
                    <code className="text-xs text-blue-400 break-all">{manualKey}</code>
                  </div>
                </details>
              </>
            ) : null}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-bold bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || code.join('').length !== 6}
            className="btn-primary w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Verifying...
              </span>
            ) : (
              'Verify & Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

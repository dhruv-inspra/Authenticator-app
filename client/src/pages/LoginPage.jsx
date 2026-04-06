import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FcGoogle } from 'react-icons/fc';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineUser } from 'react-icons/hi';

const ALLOWED_DOMAINS = ['inspra.ai', 'genius365.ai', 'automateaccelerator.com'];

function validateDomain(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('invite') ? 'signup' : 'signin';
  const initialEmail = searchParams.get('email') || '';

  const [tab, setTab] = useState(initialTab);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signup, signin, signInWithGoogle } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!validateDomain(email)) {
      setError('Only @inspra.ai, @genius365.ai, and @automateaccelerator.com emails are allowed.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'signup') {
        if (!displayName.trim()) {
          setError('Display name is required.');
          setLoading(false);
          return;
        }
        await signup(email, password, displayName);
      } else {
        await signin(email, password);
      }
      navigate('/verify-otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/verify-otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Inspra AI
          </h1>
          <p className="text-slate-400 mt-2">Secure authentication platform</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-700/50 rounded-lg p-1 mb-6">
          <button
            onClick={() => { setTab('signin'); setError(''); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              tab === 'signin'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('signup'); setError(''); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              tab === 'signup'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Display Name</label>
              <div className="relative">
                <HiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name"
                  className="input-field pl-10"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <div className="relative">
              <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@inspra.ai"
                className="input-field pl-10"
                required
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Allowed: @inspra.ai, @genius365.ai, @automateaccelerator.com
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="input-field pl-10"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                {tab === 'signup' ? 'Creating account...' : 'Signing in...'}
              </span>
            ) : (
              tab === 'signup' ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/10"></div>
          <span className="text-slate-500 text-sm">or</span>
          <div className="flex-1 h-px bg-white/10"></div>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-lg py-2.5 text-white font-medium hover:bg-white/10 transition-all duration-200 disabled:opacity-50"
        >
          <FcGoogle size={20} />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

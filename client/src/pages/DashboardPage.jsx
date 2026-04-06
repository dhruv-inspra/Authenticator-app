import { useAuth } from '../contexts/AuthContext';
import { HiOutlineShieldCheck, HiOutlineMail } from 'react-icons/hi';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Inspra AI
          </span>
        </h1>
        <p className="text-slate-400">
          Hello, {user?.displayName || user?.email}! Your account is secured with two-factor authentication.
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <HiOutlineShieldCheck size={24} className="text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">2FA Enabled</h3>
              <p className="text-slate-400 text-sm">Google Authenticator active</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <HiOutlineMail size={24} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Email Verified</h3>
              <p className="text-slate-400 text-sm">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

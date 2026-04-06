import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HiOutlineViewGrid, HiOutlineUsers, HiOutlineLogout, HiOutlineMenu, HiOutlineX } from 'react-icons/hi';

export default function Layout({ children }) {
  const { user, userRole, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: HiOutlineViewGrid },
    ...(userRole === 'admin'
      ? [{ path: '/admin', label: 'Admin', icon: HiOutlineUsers }]
      : []),
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-800/80 backdrop-blur-sm border-r border-white/10 flex flex-col transition-all duration-300`}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          {sidebarOpen && (
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Inspra AI
            </h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {sidebarOpen ? <HiOutlineX size={20} /> : <HiOutlineMenu size={20} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={20} />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
              {user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.displayName || user?.email}
                </p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className="mt-3 flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors w-full px-1"
          >
            <HiOutlineLogout size={18} />
            {sidebarOpen && <span className="text-sm">Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import api from '../services/api';
import { HiOutlineUserAdd, HiOutlineTrash, HiOutlineSearch, HiOutlineX } from 'react-icons/hi';

const ALLOWED_DOMAINS = ['inspra.ai', 'genius365.ai', 'automateaccelerator.com'];

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users);
      setInvites(res.data.invites);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');

    const domain = inviteEmail.split('@')[1]?.toLowerCase();
    if (!ALLOWED_DOMAINS.includes(domain)) {
      setInviteError('Only @inspra.ai, @genius365.ai, and @automateaccelerator.com emails are allowed.');
      return;
    }

    setInviteLoading(true);
    try {
      const res = await api.post('/admin/invite', { email: inviteEmail });
      setInviteSuccess(res.data.message);
      setInviteEmail('');
      fetchUsers();
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess('');
      }, 2000);
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleDelete(uid) {
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/users/${uid}`);
      setDeleteConfirm(null);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-slate-400 mt-1">{users.length} users registered</p>
        </div>
        <button onClick={() => setShowInviteModal(true)} className="btn-primary flex items-center gap-2">
          <HiOutlineUserAdd size={18} />
          Invite User
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="input-field pl-10"
        />
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden mb-8">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">User</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Role</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">2FA</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Joined</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.uid} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                      {u.email?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{u.displayName || 'No name'}</p>
                      <p className="text-slate-400 text-sm">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      u.role === 'admin'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      u.totpEnabled
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {u.totpEnabled ? 'Active' : 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400 text-sm">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 text-right">
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => setDeleteConfirm(u)}
                      className="text-slate-400 hover:text-red-400 transition-colors p-1"
                    >
                      <HiOutlineTrash size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-slate-400">No users found.</div>
        )}
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Pending Invitations</h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Email</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Sent</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Expires</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} className="border-b border-white/5">
                    <td className="px-6 py-4 text-white">{inv.email}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Invite User</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteError('');
                  setInviteSuccess('');
                  setInviteEmail('');
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <HiOutlineX size={20} />
              </button>
            </div>

            {inviteError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {inviteError}
              </div>
            )}

            {inviteSuccess && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                {inviteSuccess}
              </div>
            )}

            <form onSubmit={handleInvite}>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@inspra.ai"
                className="input-field mb-2"
                required
              />
              <p className="text-xs text-slate-500 mb-4">
                Allowed: @inspra.ai, @genius365.ai, @automateaccelerator.com
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteError('');
                    setInviteSuccess('');
                    setInviteEmail('');
                  }}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button type="submit" disabled={inviteLoading} className="btn-primary flex-1">
                  {inviteLoading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-white mb-2">Delete User</h3>
            <p className="text-slate-400 mb-6">
              Are you sure you want to delete{' '}
              <span className="text-white font-medium">{deleteConfirm.email}</span>? This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.uid)}
                disabled={deleteLoading}
                className="btn-danger flex-1"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

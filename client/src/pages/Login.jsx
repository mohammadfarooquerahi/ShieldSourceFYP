// ─────────────────────────────────────────────
// Shield-Source | Login Page
// Authenticates user and stores JWT token
// ─────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Login() {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user }       = useAuth();   // ← also get user from context
  const navigate              = useNavigate();

  // ── Navigate AFTER user state is actually updated in context ──────────────
  // This fixes the race condition where navigate() fires before setUser()
  // completes, causing ProtectedRoute to see user=null and redirect to /login.
  useEffect(() => {
    if (user) {
      if (user.role === 'admin')       navigate('/admin',     { replace: true });
      else if (user.role === 'expert') navigate('/expert',    { replace: true });
      else                             navigate('/dashboard', { replace: true });
    }
  }, [user]); // runs every time user state changes

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // POST /api/auth/login — server returns { token, user }
      const res = await api.post('/auth/login', form);
      // login() calls setUser() — navigate happens in useEffect above
      login(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
      {/* Glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">🛡️</div>
          <h1 className="text-3xl font-extrabold text-white">Welcome Back</h1>
          <p className="text-slate-400 mt-2">Sign in to Shield-Source</p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500
                           focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500
                           focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800
                         disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all
                         shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]"
            >
              {loading ? '⏳ Signing In...' : '🔐 Sign In'}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-red-400 hover:text-red-300 font-semibold transition-colors">
              Register here
            </Link>
          </p>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          🛡️ Shield-Source | FYCP/2K26/099 | University of Sindh
        </p>
      </div>
    </div>
  );
}

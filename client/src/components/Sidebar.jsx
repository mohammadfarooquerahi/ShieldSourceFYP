import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function ShieldLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2z"
        fill="url(#sidebarShieldGrad)"
      />
      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="sidebarShieldGrad" x1="3" y1="2" x2="21" y2="23">
          <stop stopColor="#ef4444" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const userNavLinks = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    label: 'Report Incident',
    href: '/report',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
];

const expertNavLinks = [
  {
    label: 'Expert Dashboard',
    href: '/expert',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  }
];

const adminNavLinks = [
  {
    label: 'Admin Control Panel',
    href: '/admin',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  }
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getNavLinks = () => {
    if (user?.role === 'admin') return adminNavLinks;
    if (user?.role === 'expert') return expertNavLinks;
    return userNavLinks;
  };

  const navLinks = getNavLinks();
  const isActive = (href) => location.pathname === href;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const roleColors = {
    admin: 'from-red-500 to-pink-600',
    expert: 'from-blue-500 to-cyan-500',
    user: 'from-green-500 to-emerald-600',
  };

  const roleLabels = {
    admin: 'Administrator',
    expert: 'Security Expert',
    user: 'User',
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-dark-200 border-r border-white/10 flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
        <div className="relative">
          <div className="absolute inset-0 bg-brand-red/20 rounded-lg blur-md" />
          <div className="relative">
            <ShieldLogo />
          </div>
        </div>
        <div>
          <div className="text-lg font-black text-white leading-none">Shield-Source</div>
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">Cyber Response</div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
          <div
            className={`w-10 h-10 rounded-full bg-gradient-to-br ${roleColors[user?.role] || 'from-slate-600 to-slate-700'} flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <div className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</div>
            <div className="text-xs text-slate-500 truncate">{roleLabels[user?.role] || 'User'}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-4 mb-3">Navigation</div>
        {navLinks.map((link, index) => (
          <Link
            key={index}
            to={link.href}
            className={`sidebar-link ${isActive(link.href) ? 'active' : ''}`}
          >
            <span className={isActive(link.href) ? 'text-brand-red' : 'text-slate-500'}>{link.icon}</span>
            {link.label}
          </Link>
        ))}

        {/* Home link always visible */}
        <Link
          to="/"
          className="sidebar-link mt-4"
        >
          <span className="text-slate-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </span>
          Back to Home
        </Link>
      </nav>

      {/* Status indicator */}
      <div className="px-4 py-3 mx-4 mb-4 rounded-xl bg-green-500/10 border border-green-500/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-slow" />
          <span className="text-xs text-green-400 font-medium">System Online</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-1 font-mono">All services operational</div>
      </div>

      {/* Logout */}
      <div className="px-4 pb-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-brand-red hover:bg-brand-red/10 transition-all duration-200 font-medium text-sm border border-transparent hover:border-brand-red/20 group"
        >
          <svg
            className="w-5 h-5 group-hover:text-brand-red transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2z"
        fill="url(#shieldGrad)"
        stroke="rgba(239,68,68,0.5)"
        strokeWidth="0.5"
      />
      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="shieldGrad" x1="3" y1="2" x2="21" y2="23">
          <stop stopColor="#ef4444" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Report Incident', href: '/report' },
  ];

  const isActive = (href) => location.pathname === href;

  const getDashboardLink = () => {
    if (!user) return '/dashboard';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'expert') return '/expert';
    return '/dashboard';
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-200/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-brand-red/30 rounded-lg blur-md group-hover:blur-lg transition-all duration-300" />
            <div className="relative">
              <ShieldIcon />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-white leading-none tracking-tight">Shield-Source</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Cyber Response</span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive(link.href)
                  ? 'text-white bg-white/10 border border-white/15'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to={getDashboardLink()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-red to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:block">{user?.name?.split(' ')[0]}</span>
              </Link>
              <button
                onClick={logout}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-brand-red hover:bg-brand-red/10 transition-all duration-200 border border-transparent hover:border-brand-red/20"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-brand-red hover:bg-brand-red-dark text-white transition-all duration-200 hover:shadow-glow"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

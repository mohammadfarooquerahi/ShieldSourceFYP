// ─────────────────────────────────────────────
// Shield-Source | Landing Page
// The public-facing home page with Panic Button
// ─────────────────────────────────────────────
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, clicking panic button goes straight to report
  const handlePanic = () => {
    if (user) navigate('/report');
    else navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans overflow-x-hidden">

      {/* ── NAVBAR ─────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Shield-Source
          </span>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <Link
              to={user.role === 'admin' ? '/admin' : user.role === 'expert' ? '/expert' : '/dashboard'}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-semibold transition-all"
            >
              Dashboard →
            </Link>
          ) : (
            <>
              <Link to="/login"    className="text-slate-300 hover:text-white transition-colors font-medium">Login</Link>
              <Link to="/register" className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-semibold transition-all">Register</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO SECTION ───────────────────────── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen text-center px-6 pt-20">
        {/* Glowing background orb */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-red-600/10 blur-3xl pointer-events-none" />

        {/* Shield icon with pulse */}
        <div className="relative mb-8">
          <div className="text-9xl animate-pulse drop-shadow-[0_0_40px_rgba(239,68,68,0.6)]">🛡️</div>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 tracking-tight">
          <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Your Emergency
          </span>
          <br />
          <span className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
            Cyber Response
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
          Shield-Source is Pakistan's first accessible cyber incident response platform —
          designed for small businesses, individuals, and educational institutions.
          Report incidents instantly. Get expert help. Stay protected.
        </p>

        {/* ── BIG RED PANIC BUTTON ── */}
        <button
          onClick={handlePanic}
          className="group relative px-16 py-6 bg-red-600 hover:bg-red-700 text-white text-2xl font-extrabold rounded-2xl
                     shadow-[0_0_50px_rgba(239,68,68,0.5)] hover:shadow-[0_0_80px_rgba(239,68,68,0.8)]
                     transition-all duration-300 transform hover:scale-105 mb-16 animate-[pulse_2s_ease-in-out_infinite]"
        >
          <span className="mr-3">🚨</span>
          PANIC BUTTON — Report Now
          <div className="absolute inset-0 rounded-2xl border-2 border-red-400/50 animate-ping" />
        </button>

        {/* ── 3 FEATURE CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mb-20">
          {[
            { icon: '🔒', title: 'SHA-256 Evidence Protection', desc: 'Every uploaded file gets a cryptographic fingerprint — any tampering is instantly detectable. Compliant with ISO/IEC 27037:2012 digital forensics standards.' },
            { icon: '👤', title: 'Expert Assignment', desc: 'Cybersecurity professionals review your case, add expert notes, and guide you through containment, eradication, and recovery steps.' },
            { icon: '📊', title: 'Real-Time AI Analysis', desc: 'Our ML model automatically classifies uploaded log files as SQL Injection, Brute Force, DDoS, or Normal — no manual reading required.' },
          ].map((card, i) => (
            <div key={i} className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 text-left hover:border-slate-600 hover:bg-slate-800/70 transition-all group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{card.icon}</div>
              <h3 className="text-lg font-bold text-white mb-3">{card.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────── */}
      <section className="py-24 px-6 bg-slate-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold text-white mb-4">How It Works</h2>
          <p className="text-slate-400 mb-16">Three simple steps to get expert help fast</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: '📝', title: 'Report Your Incident', desc: 'Click the Panic Button, fill the form, upload evidence. Done in under 2 minutes.' },
              { step: '02', icon: '🤖', title: 'AI + Expert Review', desc: 'Our ML model analyses your logs. An assigned cybersecurity expert reviews your case.' },
              { step: '03', icon: '✅', title: 'Case Resolved', desc: 'Expert adds notes and recommendations. Status updated to Resolved. You stay informed.' },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-black text-slate-800 mb-4">{item.step}</div>
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────── */}
      <footer className="py-12 px-6 border-t border-slate-800 text-center text-slate-500 text-sm">
        <p className="text-lg font-bold text-slate-300">Shield-Source 2026</p>
      </footer>
    </div>
  );
}

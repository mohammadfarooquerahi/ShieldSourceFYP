export default function StatCard({ icon, value, label, color = 'red', trend, trendValue }) {
  const colorMap = {
    red: {
      bg: 'bg-brand-red/10',
      border: 'border-brand-red/20',
      icon: 'text-brand-red',
      glow: 'shadow-glow',
      value: 'text-brand-red',
    },
    green: {
      bg: 'bg-brand-green/10',
      border: 'border-brand-green/20',
      icon: 'text-brand-green',
      glow: 'shadow-glow-green',
      value: 'text-brand-green',
    },
    blue: {
      bg: 'bg-brand-blue/10',
      border: 'border-brand-blue/20',
      icon: 'text-brand-blue',
      glow: 'shadow-glow-blue',
      value: 'text-brand-blue',
    },
    yellow: {
      bg: 'bg-brand-yellow/10',
      border: 'border-brand-yellow/20',
      icon: 'text-brand-yellow',
      glow: '',
      value: 'text-brand-yellow',
    },
    purple: {
      bg: 'bg-brand-purple/10',
      border: 'border-brand-purple/20',
      icon: 'text-brand-purple',
      glow: '',
      value: 'text-brand-purple',
    },
    cyan: {
      bg: 'bg-brand-cyan/10',
      border: 'border-brand-cyan/20',
      icon: 'text-brand-cyan',
      glow: '',
      value: 'text-brand-cyan',
    },
  };

  const c = colorMap[color] || colorMap.red;

  return (
    <div className={`glass-card p-6 border ${c.border} hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden`}>
      {/* Background glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 ${c.bg} rounded-full blur-3xl -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500`} />

      <div className="relative z-10">
        {/* Icon + Label row */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center ${c.icon} flex-shrink-0`}>
            {icon}
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${
              trend >= 0 ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
            }`}>
              {trend >= 0 ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
              {trendValue}
            </div>
          )}
        </div>

        {/* Value */}
        <div className={`text-4xl font-black font-mono ${c.value} mb-1 leading-none`}>
          {value ?? '—'}
        </div>

        {/* Label */}
        <div className="text-sm text-slate-400 font-medium mt-2">{label}</div>
      </div>
    </div>
  );
}

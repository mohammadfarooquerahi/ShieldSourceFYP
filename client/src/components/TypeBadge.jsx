export default function TypeBadge({ type }) {
  const typeConfig = {
    hacking: {
      label: 'Hacking',
      className: 'bg-red-500/15 text-red-400 border-red-500/30',
    },
    malware: {
      label: 'Malware',
      className: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    },
    ransomware: {
      label: 'Ransomware',
      className: 'bg-red-600/20 text-red-300 border-red-600/40',
    },
    phishing: {
      label: 'Phishing',
      className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    },
    data_theft: {
      label: 'Data Theft',
      className: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    },
    unauthorized_access: {
      label: 'Unauthorized Access',
      className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    },
    ddos: {
      label: 'DDoS',
      className: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    },
    insider_threat: {
      label: 'Insider Threat',
      className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    },
    social_engineering: {
      label: 'Social Engineering',
      className: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    },
    other: {
      label: 'Other',
      className: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    },
  };

  const config = typeConfig[type] || {
    label: type?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown',
    className: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border uppercase tracking-wide ${config.className}`}
    >
      {config.label}
    </span>
  );
}

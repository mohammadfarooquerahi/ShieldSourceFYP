export default function StatusBadge({ status }) {
  const statusConfig = {
    open: {
      label: 'Open',
      className: 'bg-red-500/15 text-red-400 border-red-500/30',
      dot: 'bg-red-500',
    },
    in_progress: {
      label: 'In Progress',
      className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
      dot: 'bg-yellow-500 animate-pulse',
    },
    resolved: {
      label: 'Resolved',
      className: 'bg-green-500/15 text-green-400 border-green-500/30',
      dot: 'bg-green-500',
    },
    closed: {
      label: 'Closed',
      className: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
      dot: 'bg-slate-500',
    },
    pending: {
      label: 'Pending',
      className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      dot: 'bg-blue-500 animate-pulse',
    },
  };

  const config = statusConfig[status] || {
    label: status || 'Unknown',
    className: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    dot: 'bg-slate-500',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
      {config.label}
    </span>
  );
}

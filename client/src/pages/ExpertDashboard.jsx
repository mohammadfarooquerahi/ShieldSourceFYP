// ─────────────────────────────────────────────
// Shield-Source | Expert Dashboard
// Experts view assigned cases, see ML results,
// add notes and update incident status
// ─────────────────────────────────────────────
import { useState, useEffect } from 'react';
import Sidebar     from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import TypeBadge   from '../components/TypeBadge';
import StatCard    from '../components/StatCard';
import api         from '../services/api';

export default function ExpertDashboard() {
  const [incidents, setIncidents] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [noteText,  setNoteText]  = useState({});   // noteText[incidentId]
  const [saving,    setSaving]    = useState({});    // saving[incidentId]
  const [feedback,  setFeedback]  = useState({});   // feedback[incidentId]
  const [error,     setError]     = useState('');

  // Load all incidents assigned to this expert
  useEffect(() => {
    fetchAssigned();
  }, []);

  const fetchAssigned = async () => {
    try {
      setLoading(true);
      const res = await api.get('/expert/assigned');
      setIncidents(res.data?.incidents || []);
    } catch (err) {
      setError('Failed to load assigned cases.');
    } finally {
      setLoading(false);
    }
  };

  // Submit an expert note for a specific incident
  const handleAddNote = async (incidentId) => {
    if (!noteText[incidentId]?.trim()) return;
    setSaving(s => ({ ...s, [incidentId]: true }));
    try {
      await api.post('/expert/note', {
        incidentId:  incidentId,
        note: noteText[incidentId],
      });
      setFeedback(f => ({ ...f, [incidentId]: '✅ Note saved!' }));
      setNoteText(n => ({ ...n, [incidentId]: '' }));
      setTimeout(() => setFeedback(f => ({ ...f, [incidentId]: '' })), 3000);
    } catch (err) {
      setFeedback(f => ({ ...f, [incidentId]: '❌ Failed to save note.' }));
    } finally {
      setSaving(s => ({ ...s, [incidentId]: false }));
    }
  };

  // Update case status (in_progress / resolved)
  const handleStatusChange = async (incidentId, newStatus) => {
    try {
      await api.patch('/expert/status', { incidentId: incidentId, status: newStatus });
      setIncidents(prev =>
        prev.map(inc => inc.id === incidentId ? { ...inc, status: newStatus } : inc)
      );
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  // Severity badge color for ML predictions
  const severityColor = {
    low:      'bg-green-500/20 text-green-400 border border-green-500/30',
    medium:   'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    high:     'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    critical: 'bg-red-500/20 text-red-400 border border-red-500/30',
  };

  // Stats computed from incidents
  const total      = incidents.length;
  const inProgress = incidents.filter(i => i.status === 'in_progress').length;
  const resolved   = incidents.filter(i => i.status === 'resolved').length;

  return (
    <div className="min-h-screen bg-[#0f172a] flex">
      <Sidebar />

      {/* ── Main Content ── */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white mb-1">Expert Dashboard</h1>
          <p className="text-slate-400">Review assigned incidents, analyse ML results, add notes and resolve cases.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 mb-6 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard icon="📋" label="Assigned Cases"  value={total}      color="blue"   />
          <StatCard icon="⚡" label="In Progress"     value={inProgress} color="yellow" />
          <StatCard icon="✅" label="Resolved"        value={resolved}   color="green"  />
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-20 text-slate-400">
            <div className="text-5xl mb-4 animate-spin">⏳</div>
            <p>Loading your assigned cases...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && incidents.length === 0 && (
          <div className="text-center py-20 bg-slate-800/40 rounded-2xl border border-slate-700">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-white mb-2">No Cases Assigned Yet</h3>
            <p className="text-slate-400">The admin will assign incidents to you shortly.</p>
          </div>
        )}

        {/* Incident Cards */}
        <div className="space-y-6">
          {incidents.map(incident => (
            <div key={incident.id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600 transition-all">

              {/* Card Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="text-slate-500 font-mono text-sm">#{incident.id}</span>
                    <TypeBadge   type={incident.type} />
                    <StatusBadge status={incident.status} />
                  </div>
                  <h2 className="text-xl font-bold text-white">{incident.title}</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Reported by: <span className="text-slate-300 font-medium">{incident.reporter_name || 'Unknown'}</span>
                    {' '}· {new Date(incident.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Status Updater */}
                <select
                  value={incident.status}
                  onChange={e => handleStatusChange(incident.id, e.target.value)}
                  className="bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="in_progress">⚡ In Progress</option>
                  <option value="resolved">✅ Resolved</option>
                </select>
              </div>

              {/* Description */}
              <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
                <p className="text-slate-300 text-sm leading-relaxed">{incident.description}</p>
              </div>

              {/* ML Prediction Result */}
              {incident.ml_prediction && (
                <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                    🤖 ML Analysis Result
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 text-sm">
                      <span className="text-slate-400 text-xs block">Threat Type</span>
                      <span className="text-blue-300 font-bold">{incident.ml_prediction}</span>
                    </div>
                    <div className={`rounded-lg px-3 py-2 text-sm ${severityColor[incident.severity] || severityColor.low}`}>
                      <span className="text-slate-400 text-xs block">Severity</span>
                      <span className="font-bold capitalize">{incident.severity}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Evidence Files */}
              {incident.file_name && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">📁 Evidence Files</p>
                  <div className="bg-slate-900/50 rounded-lg p-3 mb-2 flex items-center gap-3 flex-wrap">
                    <span className="text-slate-300 text-sm font-medium">📄 {incident.file_name}</span>
                    <div className="w-full">
                      <span className="text-xs text-slate-500">SHA-256: </span>
                      <span className="font-mono text-xs text-green-400 break-all">{incident.file_hash}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Expert Notes — Previous */}
              {incident.notes && incident.notes.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">📝 Previous Notes</p>
                  {incident.notes.map(note => (
                    <div key={note.id} className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mb-2">
                      <p className="text-slate-300 text-sm">{note.note}</p>
                      <p className="text-slate-500 text-xs mt-1">{new Date(note.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Note */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">✍️ Add Expert Note</p>
                <textarea
                  rows={3}
                  placeholder="Type your expert recommendation, containment steps, or analysis findings..."
                  value={noteText[incident.id] || ''}
                  onChange={e => setNoteText(n => ({ ...n, [incident.id]: e.target.value }))}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-blue-500 transition-all mb-2"
                />
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleAddNote(incident.id)}
                    disabled={saving[incident.id]}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-6 py-2 rounded-xl text-sm font-semibold transition-all"
                  >
                    {saving[incident.id] ? '⏳ Saving...' : '💾 Save Note'}
                  </button>
                  {feedback[incident.id] && (
                    <span className="text-sm text-green-400">{feedback[incident.id]}</span>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

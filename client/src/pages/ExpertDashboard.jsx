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
import ChatPanel   from '../components/ChatPanel';
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

              {/* ── ML Threat Analysis ── */}
              {incident.ml_prediction ? (
                <div className="mb-4 rounded-xl overflow-hidden border border-slate-700">
                  {/* Header bar */}
                  <div className="bg-slate-900 px-4 py-2 flex items-center gap-2 border-b border-slate-700">
                    <span className="text-lg">🤖</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Threat Analysis Result</span>
                  </div>
                  <div className="bg-slate-900/40 p-4 flex flex-wrap gap-3">
                    {/* Attack Type */}
                    <div className={`flex-1 min-w-[140px] rounded-xl p-3 border text-center ${
                      incident.ml_prediction === 'SQL_Injection'   ? 'bg-red-500/15 border-red-500/40' :
                      incident.ml_prediction === 'DDoS'            ? 'bg-orange-500/15 border-orange-500/40' :
                      incident.ml_prediction === 'Brute_Force'     ? 'bg-yellow-500/15 border-yellow-500/40' :
                      incident.ml_prediction === 'Path_Traversal'  ? 'bg-purple-500/15 border-purple-500/40' :
                      'bg-green-500/15 border-green-500/40'
                    }`}>
                      <p className="text-xs text-slate-400 mb-1">⚔️ Attack Type</p>
                      <p className={`text-lg font-black ${
                        incident.ml_prediction === 'SQL_Injection'  ? 'text-red-400' :
                        incident.ml_prediction === 'DDoS'           ? 'text-orange-400' :
                        incident.ml_prediction === 'Brute_Force'    ? 'text-yellow-400' :
                        incident.ml_prediction === 'Path_Traversal' ? 'text-purple-400' :
                        'text-green-400'
                      }`}>{incident.ml_prediction?.replace('_', ' ')}</p>
                    </div>
                    {/* Severity */}
                    <div className={`flex-1 min-w-[120px] rounded-xl p-3 border text-center ${severityColor[incident.severity] || severityColor.low}`}>
                      <p className="text-xs text-slate-400 mb-1">🚨 Severity</p>
                      <p className="text-lg font-black capitalize">{incident.severity || 'N/A'}</p>
                    </div>
                    {/* Confidence */}
                    {incident.confidence_score && (
                      <div className="flex-1 min-w-[120px] rounded-xl p-3 border border-blue-500/30 bg-blue-500/10 text-center">
                        <p className="text-xs text-slate-400 mb-1">📊 Confidence</p>
                        <p className="text-lg font-black text-blue-400">
                          {(incident.confidence_score * 100).toFixed(0)}%
                        </p>
                      </div>
                    )}
                  </div>
                  {/* What to do hint */}
                  <div className="bg-slate-900/60 px-4 py-2 border-t border-slate-700">
                    <p className="text-xs text-slate-500">
                      {incident.ml_prediction === 'SQL_Injection'  && '💡 Check database logs for unauthorized SELECT/UNION/DROP queries. Sanitize all user inputs.'}
                      {incident.ml_prediction === 'DDoS'           && '💡 Block the high-frequency IP address. Enable rate limiting and traffic filtering on the server.'}
                      {incident.ml_prediction === 'Brute_Force'    && '💡 Lock the targeted account. Enable CAPTCHA and multi-factor authentication immediately.'}
                      {incident.ml_prediction === 'Path_Traversal' && '💡 Check file access logs for ../ patterns. Restrict file system access and validate all file paths.'}
                      {incident.ml_prediction === 'Normal'         && '💡 No threat detected by AI. Review manually to confirm — may be a false alarm.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mb-4 rounded-xl border border-dashed border-slate-700 p-4 text-center">
                  <p className="text-slate-500 text-sm">⏳ No AI analysis yet — file may not have been uploaded with this incident.</p>
                </div>
              )}


              {/* Evidence Files + Download */}
              {incident.file_name && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">📁 Evidence File</p>
                  <div className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <span className="text-slate-300 text-sm font-medium">📄 {incident.file_name}</span>
                      <div className="mt-1">
                        <span className="text-xs text-slate-500">SHA-256: </span>
                        <span className="font-mono text-xs text-green-400 break-all">{incident.file_hash}</span>
                      </div>
                    </div>
                    {incident.stored_file_name && (
                      <a
                        href={`http://localhost:5000/uploads/${incident.stored_file_name}`}
                        download={incident.file_name}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0"
                      >
                        ⬇️ Download File
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Chat Panel — Proper real-time chat */}
              <div className="mt-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">💬 Communication with Client</p>
                <ChatPanel
                  incidentId={incident.id}
                  incidentTitle={incident.title}
                />
              </div>


            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

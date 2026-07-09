import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import TypeBadge from '../components/TypeBadge.jsx';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function IncidentDetailModal({ incident, onClose, onRefresh }) {
  const [replyText, setReplyText]   = useState('');
  const [sending,   setSending]     = useState(false);
  const [sendFeedback, setSendFeedback] = useState('');

  if (!incident) return null;

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    setSendFeedback('');
    try {
      await api.post(`/incidents/${incident.id}/note`, {
        incidentId: incident.id,
        note: replyText.trim(),
      });
      setReplyText('');
      setSendFeedback('✅ Message sent!');
      onRefresh(); // Reload incidents to show new message
    } catch (err) {
      setSendFeedback('❌ Failed to send. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/80">
          <div>
            <h2 className="text-lg font-bold text-white">{incident.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={incident.status} />
              <TypeBadge type={incident.type} />
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</p>
            <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 leading-relaxed">
              {incident.description}
            </div>
          </div>

          {/* Assigned Expert */}
          {incident.assigned_expert_name && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <span className="text-blue-400 text-sm">🔵 <strong>Assigned Expert:</strong> {incident.assigned_expert_name}</span>
            </div>
          )}

          {/* ML Prediction */}
          {incident.ml_prediction && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">🤖 AI Threat Analysis</p>
              <div className="flex gap-3 flex-wrap">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 text-sm">
                  <span className="text-slate-400 text-xs block">Threat Type</span>
                  <span className="text-blue-300 font-bold">{incident.ml_prediction}</span>
                </div>
                <div className={`rounded-lg px-3 py-2 text-sm ${
                  incident.severity === 'critical' ? 'bg-red-500/10 border border-red-500/30 text-red-300' :
                  incident.severity === 'high'     ? 'bg-orange-500/10 border border-orange-500/30 text-orange-300' :
                  incident.severity === 'medium'   ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-300' :
                  'bg-green-500/10 border border-green-500/30 text-green-300'
                }`}>
                  <span className="text-slate-400 text-xs block">Severity</span>
                  <span className="font-bold capitalize">{incident.severity}</span>
                </div>
              </div>
            </div>
          )}

          {/* File Hash */}
          {incident.file_hash && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">🔒 Evidence File Hash (SHA-256)</p>
              <code className="block text-xs font-mono text-green-400 bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2.5 break-all">
                {incident.file_hash}
              </code>
            </div>
          )}

          {/* Communication Thread */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">💬 Communication with Expert</p>
            {incident.notes && incident.notes.length > 0 ? (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {incident.notes.map(note => {
                  const isExpert = note.author_role === 'expert' || note.author_role === 'admin';
                  return (
                    <div key={note.id} className={`rounded-xl p-3 ${
                      isExpert
                        ? 'bg-blue-500/10 border border-blue-500/20 ml-6'
                        : 'bg-slate-800 border border-slate-700 mr-6'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold ${isExpert ? 'text-blue-400' : 'text-amber-400'}`}>
                          {isExpert ? '🔵 Expert:' : '👤 You:'} {note.author_name}
                        </span>
                        <span className="text-slate-600 text-xs">{new Date(note.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-300 text-sm">{note.note}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-600 text-sm italic">No messages yet. The expert will post updates here.</p>
            )}
          </div>

          {/* Reply Box */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">✍️ Send a Message to Expert</p>
            <textarea
              rows={3}
              placeholder="Provide additional details, ask a question, or follow up with the expert..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-blue-500 transition-all mb-2"
            />
            <div className="flex items-center gap-4">
              <button
                onClick={handleSendReply}
                disabled={sending || !replyText.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all"
              >
                {sending ? '⏳ Sending...' : '📤 Send Message'}
              </button>
              {sendFeedback && <span className="text-sm">{sendFeedback}</span>}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/50">
          <button onClick={onClose} className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-xl text-sm font-semibold transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


export default function UserDashboard() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/incidents/my');
      setIncidents(res.data?.incidents || res.data || []);
    } catch (err) {
      setError('Failed to load incidents.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: incidents.length,
    open: incidents.filter((i) => i.status === 'open').length,
    inProgress: incidents.filter((i) => i.status === 'in_progress').length,
    resolved: incidents.filter((i) => i.status === 'resolved').length,
  };

  const filteredIncidents =
    filterStatus === 'all' ? incidents : incidents.filter((i) => i.status === filterStatus);

  return (
    <div className="flex min-h-screen bg-dark-200">
      <Sidebar />

      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white mb-1">My Dashboard</h1>
            <p className="text-slate-400">
              Welcome back, <span className="text-white font-semibold">{user?.name}</span>. Here are your reported incidents.
            </p>
          </div>
          <Link to="/report" className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Report Incident
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            color="blue"
            value={stats.total}
            label="Total Reports"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            color="red"
            value={stats.open}
            label="Open"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
          <StatCard
            color="yellow"
            value={stats.inProgress}
            label="In Progress"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            color="green"
            value={stats.resolved}
            label="Resolved"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Incidents Table */}
        <div className="glass-card border border-white/10 overflow-hidden">
          {/* Table Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
            <h2 className="text-lg font-bold text-white">My Incidents</h2>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-dark-50 border border-white/10">
              {['all', 'open', 'in_progress', 'resolved'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    filterStatus === status
                      ? 'bg-brand-red text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {status === 'all' ? 'All' : status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <svg className="w-8 h-8 animate-spin text-brand-red" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-slate-400 text-sm">Loading incidents...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20 text-brand-red">{error}</div>
          ) : filteredIncidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-600">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-slate-300 font-semibold mb-1">No incidents found</p>
                <p className="text-slate-500 text-sm">
                  {filterStatus === 'all'
                    ? "You haven't reported any incidents yet."
                    : `No ${filterStatus.replace('_', ' ')} incidents.`}
                </p>
              </div>
              <Link to="/report" className="btn-primary text-sm px-6 py-2.5">
                Report Your First Incident
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/3">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Expert</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.map((incident) => (
                    <tr key={incident.id} className="table-row-dark">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-white truncate max-w-[200px]">{incident.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{incident.description?.slice(0, 60)}...</p>
                      </td>
                      <td className="px-4 py-4">
                        <TypeBadge type={incident.type} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={incident.status} />
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-400 font-mono whitespace-nowrap">
                        {new Date(incident.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-4">
                        {incident.assignedTo ? (
                          <span className="text-xs text-blue-400 font-semibold">
                            {incident.assignedTo?.name || incident.assignedTo}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => setSelectedIncident(incident)}
                          className="text-xs font-semibold text-brand-red hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-brand-red/10 border border-transparent hover:border-brand-red/20"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onRefresh={fetchIncidents}
        />
      )}
    </div>
  );
}

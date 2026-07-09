// ─────────────────────────────────────────────
// Shield-Source | Admin Dashboard
// Full control: view all incidents, assign experts,
// manage users, and see platform-wide stats
// ─────────────────────────────────────────────
import { useState, useEffect } from 'react';
import Sidebar     from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import TypeBadge   from '../components/TypeBadge';
import StatCard    from '../components/StatCard';
import api         from '../services/api';

export default function AdminDashboard() {
  const [stats,     setStats]     = useState({});
  const [incidents, setIncidents] = useState([]);
  const [users,     setUsers]     = useState([]);
  const [experts,   setExperts]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [assigning, setAssigning] = useState({});   // assigning[incidentId]
  const [feedback,  setFeedback]  = useState({});
  const [activeTab, setActiveTab] = useState('incidents'); // 'incidents' | 'users'
  const [error,     setError]     = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [statsRes, incRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/incidents'),
        api.get('/admin/users'),
      ]);
      setStats(statsRes.data);
      setIncidents(incRes.data?.incidents || []);
      setUsers(usersRes.data?.users || []);
      // Filter only experts from users list (for assignment dropdown)
      setExperts((usersRes.data?.users || []).filter(u => u.role === 'expert'));
    } catch (err) {
      setError('Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  // Assign an expert to an incident
  const handleAssign = async (incidentId, expertId) => {
    if (!expertId) return;
    setAssigning(a => ({ ...a, [incidentId]: true }));
    try {
      await api.post('/admin/assign', { incidentId, expertId });
      const expertName = experts.find(e => e.id === parseInt(expertId))?.name || 'Expert';
      setFeedback(f => ({ ...f, [incidentId]: `✅ Assigned to ${expertName}` }));
      // Update local state to reflect assignment
      setIncidents(prev =>
        prev.map(inc =>
          inc.id === incidentId
            ? { ...inc, status: 'in_progress', assigned_expert_id: parseInt(expertId), expert_name: expertName }
            : inc
        )
      );
      setTimeout(() => setFeedback(f => ({ ...f, [incidentId]: '' })), 3000);
    } catch (err) {
      setFeedback(f => ({ ...f, [incidentId]: '❌ Assignment failed.' }));
    } finally {
      setAssigning(a => ({ ...a, [incidentId]: false }));
    }
  };

  const roleColor = {
    admin:  'bg-red-500/20 text-red-400 border border-red-500/30',
    expert: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    user:   'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex">
      <Sidebar />

      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white mb-1">⚙️ Admin Control Panel</h1>
          <p className="text-slate-400">Full oversight of incidents, experts, and platform statistics.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 mb-6 text-sm">⚠️ {error}</div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard icon="👥" label="Total Users"    value={stats.total_users    || 0} color="blue"   />
          <StatCard icon="🔍" label="Experts"        value={stats.total_experts  || 0} color="purple" />
          <StatCard icon="🚨" label="Open Cases"     value={stats.open_cases     || 0} color="red"    />
          <StatCard icon="✅" label="Resolved Cases" value={stats.resolved_cases || 0} color="green"  />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'incidents', label: '🚨 All Incidents', count: incidents.length },
            { key: 'users',     label: '👥 User Management', count: users.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {tab.label}
              <span className="ml-2 bg-white/10 px-2 py-0.5 rounded-full text-xs">{tab.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">
            <div className="text-5xl mb-4 animate-spin">⏳</div>
            <p>Loading admin data...</p>
          </div>
        ) : (
          <>
            {/* ── ALL INCIDENTS TAB ── */}
            {activeTab === 'incidents' && (
              <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 overflow-hidden">
                <div className="p-5 border-b border-slate-700">
                  <h2 className="text-lg font-bold text-white">All Incidents</h2>
                  <p className="text-slate-400 text-sm">Assign experts to open cases</p>
                </div>

                {incidents.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <div className="text-5xl mb-3">📭</div>
                    <p>No incidents reported yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-slate-500 uppercase tracking-widest border-b border-slate-700">
                          <th className="px-5 py-3">ID</th>
                          <th className="px-5 py-3">Title</th>
                          <th className="px-5 py-3">Type</th>
                          <th className="px-5 py-3">Reporter</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">ML Threat</th>
                          <th className="px-5 py-3">Assign Expert</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incidents.map(inc => (
                          <tr key={inc.id} className="border-b border-slate-700/40 hover:bg-slate-700/20 transition-colors">
                            <td className="px-5 py-4 font-mono text-slate-500 text-sm">#{inc.id}</td>
                            <td className="px-5 py-4">
                              <p className="text-white font-semibold text-sm truncate max-w-[180px]">{inc.title}</p>
                              <p className="text-slate-500 text-xs">{new Date(inc.created_at).toLocaleDateString()}</p>
                            </td>
                            <td className="px-5 py-4"><TypeBadge type={inc.type} /></td>
                            <td className="px-5 py-4 text-slate-300 text-sm">{inc.reporter_name}</td>
                            <td className="px-5 py-4"><StatusBadge status={inc.status} /></td>
                            <td className="px-5 py-4">
                              {inc.threat_type ? (
                                <span className="text-blue-400 text-xs font-semibold bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">
                                  {inc.threat_type}
                                </span>
                              ) : (
                                <span className="text-slate-600 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                {inc.expert_name ? (
                                  <span className="text-green-400 text-xs font-semibold">
                                    👤 {inc.expert_name}
                                  </span>
                                ) : (
                                  <>
                                    <select
                                      defaultValue=""
                                      onChange={e => handleAssign(inc.id, e.target.value)}
                                      disabled={assigning[inc.id]}
                                      className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-red-500 transition-all"
                                    >
                                      <option value="" disabled>Select Expert</option>
                                      {experts.map(ex => (
                                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                                      ))}
                                    </select>
                                    {assigning[inc.id] && <span className="text-yellow-400 text-xs">Assigning...</span>}
                                  </>
                                )}
                                {feedback[inc.id] && (
                                  <span className="text-green-400 text-xs">{feedback[inc.id]}</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── USER MANAGEMENT TAB ── */}
            {activeTab === 'users' && (
              <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 overflow-hidden">
                <div className="p-5 border-b border-slate-700">
                  <h2 className="text-lg font-bold text-white">All Users</h2>
                  <p className="text-slate-400 text-sm">Platform-wide user list</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 uppercase tracking-widest border-b border-slate-700">
                        <th className="px-5 py-3">ID</th>
                        <th className="px-5 py-3">Name</th>
                        <th className="px-5 py-3">Email</th>
                        <th className="px-5 py-3">Role</th>
                        <th className="px-5 py-3">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id} className="border-b border-slate-700/40 hover:bg-slate-700/20 transition-colors">
                          <td className="px-5 py-4 font-mono text-slate-500 text-sm">#{user.id}</td>
                          <td className="px-5 py-4 text-white font-semibold text-sm">{user.name}</td>
                          <td className="px-5 py-4 text-slate-400 text-sm">{user.email}</td>
                          <td className="px-5 py-4">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-lg capitalize ${roleColor[user.role]}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-400 text-sm">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

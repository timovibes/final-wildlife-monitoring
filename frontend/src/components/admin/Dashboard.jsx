import React, { useState, useEffect } from 'react';
import { Users, Layers, Eye, AlertTriangle, Activity, TrendingUp, CheckCircle, ShieldAlert, UserCog, ChevronDown, Radio } from 'lucide-react';
import Navbar from '../shared/Navbar';
import authService from '../../services/auth';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const user = authService.getCurrentUser();
  const [stats, setStats] = useState(null);
  const [recentSightings, setRecentSightings] = useState([]);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [processingId, setProcessingId] = useState(null);
  const navigate = useNavigate();

  // ── ML: verification priority + user activity anomalies (admin only) ──────
  const [verificationPriority, setVerificationPriority] = useState([]);
  const [verificationError, setVerificationError] = useState(null);
  const [userAnomalies, setUserAnomalies] = useState([]);
  const [userAnomalyError, setUserAnomalyError] = useState(null);

  // Insights panel starts collapsed — keeps the dashboard focused on
  // actionable items first; ML panels are opt-in, not forced on every load
  const [insightsOpen, setInsightsOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashboardRes, sightingsRes, incidentsRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/sightings?limit=5'),
        api.get('/incidents?limit=5')
      ]);

      if (dashboardRes.data.success) {
        setStats(dashboardRes.data.data.summary);
      }
      if (sightingsRes.data.success) {
        setRecentSightings(sightingsRes.data.data.sightings);
      }
      if (incidentsRes.data.success) {
        setRecentIncidents(incidentsRes.data.data.incidents);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }

    try {
      const vpRes = await api.get('/ml/verification-priority');
      if (vpRes.data.success) {
        setVerificationPriority(vpRes.data.data.scores);
        setVerificationError(null);
      }
    } catch (err) {
      console.error('Verification priority fetch failed:', err);
      setVerificationError(err.response?.data?.message || 'ML scoring service unavailable.');
    }

    try {
      const uaRes = await api.get('/ml/user-activity-anomalies');
      if (uaRes.data.success) {
        setUserAnomalies(uaRes.data.data.users);
        setUserAnomalyError(null);
      }
    } catch (err) {
      console.error('User activity anomaly fetch failed:', err);
      setUserAnomalyError(err.response?.data?.message || 'ML scoring service unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySighting = async (id) => {
    try {
      setProcessingId(id);
      const response = await api.put(`/sightings/${id}/verify`);

      if (response.data.success) {
        setRecentSightings(prev =>
          prev.map(s => s.id === id ? { ...s, verified: response.data.data.sighting.verified } : s)
        );
      }
    } catch (error) {
      console.error('Verification failed:', error);
      alert('Failed to verify sighting.');
    } finally {
      setProcessingId(null);
    }
  };

  const StatCard = ({ icon: Icon, title, value }) => (
    <div className="border border-bush-line bg-bush-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-bone/50">{title}</p>
        <Icon className="h-4 w-4 text-ochre" />
      </div>
      <p className="font-display text-3xl font-semibold text-bone">{value || 0}</p>
    </div>
  );

  const pendingSightingsCount = recentSightings.filter(s => !s.verified).length;
  const reportedIncidentsCount = recentIncidents.filter(i => i.status === 'Reported').length;
  const anomalyCount = userAnomalies.filter(u => u.isAnomaly).length;
  const insightCount = verificationPriority.length + anomalyCount;

  if (loading) {
    return (
      <div className="min-h-screen bg-bush text-bone font-body">
        {<Navbar user={user} />}
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-bush-line border-t-ochre mx-auto"></div>
            <p className="mt-4 font-mono text-xs uppercase tracking-widest text-bone/50">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bush text-bone font-body">
      {<Navbar user={user} />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold">Admin Dashboard</h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-bone/50">
            Complete system overview and management
          </p>
        </div>

        {/* Statistics Grid — moved to the top: orientation before analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Layers} title="Total Species" value={stats?.totalSpecies} />
          <StatCard icon={Eye} title="Total Sightings" value={stats?.totalSightings} />
          <StatCard icon={AlertTriangle} title="Total Incidents" value={stats?.totalIncidents} />
          <StatCard icon={Users} title="System Users" value={stats?.totalUsers} />
        </div>

        {/* Quick Actions — slim row, not a boxed section */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => navigate('/admin/users')}
            className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-bush-line hover:border-ochre hover:bg-bush-surface transition-colors font-mono text-[11px] uppercase tracking-widest text-bone/70"
          >
            <Users className="h-3.5 w-3.5 text-bone/40" />
            Manage Users
          </button>
          <button
            onClick={() => navigate('/admin/species')}
            className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-bush-line hover:border-ochre hover:bg-bush-surface transition-colors font-mono text-[11px] uppercase tracking-widest text-bone/70"
          >
            <Layers className="h-3.5 w-3.5 text-bone/40" />
            Manage Species
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-bush-line hover:border-ochre hover:bg-bush-surface transition-colors font-mono text-[11px] uppercase tracking-widest text-bone/70"
          >
            <TrendingUp className="h-3.5 w-3.5 text-bone/40" />
            View Reports
          </button>
          <button
            onClick={() => navigate('/admin/iot')}
            className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-bush-line hover:border-ochre hover:bg-bush-surface transition-colors font-mono text-[11px] uppercase tracking-widest text-bone/70"
          >
            <Radio className="h-3.5 w-3.5 text-bone/40" />
            IoT Monitor
          </button>
        </div>

        {/* Tabs — now the primary content, with pending counts surfaced */}
        <div className="border border-bush-line bg-bush-surface mb-6">
          <div className="border-b border-bush-line">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-mono text-xs uppercase tracking-widest transition-colors ${
                  activeTab === 'overview'
                    ? 'border-ochre text-bone'
                    : 'border-transparent text-bone/40 hover:text-bone/70'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('sightings')}
                className={`py-4 px-1 border-b-2 font-mono text-xs uppercase tracking-widest transition-colors ${
                  activeTab === 'sightings'
                    ? 'border-ochre text-bone'
                    : 'border-transparent text-bone/40 hover:text-bone/70'
                }`}
              >
                Sightings{pendingSightingsCount > 0 ? ` (${pendingSightingsCount} pending)` : ''}
              </button>
              <button
                onClick={() => setActiveTab('incidents')}
                className={`py-4 px-1 border-b-2 font-mono text-xs uppercase tracking-widest transition-colors ${
                  activeTab === 'incidents'
                    ? 'border-ochre text-bone'
                    : 'border-transparent text-bone/40 hover:text-bone/70'
                }`}
              >
                Incidents{reportedIncidentsCount > 0 ? ` (${reportedIncidentsCount} reported)` : ''}
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-bush-line p-5">
                  <h3 className="font-mono text-[10px] uppercase tracking-widest text-bone/50 mb-2">
                    Endangered Species
                  </h3>
                  <p className="font-display text-3xl font-semibold text-rust">
                    {stats?.endangeredSpecies || 0}
                  </p>
                  <p className="text-xs text-bone/50 mt-2">Requiring special attention</p>
                </div>
                <div className="border border-bush-line p-5">
                  <h3 className="font-mono text-[10px] uppercase tracking-widest text-bone/50 mb-2">
                    Active IoT Sensors
                  </h3>
                  <p className="font-display text-3xl font-semibold text-teal">
                    {stats?.activeSensors || 0}
                  </p>
                  <p className="text-xs text-bone/50 mt-2">Transmitting real-time data</p>
                </div>
              </div>
            )}

            {activeTab === 'sightings' && (
              <div className="border border-bush-line">
                {recentSightings.length === 0 ? (
                  <p className="text-center font-mono text-xs uppercase tracking-widest text-bone/40 py-8">
                    No recent sightings
                  </p>
                ) : (
                  recentSightings.map((sighting) => (
                    <div key={sighting.id} className="field-tag">
                      <span
                        className={`status-dot ${
                          sighting.verified ? 'status-dot-online' : 'status-dot-pending'
                        }`}
                      ></span>
                      <div className="flex-1 flex justify-between items-center gap-4">
                        <div>
                          <h4 className="font-display font-semibold text-sm">
                            {sighting.species?.commonName}
                          </h4>
                          <p className="font-mono text-[11px] text-bone/50 mt-1">
                            {sighting.count} individuals &middot; {sighting.location}
                          </p>
                          <p className="text-xs text-bone/40 mt-1">
                            Observed by: {sighting.observer?.firstName} {sighting.observer?.lastName}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span
                            className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 border ${
                              sighting.verified
                                ? 'border-teal text-teal'
                                : 'border-ochre-dim text-ochre'
                            }`}
                          >
                            {sighting.verified ? 'Verified' : 'Pending'}
                          </span>

                          {!sighting.verified && (
                            <button
                              onClick={() => handleVerifySighting(sighting.id)}
                              disabled={processingId === sighting.id}
                              className="flex items-center gap-1.5 border border-teal text-teal font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 hover:bg-teal hover:text-bush transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="h-3 w-3" />
                              {processingId === sighting.id ? 'Processing...' : 'Verify'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'incidents' && (
              <div className="border border-bush-line">
                {recentIncidents.length === 0 ? (
                  <p className="text-center font-mono text-xs uppercase tracking-widest text-bone/40 py-8">
                    No recent incidents
                  </p>
                ) : (
                  recentIncidents.map((incident) => (
                    <div key={incident.id} className="field-tag border-l-2 border-l-rust">
                      <div className="flex-1 flex justify-between items-start gap-4">
                        <div>
                          <h4 className="font-display font-semibold text-sm">
                            {incident.incidentType}
                          </h4>
                          <p className="text-sm text-bone/60 mt-1">
                            {incident.description}
                          </p>
                          <p className="font-mono text-[11px] text-bone/40 mt-2">
                            Reported by: {incident.reporter?.firstName} {incident.reporter?.lastName}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span
                            className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 border ${
                              incident.severity === 'Critical'
                                ? 'border-rust text-rust'
                                : incident.severity === 'High'
                                ? 'border-ochre text-ochre'
                                : 'border-bush-line text-bone/50'
                            }`}
                          >
                            {incident.severity}
                          </span>
                          <p className="text-xs text-bone/40 mt-2">{incident.status}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Insights — collapsed by default. Both ML panels live here now,
            behind one toggle, so they're available but not forced on every load. */}
        <div className="border border-bush-line bg-bush-surface">
          <button
            onClick={() => setInsightsOpen(prev => !prev)}
            className="w-full flex items-center justify-between p-6"
          >
            <div className="flex items-center">
              <ShieldAlert className="h-4 w-4 text-ochre mr-2" />
              <h2 className="font-display text-base font-semibold">Insights</h2>
              {insightCount > 0 && (
                <span className="ml-2 font-mono text-[11px] px-2 py-0.5 border border-ochre-dim text-ochre">
                  {insightCount}
                </span>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 text-bone/40 transition-transform ${insightsOpen ? 'rotate-180' : ''}`} />
          </button>

          {insightsOpen && (
            <div className="px-6 pb-6 space-y-8">
              {/* Verification Priority */}
              <div>
                <div className="flex items-center mb-4">
                  <ShieldAlert className="h-4 w-4 text-ochre mr-2" />
                  <h3 className="font-display text-sm font-semibold">Verification Priority</h3>
                  <span className="ml-2 font-mono text-[11px] text-bone/40">ML-ranked, pending sightings needing closer review</span>
                </div>

                {verificationError ? (
                  <p className="text-center font-mono text-xs uppercase tracking-widest text-rust py-8">{verificationError}</p>
                ) : verificationPriority.length === 0 ? (
                  <p className="text-center font-mono text-xs uppercase tracking-widest text-bone/40 py-8">No pending sightings</p>
                ) : (
                  <div className="border border-bush-line">
                    {verificationPriority.slice(0, 8).map((v) => (
                      <div key={v.sightingId} className="field-tag">
                        <div className="flex-1 flex justify-between items-center gap-4">
                          <div>
                            <h4 className="font-display font-semibold text-sm">{v.commonName}</h4>
                            <p className="font-mono text-[11px] text-bone/50 mt-1">
                              {v.count} individuals &middot; reported by {v.reporterName}
                              {v.breakdown.distanceFromSpeciesCentroidKm != null &&
                                ` \u00b7 ${v.breakdown.distanceFromSpeciesCentroidKm}km from typical location`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 border ${
                              v.priorityLevel === 'Critical' ? 'border-rust text-rust' :
                              v.priorityLevel === 'High' ? 'border-ochre text-ochre' :
                              v.priorityLevel === 'Medium' ? 'border-ochre-dim text-ochre' :
                              'border-teal text-teal'
                            }`}>
                              {v.priorityLevel} &middot; {v.priorityScore}
                            </span>
                            {/* Act directly from here instead of hunting through the Sightings tab */}
                            <button
                              onClick={() => handleVerifySighting(v.sightingId)}
                              disabled={processingId === v.sightingId}
                              className="flex items-center gap-1.5 border border-teal text-teal font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 hover:bg-teal hover:text-bush transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="h-3 w-3" />
                              {processingId === v.sightingId ? '...' : 'Verify'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* User Activity Anomalies */}
              <div>
                <div className="flex items-center mb-4">
                  <UserCog className="h-4 w-4 text-teal mr-2" />
                  <h3 className="font-display text-sm font-semibold">User Activity Anomalies</h3>
                  <span className="ml-2 font-mono text-[11px] text-bone/40">Per-user z-score vs their own 8-week baseline</span>
                </div>

                {userAnomalyError ? (
                  <p className="text-center font-mono text-xs uppercase tracking-widest text-rust py-8">{userAnomalyError}</p>
                ) : anomalyCount === 0 ? (
                  <p className="text-center font-mono text-xs uppercase tracking-widest text-bone/40 py-8">No unusual activity detected</p>
                ) : (
                  <div className="border border-bush-line">
                    {userAnomalies.filter(u => u.isAnomaly).map((u) => (
                      <div key={u.userId} className="field-tag">
                        <div className="flex-1 flex justify-between items-center gap-4">
                          <div>
                            <h4 className="font-display font-semibold text-sm">{u.name}</h4>
                            <p className="font-mono text-[11px] text-bone/50 mt-1">
                              {u.latestWeekCount} this week vs usual {u.historicalMean} &middot; z-score {u.zScore}
                            </p>
                          </div>
                          <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 border flex-shrink-0 ${
                            u.direction === 'spike' ? 'border-ochre text-ochre' : 'border-teal text-teal'
                          }`}>
                            {u.direction === 'spike' ? 'Spike' : 'Drop'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
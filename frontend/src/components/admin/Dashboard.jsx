import React, { useState, useEffect } from 'react';
// Added CheckCircle to imports
import { Users, Layers, Eye, AlertTriangle, Activity, TrendingUp, CheckCircle } from 'lucide-react';
import Navbar from '../shared/Navbar';
import authService from '../../services/auth';
import api from '../../services/api';
import IoTDataViewer from './IoTDataViewer';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const user = authService.getCurrentUser();
  const [stats, setStats] = useState(null);
  const [recentSightings, setRecentSightings] = useState([]);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  // New State for handling button loading status
  const [processingId, setProcessingId] = useState(null);
  const navigate = useNavigate();

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
    } finally {
      setLoading(false);
    }
  };

  // New Feature: Function to verify a sighting
  const handleVerifySighting = async (id) => {
    try {
      setProcessingId(id);
      const response = await api.put(`/sightings/${id}/verify`);
      
      if (response.data.success) {
        // Update local state to reflect change immediately
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

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Layers}
            title="Total Species"
            value={stats?.totalSpecies}
          />
          <StatCard
            icon={Eye}
            title="Total Sightings"
            value={stats?.totalSightings}
          />
          <StatCard
            icon={AlertTriangle}
            title="Total Incidents"
            value={stats?.totalIncidents}
          />
          <StatCard
            icon={Users}
            title="System Users"
            value={stats?.totalUsers}
          />
        </div>

        {/* Tabs */}
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
                Recent Sightings
              </button>
              <button
                onClick={() => setActiveTab('incidents')}
                className={`py-4 px-1 border-b-2 font-mono text-xs uppercase tracking-widest transition-colors ${
                  activeTab === 'incidents'
                    ? 'border-ochre text-bone'
                    : 'border-transparent text-bone/40 hover:text-bone/70'
                }`}
              >
                Recent Incidents
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-bush-line p-5">
                    <h3 className="font-mono text-[10px] uppercase tracking-widest text-bone/50 mb-2">
                      Endangered Species
                    </h3>
                    <p className="font-display text-3xl font-semibold text-rust">
                      {stats?.endangeredSpecies || 0}
                    </p>
                    <p className="text-xs text-bone/50 mt-2">
                      Requiring special attention
                    </p>
                  </div>
                  <div className="border border-bush-line p-5">
                    <h3 className="font-mono text-[10px] uppercase tracking-widest text-bone/50 mb-2">
                      Active IoT Sensors
                    </h3>
                    <p className="font-display text-3xl font-semibold text-teal">
                      {stats?.activeSensors || 0}
                    </p>
                    <p className="text-xs text-bone/50 mt-2">
                      Transmitting real-time data
                    </p>
                  </div>
                </div>
                
                <div className="border border-ochre-dim bg-bush p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-4 w-4 text-ochre flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-mono text-[10px] uppercase tracking-widest text-ochre">
                        Admin Privileges Active
                      </h3>
                      <p className="mt-2 text-sm text-bone/70">
                        You have full access to manage users, species, verify sightings, and resolve incidents.
                      </p>
                    </div>
                  </div>
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

                          {/* New Feature: Verify Button */}
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
        <IoTDataViewer />
        
          

        {/* Quick Actions */}
        <div className="border border-bush-line bg-bush-surface p-6 mt-8">
          <h2 className="font-display text-base font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => navigate('/admin/users')} 
              className="p-4 border border-dashed border-bush-line hover:border-ochre hover:bg-bush transition-colors">
              <Users className="h-6 w-6 text-bone/40 mx-auto mb-2" />
              <p className="font-mono text-[11px] uppercase tracking-widest text-bone/70">Manage Users</p>
            </button>
            <button 
              onClick={() => navigate('/admin/species')}
              className="p-4 border border-dashed border-bush-line hover:border-ochre hover:bg-bush transition-colors">
              <Layers className="h-6 w-6 text-bone/40 mx-auto mb-2" />
              <p className="font-mono text-[11px] uppercase tracking-widest text-bone/70">Manage Species</p>
            </button>
            <button 
              onClick={() => navigate('/reports')}
              className="p-4 border border-dashed border-bush-line hover:border-ochre hover:bg-bush transition-colors">
              <TrendingUp className="h-6 w-6 text-bone/40 mx-auto mb-2" />
              <p className="font-mono text-[11px] uppercase tracking-widest text-bone/70">View Reports</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
import React, { useState, useEffect } from 'react';
import { Users, Layers, Eye, AlertTriangle, Activity, TrendingUp } from 'lucide-react';
import Navbar from '../shared/Navbar';
import authService from '../../services/auth';
import api from '../../services/api';

const AdminDashboard = () => {
  const user = authService.getCurrentUser();
  const [stats, setStats] = useState(null);
  const [recentSightings, setRecentSightings] = useState([]);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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

  const StatCard = ({ icon: Icon, title, value, color }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value || 0}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {<Navbar user={user} />}
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {<Navbar user={user} />}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Complete system overview and management</p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Layers}
            title="Total Species"
            value={stats?.totalSpecies}
            color="bg-blue-600"
          />
          <StatCard
            icon={Eye}
            title="Total Sightings"
            value={stats?.totalSightings}
            color="bg-green-600"
          />
          <StatCard
            icon={AlertTriangle}
            title="Total Incidents"
            value={stats?.totalIncidents}
            color="bg-red-600"
          />
          <StatCard
            icon={Users}
            title="System Users"
            value={stats?.totalUsers}
            color="bg-purple-600"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('sightings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sightings'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Recent Sightings
              </button>
              <button
                onClick={() => setActiveTab('incidents')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'incidents'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Recent Incidents
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      Endangered Species
                    </h3>
                    <p className="text-3xl font-bold text-green-600">
                      {stats?.endangeredSpecies || 0}
                    </p>
                    <p className="text-sm text-green-700 mt-2">
                      Requiring special attention
                    </p>
                  </div>
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">
                      Active IoT Sensors
                    </h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {stats?.activeSensors || 0}
                    </p>
                    <p className="text-sm text-blue-700 mt-2">
                      Transmitting real-time data
                    </p>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Admin Privileges Active
                      </h3>
                      <p className="mt-2 text-sm text-yellow-700">
                        You have full access to manage users, species, verify sightings, and resolve incidents.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sightings' && (
              <div className="space-y-4">
                {recentSightings.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No recent sightings</p>
                ) : (
                  recentSightings.map((sighting) => (
                    <div key={sighting.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {sighting.species?.commonName}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {sighting.count} individuals • {sighting.location}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Observed by: {sighting.observer?.firstName} {sighting.observer?.lastName}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            sighting.verified
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {sighting.verified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'incidents' && (
              <div className="space-y-4">
                {recentIncidents.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No recent incidents</p>
                ) : (
                  recentIncidents.map((incident) => (
                    <div key={incident.id} className="bg-gray-50 p-4 rounded-lg border-l-4 border-red-500">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {incident.incidentType}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {incident.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Reported by: {incident.reporter?.firstName} {incident.reporter?.lastName}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              incident.severity === 'Critical'
                                ? 'bg-red-100 text-red-800'
                                : incident.severity === 'High'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {incident.severity}
                          </span>
                          <p className="text-xs text-gray-600 mt-2">{incident.status}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
              <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Manage Users</p>
            </button>
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
              <Layers className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Manage Species</p>
            </button>
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
              <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">View Reports</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
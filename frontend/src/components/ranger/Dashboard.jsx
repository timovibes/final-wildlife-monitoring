import React, { useState, useEffect } from 'react';
import { Eye, AlertTriangle, Plus, List, Map } from 'lucide-react';
import Navbar from '../shared/Navbar';
import authService from '../../services/auth';
import api from '../../services/api';

const RangerDashboard = () => {
  const user = authService.getCurrentUser();
  const [mySightings, setMySightings] = useState([]);
  const [myIncidents, setMyIncidents] = useState([]);
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [showSightingForm, setShowSightingForm] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  
  const [sightingForm, setSightingForm] = useState({
    speciesId: '',
    count: 1,
    latitude: '',
    longitude: '',
    location: '',
    behavior: '',
    notes: ''
  });

  const [incidentForm, setIncidentForm] = useState({
    incidentType: 'Poaching',
    severity: 'Medium',
    description: '',
    latitude: '',
    longitude: '',
    location: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sightingsRes, incidentsRes, speciesRes] = await Promise.all([
        api.get(`/sightings?observerId=${user.id}`),
        api.get(`/incidents?reportedById=${user.id}`),
        api.get('/species')
      ]);

      if (sightingsRes.data.success) {
        setMySightings(sightingsRes.data.data.sightings);
      }
      if (incidentsRes.data.success) {
        setMyIncidents(incidentsRes.data.data.incidents);
      }
      if (speciesRes.data.success) {
        setSpecies(speciesRes.data.data.species);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSightingSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/sightings', sightingForm);
      if (response.data.success) {
        alert('Sighting recorded successfully!');
        setShowSightingForm(false);
        setSightingForm({
          speciesId: '',
          count: 1,
          latitude: '',
          longitude: '',
          location: '',
          behavior: '',
          notes: ''
        });
        fetchData();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to record sighting');
    }
  };

  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/incidents', incidentForm);
      if (response.data.success) {
        alert('Incident reported successfully!');
        setShowIncidentForm(false);
        setIncidentForm({
          incidentType: 'Poaching',
          severity: 'Medium',
          description: '',
          latitude: '',
          longitude: '',
          location: ''
        });
        fetchData();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to report incident');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {<Navbar user={user} />}
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Ranger Dashboard</h1>
          <p className="mt-2 text-gray-600">Record wildlife sightings and report incidents</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-600">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">My Sightings</p>
                <p className="text-2xl font-bold text-gray-900">{mySightings.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-600">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">My Incidents</p>
                <p className="text-2xl font-bold text-gray-900">{myIncidents.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-600">
                <List className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Species Tracked</p>
                <p className="text-2xl font-bold text-gray-900">{species.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setShowSightingForm(!showSightingForm)}
            className="bg-green-600 text-white p-6 rounded-lg shadow hover:bg-green-700 transition-colors flex items-center justify-center space-x-3"
          >
            <Plus className="h-6 w-6" />
            <span className="text-lg font-semibold">Record Sighting</span>
          </button>

          <button
            onClick={() => setShowIncidentForm(!showIncidentForm)}
            className="bg-red-600 text-white p-6 rounded-lg shadow hover:bg-red-700 transition-colors flex items-center justify-center space-x-3"
          >
            <AlertTriangle className="h-6 w-6" />
            <span className="text-lg font-semibold">Report Incident</span>
          </button>
        </div>

        {/* Sighting Form */}
        {showSightingForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Record Wildlife Sighting</h2>
            <form onSubmit={handleSightingSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Species</label>
                  <select
                    required
                    value={sightingForm.speciesId}
                    onChange={(e) => setSightingForm({ ...sightingForm, speciesId: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select species...</option>
                    {species.map((s) => (
                      <option key={s.id} value={s.id}>{s.commonName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Count</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={sightingForm.count}
                    onChange={(e) => setSightingForm({ ...sightingForm, count: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Latitude</label>
                  <input
                    type="number"
                    step="0.00000001"
                    required
                    value={sightingForm.latitude}
                    onChange={(e) => setSightingForm({ ...sightingForm, latitude: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="-1.2921"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Longitude</label>
                  <input
                    type="number"
                    step="0.00000001"
                    required
                    value={sightingForm.longitude}
                    onChange={(e) => setSightingForm({ ...sightingForm, longitude: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="36.8219"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Location Name</label>
                  <input
                    type="text"
                    value={sightingForm.location}
                    onChange={(e) => setSightingForm({ ...sightingForm, location: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Near Mbagathi River"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Behavior</label>
                  <input
                    type="text"
                    value={sightingForm.behavior}
                    onChange={(e) => setSightingForm({ ...sightingForm, behavior: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Grazing, Resting"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  rows="3"
                  value={sightingForm.notes}
                  onChange={(e) => setSightingForm({ ...sightingForm, notes: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Additional observations..."
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Submit Sighting
                </button>
                <button
                  type="button"
                  onClick={() => setShowSightingForm(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Incident Form */}
        {showIncidentForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Report Incident</h2>
            <form onSubmit={handleIncidentSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Incident Type</label>
                  <select
                    required
                    value={incidentForm.incidentType}
                    onChange={(e) => setIncidentForm({ ...incidentForm, incidentType: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="Poaching">Poaching</option>
                    <option value="Human-Wildlife Conflict">Human-Wildlife Conflict</option>
                    <option value="Injury">Injury</option>
                    <option value="Habitat Destruction">Habitat Destruction</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Severity</label>
                  <select
                    required
                    value={incidentForm.severity}
                    onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Latitude</label>
                  <input
                    type="number"
                    step="0.00000001"
                    required
                    value={incidentForm.latitude}
                    onChange={(e) => setIncidentForm({ ...incidentForm, latitude: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Longitude</label>
                  <input
                    type="number"
                    step="0.00000001"
                    required
                    value={incidentForm.longitude}
                    onChange={(e) => setIncidentForm({ ...incidentForm, longitude: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input
                    type="text"
                    value={incidentForm.location}
                    onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows="4"
                  required
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Describe the incident in detail..."
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Submit Incident
                </button>
                <button
                  type="button"
                  onClick={() => setShowIncidentForm(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">My Recent Activity</h2>
          <div className="space-y-4">
            {mySightings.slice(0, 5).map((sighting) => (
              <div key={sighting.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <div>
                    <h4 className="font-semibold">{sighting.species?.commonName}</h4>
                    <p className="text-sm text-gray-600">
                      {sighting.count} individuals • {sighting.location}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(sighting.sightingDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full h-fit ${
                      sighting.verified
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {sighting.verified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
            {mySightings.length === 0 && (
              <p className="text-center text-gray-500 py-4">No sightings recorded yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RangerDashboard;
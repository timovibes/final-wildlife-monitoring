import React, { useState, useEffect } from 'react';
import { Eye, AlertTriangle, Plus, List, Map } from 'lucide-react';
import Navbar from '../shared/Navbar';
import authService from '../../services/auth';
import api from '../../services/api';

const inputClass =
  'mt-1 block w-full px-3 py-2 bg-bush border border-bush-line text-bone text-sm focus:outline-none focus:border-ochre placeholder:text-bone/30';
const labelClass = 'block font-mono text-[10px] uppercase tracking-widest text-bone/50';

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
      <div className="min-h-screen bg-bush text-bone font-body">
        {<Navbar user={user} />}
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-bush-line border-t-ochre mx-auto"></div>
            <p className="mt-4 font-mono text-xs uppercase tracking-widest text-bone/50">Loading...</p>
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
          <h1 className="font-display text-3xl font-semibold">Ranger Dashboard</h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-bone/50">
            Record wildlife sightings and report incidents
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="border border-bush-line bg-bush-surface p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-bone/50">My Sightings</p>
              <Eye className="h-4 w-4 text-ochre" />
            </div>
            <p className="font-display text-3xl font-semibold">{mySightings.length}</p>
          </div>

          <div className="border border-bush-line bg-bush-surface p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-bone/50">My Incidents</p>
              <AlertTriangle className="h-4 w-4 text-rust" />
            </div>
            <p className="font-display text-3xl font-semibold">{myIncidents.length}</p>
          </div>

          <div className="border border-bush-line bg-bush-surface p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-bone/50">Species Tracked</p>
              <List className="h-4 w-4 text-teal" />
            </div>
            <p className="font-display text-3xl font-semibold">{species.length}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setShowSightingForm(!showSightingForm)}
            className="bg-ochre text-bush p-6 hover:bg-[#dda054] transition-colors flex items-center justify-center gap-3"
          >
            <Plus className="h-5 w-5" />
            <span className="font-mono text-sm uppercase tracking-widest font-semibold">Record Sighting</span>
          </button>

          <button
            onClick={() => setShowIncidentForm(!showIncidentForm)}
            className="border border-rust text-rust p-6 hover:bg-rust hover:text-bush transition-colors flex items-center justify-center gap-3"
          >
            <AlertTriangle className="h-5 w-5" />
            <span className="font-mono text-sm uppercase tracking-widest font-semibold">Report Incident</span>
          </button>
        </div>

        {/* Sighting Form */}
        {showSightingForm && (
          <div className="border border-bush-line bg-bush-surface p-6 mb-8">
            <h2 className="font-display text-lg font-semibold mb-4">Record Wildlife Sighting</h2>
            <form onSubmit={handleSightingSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Species</label>
                  <select
                    required
                    value={sightingForm.speciesId}
                    onChange={(e) => setSightingForm({ ...sightingForm, speciesId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select species...</option>
                    {species.map((s) => (
                      <option key={s.id} value={s.id}>{s.commonName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Count</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={sightingForm.count}
                    onChange={(e) => setSightingForm({ ...sightingForm, count: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Latitude</label>
                  <input
                    type="number"
                    step="0.00000001"
                    required
                    value={sightingForm.latitude}
                    onChange={(e) => setSightingForm({ ...sightingForm, latitude: e.target.value })}
                    className={`${inputClass} font-mono`}
                    placeholder="-1.2921"
                  />
                </div>

                <div>
                  <label className={labelClass}>Longitude</label>
                  <input
                    type="number"
                    step="0.00000001"
                    required
                    value={sightingForm.longitude}
                    onChange={(e) => setSightingForm({ ...sightingForm, longitude: e.target.value })}
                    className={`${inputClass} font-mono`}
                    placeholder="36.8219"
                  />
                </div>

                <div>
                  <label className={labelClass}>Location Name</label>
                  <input
                    type="text"
                    value={sightingForm.location}
                    onChange={(e) => setSightingForm({ ...sightingForm, location: e.target.value })}
                    className={inputClass}
                    placeholder="e.g., Near Mbagathi River"
                  />
                </div>

                <div>
                  <label className={labelClass}>Behavior</label>
                  <input
                    type="text"
                    value={sightingForm.behavior}
                    onChange={(e) => setSightingForm({ ...sightingForm, behavior: e.target.value })}
                    className={inputClass}
                    placeholder="e.g., Grazing, Resting"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-ochre text-bush font-mono text-xs uppercase tracking-widest hover:bg-[#dda054] transition-colors"
                >
                  Submit Sighting
                </button>
                <button
                  type="button"
                  onClick={() => setShowSightingForm(false)}
                  className="px-6 py-2 border border-bush-line text-bone/60 font-mono text-xs uppercase tracking-widest hover:text-bone hover:border-bone/40 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Incident Form */}
        {showIncidentForm && (
          <div className="border border-bush-line bg-bush-surface p-6 mb-8">
            <h2 className="font-display text-lg font-semibold mb-4">Report Incident</h2>
            <form onSubmit={handleIncidentSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Incident Type</label>
                  <select
                    required
                    value={incidentForm.incidentType}
                    onChange={(e) => setIncidentForm({ ...incidentForm, incidentType: e.target.value })}
                    className={inputClass}
                  >
                    <option value="Poaching">Poaching</option>
                    <option value="Human-Wildlife Conflict">Human-Wildlife Conflict</option>
                    <option value="Injury">Injury</option>
                    <option value="Habitat Destruction">Habitat Destruction</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Severity</label>
                  <select
                    required
                    value={incidentForm.severity}
                    onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
                    className={inputClass}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Latitude</label>
                  <input
                    type="number"
                    step="0.00000001"
                    required
                    value={incidentForm.latitude}
                    onChange={(e) => setIncidentForm({ ...incidentForm, latitude: e.target.value })}
                    className={`${inputClass} font-mono`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Longitude</label>
                  <input
                    type="number"
                    step="0.00000001"
                    required
                    value={incidentForm.longitude}
                    onChange={(e) => setIncidentForm({ ...incidentForm, longitude: e.target.value })}
                    className={`${inputClass} font-mono`}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Location</label>
                  <input
                    type="text"
                    value={incidentForm.location}
                    onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  rows="4"
                  required
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  className={inputClass}
                  placeholder="Describe the incident in detail..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-2 border border-rust text-rust font-mono text-xs uppercase tracking-widest hover:bg-rust hover:text-bush transition-colors"
                >
                  Submit Incident
                </button>
                <button
                  type="button"
                  onClick={() => setShowIncidentForm(false)}
                  className="px-6 py-2 border border-bush-line text-bone/60 font-mono text-xs uppercase tracking-widest hover:text-bone hover:border-bone/40 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Recent Activity */}
        <div className="border border-bush-line bg-bush-surface p-6">
          <h2 className="font-display text-lg font-semibold mb-4">My Recent Activity</h2>
          <div className="border border-bush-line">
            {mySightings.slice(0, 5).map((sighting) => (
              <div key={sighting.id} className="field-tag">
                <span
                  className={`status-dot ${sighting.verified ? 'status-dot-online' : 'status-dot-pending'}`}
                ></span>
                <div className="flex-1 flex justify-between">
                  <div>
                    <h4 className="font-display font-semibold text-sm">{sighting.species?.commonName}</h4>
                    <p className="font-mono text-[11px] text-bone/50 mt-1">
                      {sighting.count} individuals &middot; {sighting.location}
                    </p>
                    <p className="text-xs text-bone/40 mt-1">
                      {new Date(sighting.sightingDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 border h-fit ${
                      sighting.verified ? 'border-teal text-teal' : 'border-ochre-dim text-ochre'
                    }`}
                  >
                    {sighting.verified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
            {mySightings.length === 0 && (
              <p className="text-center font-mono text-xs uppercase tracking-widest text-bone/40 py-4">
                No sightings recorded yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RangerDashboard;
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Layers, Eye, AlertTriangle,
  Radio, Zap, ShieldAlert, Users, Battery, Clock, Gauge,
  ChevronDown, ChevronUp
} from 'lucide-react';
import Navbar from '../shared/Navbar';
import authService from '../../services/auth';
import api from '../../services/api';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertOctagon } from 'lucide-react';

const ResearcherDashboard = () => {
  const user = authService.getCurrentUser();

  // ── Existing state ──────────────────────────────────────────────────────────
  const [stats, setStats]                       = useState(null);
  const [speciesDistribution, setSpeciesDistribution] = useState([]);
  const [incidentTrends, setIncidentTrends]     = useState([]);
  const [sightings, setSightings]               = useState([]);
  const [loading, setLoading]                   = useState(true);

  // ── New state ───────────────────────────────────────────────────────────────
  const [monthlyTrends, setMonthlyTrends]         = useState([]);   // sightings over time
  const [topSpecies, setTopSpecies]               = useState([]);   // top 5 most sighted
  const [conservationStatus, setConservationStatus] = useState([]); // status breakdown
  const [sensorSummary, setSensorSummary]         = useState([]);   // IoT table
  const [endangeredList, setEndangeredList]       = useState([]);   // endangered species

  // ── Risk score state ────────────────────────────────────────────────────────
  const [riskScores, setRiskScores]         = useState([]);
  const [riskScoreError, setRiskScoreError] = useState(null);

  // ── Recent Sightings progressive loading (issue #6) ─────────────────────────
  const [visibleSightingsCount, setVisibleSightingsCount] = useState(10);

  // Field-ops palette for charts (recharts needs literal hex, not Tailwind classes)
  const COLORS     = ['#C98A3E', '#4A7C7C', '#8C6229', '#6B8E8E', '#A8AE9C'];

  // Species.conservationStatus is stored as short IUCN codes (LC, NT, VU, EN,
  // CR, EW, EX) — these keys must match those codes, not full English words.
  const STATUS_LABELS = {
    LC: 'Least Concern', NT: 'Near Threatened', VU: 'Vulnerable',
    EN: 'Endangered', CR: 'Critically Endangered', EW: 'Extinct in Wild', EX: 'Extinct',
  };
  const CON_COLORS = {
    CR: '#B5432F', // rust — reserved for the most severe status
    EW: '#B5432F',
    EX: '#3A4433',
    EN: '#C98A3E', // ochre
    VU: '#8C6229',
    NT: '#6B8E8E',
    LC: '#4A7C7C', // teal
  };

  // ── Sighting hotspot state ───────────────────────────────────────────────────
  const [hotspots, setHotspots] = useState([]);
  const [hotspotNoiseCount, setHotspotNoiseCount] = useState(0);
  const [hotspotError, setHotspotError] = useState(null);

  // Nairobi National Park center — same coordinates used in the admin IoT map,
  // kept here too since this panel needs its own map instance.
  const NNP_CENTER = [-1.3700, 36.8500];
  const NNP_ZOOM = 13;

  // ── Anomaly detection state ──────────────────────────────────────────────────
  const [anomalyWeeks, setAnomalyWeeks] = useState([]);
  const [anomalyMessage, setAnomalyMessage] = useState(null);
  const [anomalyError, setAnomalyError] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [
        dashboardRes,
        speciesDistRes,
        incidentTrendsRes,
        sightingsRes,
        sightingTrendsRes,
        endangeredRes,
        iotActivityRes,
      ] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/reports/species-distribution'),
        api.get('/reports/incident-trends'),
        api.get('/sightings'), // limit was never implemented server-side — fetches all, we paginate client-side now
        api.get('/reports/sighting-trends'),
        api.get('/reports/endangered-species'),
        api.get('/reports/iot-activity'),
      ]);

      // ── Existing ────────────────────────────────────────────────────────────
      if (dashboardRes.data.success)
        setStats(dashboardRes.data.data.summary);

      if (speciesDistRes.data.success) {
        setSpeciesDistribution(
          speciesDistRes.data.data.byCategory.map(item => ({
            name: item.category,
            value: parseInt(item.count),
          }))
        );
        // Conservation status for the new pie chart
        setConservationStatus(
          (speciesDistRes.data.data.byConservationStatus || []).map(item => ({
            name:  item.conservationStatus || 'Unknown',
            value: parseInt(item.count),
          }))
        );
      }

      if (incidentTrendsRes.data.success)
        setIncidentTrends(
          incidentTrendsRes.data.data.byType.map(item => ({
            name:  item.incidentType,
            count: parseInt(item.count),
          }))
        );

      if (sightingsRes.data.success)
        setSightings(sightingsRes.data.data.sightings);

      // ── New ─────────────────────────────────────────────────────────────────
      if (sightingTrendsRes.data.success) {
        const { monthlyTrends: mt, topSpecies: ts } = sightingTrendsRes.data.data;

        setMonthlyTrends(
          [...(mt || [])].reverse().map(item => ({
            month:        new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            sightings:    parseInt(item.count),
            totalAnimals: parseInt(item.totalAnimals),
          }))
        );

        setTopSpecies(
          (ts || []).slice(0, 5).map(item => ({
            name:         item.commonName,
            sightings:    parseInt(item.sightingCount),
            totalAnimals: parseInt(item.totalAnimals),
          }))
        );
      }

      if (endangeredRes.data.success)
        setEndangeredList(endangeredRes.data.data.species || []);

      if (iotActivityRes.data.success)
        setSensorSummary(iotActivityRes.data.data.sensorSummary || []);

    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }

    // ── Risk score (separate try/catch so a down ML service doesn't break the rest of the dashboard) ──
    try {
      const riskRes = await api.get('/ml/risk-score');
      if (riskRes.data.success) {
        setRiskScores(riskRes.data.data.scores);
        setRiskScoreError(null);
      }
    } catch (err) {
      console.error('Risk score fetch failed:', err);
      setRiskScoreError(err.response?.data?.message || 'ML scoring service unavailable.');
    }

    // ── Sighting hotspots (separate try/catch, same reasoning as risk score) ──
    try {
      const hotspotRes = await api.get('/ml/hotspots');
      if (hotspotRes.data.success) {
        setHotspots(hotspotRes.data.data.clusters);
        setHotspotNoiseCount(hotspotRes.data.data.noiseCount);
        setHotspotError(null);
      }
    } catch (err) {
      console.error('Hotspot fetch failed:', err);
      setHotspotError(err.response?.data?.message || 'ML scoring service unavailable.');
    }

    // ── Anomaly detection (separate try/catch, same reasoning as the others) ──
    try {
      const anomalyRes = await api.get('/ml/anomalies');
      if (anomalyRes.data.success) {
        setAnomalyWeeks(anomalyRes.data.data.weeks || []);
        setAnomalyMessage(anomalyRes.data.data.message || null);
        setAnomalyError(null);
      }
    } catch (err) {
      console.error('Anomaly detection fetch failed:', err);
      setAnomalyError(err.response?.data?.message || 'ML scoring service unavailable.');
    }
  };

  // ── Battery colour helper ───────────────────────────────────────────────────
  const batteryColor = (level) => {
    if (level >= 60) return 'text-teal';
    if (level >= 30) return 'text-ochre';
    return 'text-rust';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bush text-bone font-body">
        <Navbar user={user} />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-bush-line border-t-ochre mx-auto"></div>
            <p className="mt-4 font-mono text-xs uppercase tracking-widest text-bone/50">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bush text-bone font-body">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold">Researcher Dashboard</h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-bone/50">
            Analytics and biodiversity insights
          </p>
        </div>

        {/* ── Statistics Grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Layers,        label: 'Species',    value: stats?.totalSpecies,      accent: 'text-ochre' },
            { icon: Eye,           label: 'Sightings',  value: stats?.totalSightings,    accent: 'text-teal'  },
            { icon: AlertTriangle, label: 'Incidents',  value: stats?.totalIncidents,    accent: 'text-rust'  },
            { icon: TrendingUp,    label: 'Endangered', value: stats?.endangeredSpecies, accent: 'text-ochre' },
          ].map(({ icon: Icon, label, value, accent }) => (
            <div key={label} className="border border-bush-line bg-bush-surface p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-bone/50">{label}</p>
                <Icon className={`h-4 w-4 ${accent}`} />
              </div>
              <p className="font-display text-3xl font-semibold">{value || 0}</p>
            </div>
          ))}
        </div>

        {/* ── Existing Charts ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Species Distribution */}
          <div className="border border-bush-line bg-bush-surface p-6">
            <h2 className="font-display text-base font-semibold mb-4">Species Distribution by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={speciesDistribution}
                  cx="50%" cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {speciesDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#242D1F', border: '1px solid #3A4433', color: '#EDE6D3', fontFamily: 'IBM Plex Mono' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Incidents by Type */}
          <div className="border border-bush-line bg-bush-surface p-6">
            <h2 className="font-display text-base font-semibold mb-4">Incidents by Type</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={incidentTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3A4433" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#A8AE9C" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                <YAxis stroke="#A8AE9C" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                <Tooltip contentStyle={{ background: '#242D1F', border: '1px solid #3A4433', color: '#EDE6D3', fontFamily: 'IBM Plex Mono' }} />
                <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }} />
                <Bar dataKey="count" fill="#B5432F" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Sightings Over Time ──────────────────────────────────────────── */}
        <div className="border border-bush-line bg-bush-surface p-6 mb-8">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-4 w-4 text-teal mr-2" />
            <h2 className="font-display text-base font-semibold">Sightings Over Time</h2>
            <span className="ml-2 font-mono text-[11px] text-bone/40">(last 12 months)</span>
          </div>
          {monthlyTrends.length === 0 ? (
            <p className="text-center font-mono text-xs uppercase tracking-widest text-bone/40 py-12">No trend data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3A4433" />
                <XAxis dataKey="month" stroke="#A8AE9C" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                <YAxis yAxisId="left" stroke="#A8AE9C" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#A8AE9C" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                <Tooltip contentStyle={{ background: '#242D1F', border: '1px solid #3A4433', color: '#EDE6D3', fontFamily: 'IBM Plex Mono' }} />
                <Legend wrapperStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="sightings"
                  stroke="#4A7C7C"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Sightings"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="totalAnimals"
                  stroke="#C98A3E"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                  name="Total Animals"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Top 5 Species + Conservation Status ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Top 5 Most Sighted Species */}
          <div className="border border-bush-line bg-bush-surface p-6">
            <div className="flex items-center mb-4">
              <Eye className="h-4 w-4 text-teal mr-2" />
              <h2 className="font-display text-base font-semibold">Top 5 Most Sighted Species</h2>
            </div>
            {topSpecies.length === 0 ? (
              <p className="text-center font-mono text-xs uppercase tracking-widest text-bone/40 py-12">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topSpecies} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#3A4433" />
                  <XAxis type="number" stroke="#A8AE9C" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fill: '#A8AE9C' }} />
                  <Tooltip contentStyle={{ background: '#242D1F', border: '1px solid #3A4433', color: '#EDE6D3', fontFamily: 'IBM Plex Mono' }} />
                  <Bar dataKey="sightings" fill="#4A7C7C" name="Sightings" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Conservation Status Breakdown */}
          <div className="border border-bush-line bg-bush-surface p-6">
            <div className="flex items-center mb-4">
              <ShieldAlert className="h-4 w-4 text-rust mr-2" />
              <h2 className="font-display text-base font-semibold">Conservation Status</h2>
            </div>
            {conservationStatus.length === 0 ? (
              <p className="text-center font-mono text-xs uppercase tracking-widest text-bone/40 py-12">No data available</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={conservationStatus}
                      cx="50%" cy="50%"
                      outerRadius={75}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {conservationStatus.map((entry, index) => (
                        <Cell
                          key={`cs-${index}`}
                          fill={CON_COLORS[entry.name] || COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#242D1F', border: '1px solid #3A4433', color: '#EDE6D3', fontFamily: 'IBM Plex Mono' }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="mt-2 space-y-1.5 border-t border-bush-line pt-3">
                  {conservationStatus.map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between font-mono text-xs">
                      <div className="flex items-center">
                        <span
                          className="inline-block w-2.5 h-2.5 mr-2"
                          style={{ backgroundColor: CON_COLORS[entry.name] || COLORS[index % COLORS.length] }}
                        />
                        <span className="text-bone/60">{STATUS_LABELS[entry.name] || entry.name}</span>
                      </div>
                      <span className="font-semibold text-bone">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── IoT Sensor Activity ───────────────────────────────────────────── */}
        <div className="border border-bush-line bg-bush-surface p-6 mb-8">
          <div className="flex items-center mb-4">
            <Radio className="h-4 w-4 text-ochre mr-2" />
            <h2 className="font-display text-base font-semibold">IoT Sensor Activity</h2>
            <span className="ml-2 font-mono text-[11px] text-bone/40">({sensorSummary.length} sensors)</span>
          </div>
          <div className="overflow-x-auto border border-bush-line">
            <table className="min-w-full divide-y divide-bush-line text-sm">
              <thead className="bg-bush">
                <tr>
                  {['Sensor ID', 'Type', 'Data Points', 'Avg Battery', 'Last Reading'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-[10px] font-medium text-bone/50 uppercase tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-bush-line">
                {sensorSummary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center font-mono text-xs uppercase tracking-widest text-bone/40">
                      No sensor data available
                    </td>
                  </tr>
                ) : (
                  sensorSummary.map((sensor) => {
                    const battery = Math.round(sensor.avgBattery);
                    const lastSeen = new Date(sensor.lastReading);
                    const minutesAgo = Math.round((Date.now() - lastSeen) / 60000);
                    return (
                      <tr key={sensor.sensorId} className="hover:bg-bush transition-colors">
                        <td className="px-4 py-3 font-mono font-medium">
                          {sensor.sensorId}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest border border-ochre-dim text-ochre">
                            {sensor.deviceType}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-bone/70">
                          <div className="flex items-center">
                            <Zap className="h-3.5 w-3.5 text-bone/30 mr-1" />
                            {parseInt(sensor.dataPoints).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`flex items-center font-mono font-medium ${batteryColor(battery)}`}>
                            <Battery className="h-3.5 w-3.5 mr-1" />
                            {battery}%
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-bone/50">
                          <div className="flex items-center">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            {minutesAgo < 60
                              ? `${minutesAgo}m ago`
                              : minutesAgo < 1440
                              ? `${Math.round(minutesAgo / 60)}h ago`
                              : lastSeen.toLocaleDateString()}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Conservation Risk Score ──────────────────────────────────────── */}
        <div className="border border-bush-line bg-bush-surface p-6 mb-8">
          <div className="flex items-center mb-4">
            <Gauge className="h-4 w-4 text-rust mr-2" />
            <h2 className="font-display text-base font-semibold">Conservation Risk Score</h2>
            <span className="ml-2 font-mono text-[11px] text-bone/40">ML-computed, updates on refresh</span>
          </div>

          {riskScoreError ? (
            <p className="text-center font-mono text-xs uppercase tracking-widest text-rust py-8">{riskScoreError}</p>
          ) : riskScores.length === 0 ? (
            <p className="text-center font-mono text-xs uppercase tracking-widest text-bone/40 py-8">No risk data available</p>
          ) : (
            <div className="overflow-x-auto border border-bush-line">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-bush-line bg-bush">
                    {['Species', 'Status', 'Risk Score', 'Risk Level', 'Trend'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-mono text-[10px] font-medium text-bone/50 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-bush-line">
                  {riskScores.slice(0, 10).map((s) => (
                    <tr key={s.speciesId} className="hover:bg-bush transition-colors">
                      <td className="px-4 py-3 font-medium">{s.commonName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-bone/60">{s.conservationStatus}</td>
                      <td className="px-4 py-3 font-mono font-bold">{s.riskScore}</td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 border ${
                          s.riskLevel === 'Critical' ? 'border-rust text-rust' :
                          s.riskLevel === 'High' ? 'border-ochre text-ochre' :
                          s.riskLevel === 'Medium' ? 'border-ochre-dim text-ochre' :
                          'border-teal text-teal'
                        }`}>
                          {s.riskLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-bone/50">
                        {s.breakdown.sightingTrendSlope == null ? 'Insufficient data' :
                          s.breakdown.sightingTrendSlope < 0 ? 'Declining' :
                          s.breakdown.sightingTrendSlope > 0 ? 'Rising' : 'Flat'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SIGHTING HOTSPOTS (ML — DBSCAN clustering)

            Groups sightings that happened close together in space into "hotspot"
            zones, rather than showing every individual sighting as an unreadable
            scatter of pins. Circle size = how many sightings are in that hotspot.
            This is unsupervised clustering (DBSCAN), not a prediction — it's
            describing where activity is actually concentrated right now, which
            is useful for planning where to focus patrols or research effort.
          ═══════════════════════════════════════════════════════════════════════ */}
        <div className="border border-bush-line bg-bush-surface p-6 mb-8">
          <div className="flex items-center mb-4">
            <Radio className="h-4 w-4 text-teal mr-2" />
            <h2 className="font-display text-base font-semibold">Sighting Hotspots</h2>
            <span className="ml-2 font-mono text-[11px] text-bone/40">
              ML-clustered (DBSCAN){hotspotNoiseCount > 0 ? ` · ${hotspotNoiseCount} isolated sightings excluded` : ''}
            </span>
          </div>

          {hotspotError ? (
            <p className="text-center font-mono text-xs uppercase tracking-widest text-rust py-8">{hotspotError}</p>
          ) : hotspots.length === 0 ? (
            <p className="text-center font-mono text-xs uppercase tracking-widest text-bone/40 py-8">
              No hotspots detected yet — need more clustered sighting data
            </p>
          ) : (
            <div className="h-[420px] w-full overflow-hidden border border-bush-line">
              <MapContainer center={NNP_CENTER} zoom={NNP_ZOOM} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {hotspots.map((cluster) => (
                  <Circle
                    key={cluster.clusterId}
                    center={[cluster.centerLat, cluster.centerLng]}
                    radius={cluster.radiusMeters}
                    pathOptions={{
                      // Bigger hotspots get a more intense ochre; small ones stay teal
                      color: cluster.pointCount >= 10 ? '#B5432F' : cluster.pointCount >= 5 ? '#C98A3E' : '#4A7C7C',
                      fillColor: cluster.pointCount >= 10 ? '#B5432F' : cluster.pointCount >= 5 ? '#C98A3E' : '#4A7C7C',
                      fillOpacity: 0.25,
                      weight: 1.5,
                    }}
                  >
                    <Popup>
                      <div className="font-mono text-xs space-y-1 min-w-[160px]">
                        <p className="font-bold text-bush">{cluster.pointCount} sightings</p>
                        <hr />
                        {cluster.topSpecies.map((sp) => (
                          <p key={sp.name}>{sp.name}: {sp.count}</p>
                        ))}
                      </div>
                    </Popup>
                  </Circle>
                ))}
              </MapContainer>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            INCIDENT ANOMALY DETECTION (ML — Isolation Forest)

            Flags weeks where incident activity (count and/or severity) looks
            statistically unusual compared to the rest of the recent history.
            This is unsupervised anomaly detection, not a threshold rule — the
            model isn't told "more than N incidents = anomaly," it learns what
            "normal" looks like from the data itself and flags what stands out.
           ═══════════════════════════════════════════════════════════════════════ */}
        <div className="border border-bush-line bg-bush-surface p-6 mb-8">
          <div className="flex items-center mb-4">
            <AlertOctagon className="h-4 w-4 text-rust mr-2" />
            <h2 className="font-display text-base font-semibold">Incident Anomaly Detection</h2>
            <span className="ml-2 font-mono text-[11px] text-bone/40">ML (Isolation Forest) · last 16 weeks</span>
          </div>

          {anomalyError ? (
            <p className="text-center font-mono text-xs uppercase tracking-widest text-rust py-8">{anomalyError}</p>
          ) : anomalyMessage ? (
            <p className="text-center font-mono text-xs uppercase tracking-widest text-bone/40 py-8">{anomalyMessage}</p>
          ) : anomalyWeeks.length === 0 ? (
            <p className="text-center font-mono text-xs uppercase tracking-widest text-bone/40 py-8">No incident data available</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={anomalyWeeks}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3A4433" />
                  <XAxis dataKey="weekLabel" stroke="#A8AE9C" tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} />
                  <YAxis stroke="#A8AE9C" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                  <Tooltip
                    contentStyle={{ background: '#242D1F', border: '1px solid #3A4433', color: '#EDE6D3', fontFamily: 'IBM Plex Mono' }}
                    formatter={(value, name, props) => [
                      `${value} incidents${props.payload.isAnomaly ? ' — flagged anomalous' : ''}`,
                      'Count',
                    ]}
                  />
                  <Bar dataKey="count">
                    {anomalyWeeks.map((w, i) => (
                      <Cell key={i} fill={w.isAnomaly ? '#B5432F' : '#4A7C7C'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-3 font-mono text-[11px] text-bone/40">
                <span className="inline-block w-2 h-2 bg-rust mr-1.5" /> Flagged anomalous
                <span className="inline-block w-2 h-2 bg-teal ml-4 mr-1.5" /> Normal range
              </p>
            </>
          )}
        </div>

        {/* ── Endangered Species List ────────────────────────────────────────── */}
        <div className="border border-bush-line bg-bush-surface p-6 mb-8">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-4 w-4 text-rust mr-2" />
            <h2 className="font-display text-base font-semibold">Endangered Species Monitor</h2>
            <span className="ml-2 font-mono text-[11px] text-bone/40">({endangeredList.length} species)</span>
          </div>
          <div className="overflow-x-auto border border-bush-line">
            <table className="min-w-full divide-y divide-bush-line text-sm">
              <thead className="bg-bush">
                <tr>
                  {['Common Name', 'Scientific Name', 'Category', 'Status', 'Population', 'Sightings'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-[10px] font-medium text-bone/50 uppercase tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-bush-line">
                {endangeredList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center font-mono text-xs uppercase tracking-widest text-bone/40">
                      No endangered species data available
                    </td>
                  </tr>
                ) : (
                  endangeredList.map((sp) => (
                    <tr key={sp.id} className="hover:bg-bush transition-colors">
                      <td className="px-4 py-3 font-medium">{sp.commonName}</td>
                      <td className="px-4 py-3 italic font-mono text-bone/50">{sp.scientificName}</td>
                      <td className="px-4 py-3 text-bone/70">{sp.category}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest border"
                          style={{
                            borderColor: CON_COLORS[sp.conservationStatus] || '#3A4433',
                            color: CON_COLORS[sp.conservationStatus] || '#A8AE9C',
                          }}
                        >
                          {STATUS_LABELS[sp.conservationStatus] || sp.conservationStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-bone/70">
                        {sp.population != null ? sp.population.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-bone/70">
                        {sp.recentSightings || 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Recent Sightings Table ────────────────────────────────────────── */}
        <div className="border border-bush-line bg-bush-surface p-6">
          <h2 className="font-display text-base font-semibold mb-4">Recent Sightings</h2>
          <div className="overflow-x-auto border border-bush-line">
            <table className="min-w-full divide-y divide-bush-line">
              <thead className="bg-bush">
                <tr>
                  {['Species', 'Count', 'Location', 'Observer', 'Date', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-[10px] font-medium text-bone/50 uppercase tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-bush-line">
                {sightings.slice(0, visibleSightingsCount).map((sighting) => (
                  <tr key={sighting.id} className="hover:bg-bush transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium">{sighting.species?.commonName}</div>
                      <div className="font-mono text-[11px] italic text-bone/40">{sighting.species?.scientificName}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{sighting.count}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-bone/50">{sighting.location || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-bone/60">
                      {sighting.observer?.firstName} {sighting.observer?.lastName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-bone/50">
                      {new Date(sighting.sightingDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 font-mono text-[10px] uppercase tracking-widest border ${
                        sighting.verified ? 'border-teal text-teal' : 'border-ochre-dim text-ochre'
                      }`}>
                        {sighting.verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sightings.length === 0 && (
            <p className="text-center font-mono text-xs uppercase tracking-widest text-bone/40 py-8">No sightings data available</p>
          )}

          {sightings.length > 10 && (
            <div className="flex justify-center mt-4 pt-4 border-t border-bush-line">
              {visibleSightingsCount < sightings.length ? (
                <button
                  onClick={() => setVisibleSightingsCount(prev => Math.min(prev + 10, sightings.length))}
                  className="flex items-center gap-2 px-4 py-2 border border-bush-line text-bone/60 font-mono text-[11px] uppercase tracking-widest hover:text-bone hover:border-ochre-dim transition-colors"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  Show More ({sightings.length - visibleSightingsCount} remaining)
                </button>
              ) : (
                <button
                  onClick={() => setVisibleSightingsCount(10)}
                  className="flex items-center gap-2 px-4 py-2 border border-bush-line text-bone/60 font-mono text-[11px] uppercase tracking-widest hover:text-bone hover:border-ochre-dim transition-colors"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  Show Less
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Info Banner ───────────────────────────────────────────────────── */}
        <div className="mt-8 border border-teal bg-bush p-4">
          <div className="flex gap-3">
            <TrendingUp className="h-4 w-4 text-teal flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-teal">Research Access</h3>
              <p className="mt-2 text-sm text-bone/70">
                As a researcher, you have read-only access to all wildlife data. Use the analytics to identify trends,
                monitor biodiversity health, and support conservation planning.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ResearcherDashboard;
// import React, { useState, useEffect } from 'react';
// import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// import { TrendingUp, Layers, Eye, AlertTriangle } from 'lucide-react';
// import Navbar from '../shared/Navbar';
// import authService from '../../services/auth';
// import api from '../../services/api';

// const ResearcherDashboard = () => {
//   const user = authService.getCurrentUser();
//   const [stats, setStats] = useState(null);
//   const [speciesDistribution, setSpeciesDistribution] = useState([]);
//   const [incidentTrends, setIncidentTrends] = useState([]);
//   const [sightings, setSightings] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

//   useEffect(() => {
//     fetchData();
//   }, []);

//   const fetchData = async () => {
//     try {
//       const [dashboardRes, speciesDistRes, incidentTrendsRes, sightingsRes] = await Promise.all([
//         api.get('/reports/dashboard'),
//         api.get('/reports/species-distribution'),
//         api.get('/reports/incident-trends'),
//         api.get('/sightings?limit=10')
//       ]);

//       if (dashboardRes.data.success) {
//         setStats(dashboardRes.data.data.summary);
//       }
      
//       if (speciesDistRes.data.success) {
//         setSpeciesDistribution(
//           speciesDistRes.data.data.byCategory.map(item => ({
//             name: item.category,
//             value: parseInt(item.count)
//           }))
//         );
//       }

//       if (incidentTrendsRes.data.success) {
//         setIncidentTrends(
//           incidentTrendsRes.data.data.byType.map(item => ({
//             name: item.incidentType,
//             count: parseInt(item.count)
//           }))
//         );
//       }

//       if (sightingsRes.data.success) {
//         setSightings(sightingsRes.data.data.sightings);
//       }
//     } catch (error) {
//       console.error('Failed to fetch data:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50">
//         {<Navbar user={user} />}
//         <div className="flex items-center justify-center h-screen">
//           <div className="text-center">
//             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
//             <p className="mt-4 text-gray-600">Loading analytics...</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {<Navbar user={user} />}
      
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="mb-8">
//           <h1 className="text-3xl font-bold text-gray-900">Researcher Dashboard</h1>
//           <p className="mt-2 text-gray-600">Analytics and biodiversity insights</p>
//         </div>

//         {/* Statistics Grid */}
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
//           <div className="bg-white rounded-lg shadow p-6">
//             <div className="flex items-center">
//               <div className="p-3 rounded-full bg-blue-600">
//                 <Layers className="h-6 w-6 text-white" />
//               </div>
//               <div className="ml-4">
//                 <p className="text-sm font-medium text-gray-600">Species</p>
//                 <p className="text-2xl font-bold text-gray-900">{stats?.totalSpecies || 0}</p>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-lg shadow p-6">
//             <div className="flex items-center">
//               <div className="p-3 rounded-full bg-green-600">
//                 <Eye className="h-6 w-6 text-white" />
//               </div>
//               <div className="ml-4">
//                 <p className="text-sm font-medium text-gray-600">Sightings</p>
//                 <p className="text-2xl font-bold text-gray-900">{stats?.totalSightings || 0}</p>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-lg shadow p-6">
//             <div className="flex items-center">
//               <div className="p-3 rounded-full bg-red-600">
//                 <AlertTriangle className="h-6 w-6 text-white" />
//               </div>
//               <div className="ml-4">
//                 <p className="text-sm font-medium text-gray-600">Incidents</p>
//                 <p className="text-2xl font-bold text-gray-900">{stats?.totalIncidents || 0}</p>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-lg shadow p-6">
//             <div className="flex items-center">
//               <div className="p-3 rounded-full bg-yellow-600">
//                 <TrendingUp className="h-6 w-6 text-white" />
//               </div>
//               <div className="ml-4">
//                 <p className="text-sm font-medium text-gray-600">Endangered</p>
//                 <p className="text-2xl font-bold text-gray-900">{stats?.endangeredSpecies || 0}</p>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Charts Section */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
//           {/* Species Distribution */}
//           <div className="bg-white rounded-lg shadow p-6">
//             <h2 className="text-lg font-semibold text-gray-900 mb-4">
//               Species Distribution by Category
//             </h2>
//             <ResponsiveContainer width="100%" height={300}>
//               <PieChart>
//                 <Pie
//                   data={speciesDistribution}
//                   cx="50%"
//                   cy="50%"
//                   labelLine={false}
//                   label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
//                   outerRadius={80}
//                   fill="#8884d8"
//                   dataKey="value"
//                 >
//                   {speciesDistribution.map((entry, index) => (
//                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                   ))}
//                 </Pie>
//                 <Tooltip />
//               </PieChart>
//             </ResponsiveContainer>
//           </div>

//           {/* Incident Trends */}
//           <div className="bg-white rounded-lg shadow p-6">
//             <h2 className="text-lg font-semibold text-gray-900 mb-4">
//               Incidents by Type
//             </h2>
//             <ResponsiveContainer width="100%" height={300}>
//               <BarChart data={incidentTrends}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
//                 <YAxis />
//                 <Tooltip />
//                 <Legend />
//                 <Bar dataKey="count" fill="#EF4444" />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>
//         </div>

//         {/* Recent Sightings Table */}
//         <div className="bg-white rounded-lg shadow p-6">
//           <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Sightings</h2>
//           <div className="overflow-x-auto">
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Species
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Count
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Location
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Observer
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Date
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Status
//                   </th>
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200">
//                 {sightings.map((sighting) => (
//                   <tr key={sighting.id}>
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <div className="text-sm font-medium text-gray-900">
//                         {sighting.species?.commonName}
//                       </div>
//                       <div className="text-sm text-gray-500">
//                         {sighting.species?.scientificName}
//                       </div>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                       {sighting.count}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                       {sighting.location || 'N/A'}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                       {sighting.observer?.firstName} {sighting.observer?.lastName}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                       {new Date(sighting.sightingDate).toLocaleDateString()}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap">
//                       <span
//                         className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
//                           sighting.verified
//                             ? 'bg-green-100 text-green-800'
//                             : 'bg-yellow-100 text-yellow-800'
//                         }`}
//                       >
//                         {sighting.verified ? 'Verified' : 'Pending'}
//                       </span>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//           {sightings.length === 0 && (
//             <p className="text-center text-gray-500 py-8">No sightings data available</p>
//           )}
//         </div>

//         {/* Info Banner */}
//         <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-4">
//           <div className="flex">
//             <TrendingUp className="h-5 w-5 text-blue-400" />
//             <div className="ml-3">
//               <h3 className="text-sm font-medium text-blue-800">
//                 Research Access
//               </h3>
//               <p className="mt-2 text-sm text-blue-700">
//                 As a researcher, you have read-only access to all wildlife data. Use the analytics to identify trends, 
//                 monitor biodiversity health, and support conservation planning.
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ResearcherDashboard;

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Layers, Eye, AlertTriangle,
  Radio, Zap, ShieldAlert, Users, Battery, Clock
} from 'lucide-react';
import Navbar from '../shared/Navbar';
import authService from '../../services/auth';
import api from '../../services/api';

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

  const COLORS     = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  const CON_COLORS = {
    'Critically Endangered': '#DC2626',
    'Endangered':            '#EA580C',
    'Vulnerable':            '#D97706',
    'Near Threatened':       '#65A30D',
    'Least Concern':         '#16A34A',
  };

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
        api.get('/sightings?limit=10'),
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
  };

  // ── Battery colour helper ───────────────────────────────────────────────────
  const batteryColor = (level) => {
    if (level >= 60) return 'text-green-600';
    if (level >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Researcher Dashboard</h1>
          <p className="mt-2 text-gray-600">Analytics and biodiversity insights</p>
        </div>

        {/* ── Statistics Grid (unchanged) ──────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { icon: Layers,        label: 'Species',    value: stats?.totalSpecies,    color: 'bg-blue-600'   },
            { icon: Eye,           label: 'Sightings',  value: stats?.totalSightings,  color: 'bg-green-600'  },
            { icon: AlertTriangle, label: 'Incidents',  value: stats?.totalIncidents,  color: 'bg-red-600'    },
            { icon: TrendingUp,    label: 'Endangered', value: stats?.endangeredSpecies, color: 'bg-yellow-600' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-full ${color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">{value || 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Existing Charts (unchanged) ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Species Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Species Distribution by Category</h2>
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
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Incidents by Type */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Incidents by Type</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={incidentTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── NEW: Sightings Over Time ──────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Sightings Over Time</h2>
            <span className="ml-2 text-sm text-gray-500">(last 12 months)</span>
          </div>
          {monthlyTrends.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No trend data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="sightings"
                  stroke="#16A34A"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Sightings"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="totalAnimals"
                  stroke="#2563EB"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                  name="Total Animals"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── NEW: Top 5 Species + Conservation Status ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

          {/* Top 5 Most Sighted Species */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Eye className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Top 5 Most Sighted Species</h2>
            </div>
            {topSpecies.length === 0 ? (
              <p className="text-center text-gray-500 py-12">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topSpecies} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="sightings" fill="#16A34A" radius={[0, 4, 4, 0]} name="Sightings" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Conservation Status Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <ShieldAlert className="h-5 w-5 text-red-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Conservation Status</h2>
            </div>
            {conservationStatus.length === 0 ? (
              <p className="text-center text-gray-500 py-12">No data available</p>
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
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="mt-2 space-y-1">
                  {conservationStatus.map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <span
                          className="inline-block w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: CON_COLORS[entry.name] || COLORS[index % COLORS.length] }}
                        />
                        <span className="text-gray-700">{entry.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── NEW: IoT Sensor Activity ──────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center mb-4">
            <Radio className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">IoT Sensor Activity</h2>
            <span className="ml-2 text-sm text-gray-500">({sensorSummary.length} sensors)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Sensor ID', 'Type', 'Data Points', 'Avg Battery', 'Last Reading'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sensorSummary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No sensor data available</td>
                  </tr>
                ) : (
                  sensorSummary.map((sensor) => {
                    const battery = Math.round(sensor.avgBattery);
                    const lastSeen = new Date(sensor.lastReading);
                    const minutesAgo = Math.round((Date.now() - lastSeen) / 60000);
                    return (
                      <tr key={sensor.sensorId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-medium text-gray-900">
                          {sensor.sensorId}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {sensor.deviceType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          <div className="flex items-center">
                            <Zap className="h-3.5 w-3.5 text-gray-400 mr-1" />
                            {parseInt(sensor.dataPoints).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`flex items-center font-medium ${batteryColor(battery)}`}>
                            <Battery className="h-3.5 w-3.5 mr-1" />
                            {battery}%
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
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

        {/* ── NEW: Endangered Species List ──────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Endangered Species Monitor</h2>
            <span className="ml-2 text-sm text-gray-500">({endangeredList.length} species)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Common Name', 'Scientific Name', 'Category', 'Status', 'Population', 'Sightings'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {endangeredList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No endangered species data available</td>
                  </tr>
                ) : (
                  endangeredList.map((sp) => (
                    <tr key={sp.id} className="hover:bg-red-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{sp.commonName}</td>
                      <td className="px-4 py-3 italic text-gray-500">{sp.scientificName}</td>
                      <td className="px-4 py-3 text-gray-700">{sp.category}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: `${CON_COLORS[sp.conservationStatus] || '#6B7280'}22`,
                            color: CON_COLORS[sp.conservationStatus] || '#6B7280',
                          }}
                        >
                          {sp.conservationStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {sp.population != null ? sp.population.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {sp.recentSightings || 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Existing: Recent Sightings Table (unchanged) ──────────────────── */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Sightings</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Species', 'Count', 'Location', 'Observer', 'Date', 'Status'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sightings.map((sighting) => (
                  <tr key={sighting.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{sighting.species?.commonName}</div>
                      <div className="text-sm text-gray-500">{sighting.species?.scientificName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sighting.count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sighting.location || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sighting.observer?.firstName} {sighting.observer?.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(sighting.sightingDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        sighting.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
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
            <p className="text-center text-gray-500 py-8">No sightings data available</p>
          )}
        </div>

        {/* ── Existing: Info Banner (unchanged) ────────────────────────────── */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Research Access</h3>
              <p className="mt-2 text-sm text-blue-700">
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
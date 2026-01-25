import React, { useState, useEffect } from 'react';
import Navbar from '../shared/Navbar';
import authService from '../../services/auth';
import api from '../../services/api';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  Filler 
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { FileText, Download, Calendar } from 'lucide-react';

// Register ChartJS components
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [speciesDist, setSpeciesDist] = useState(null);
  const [sightingTrends, setSightingTrends] = useState(null);
  const [incidentTrends, setIncidentTrends] = useState(null);
  const user = authService.getCurrentUser();

  useEffect(() => {
    fetchAllReports();
  }, []);

  const fetchAllReports = async () => {
    try {
      const [distRes, sightRes, incRes] = await Promise.all([
        api.get('/reports/species-distribution'),
        api.get('/reports/sighting-trends'),
        api.get('/reports/incident-trends?startDate=2023-01-01&endDate=2025-12-31') // Adjust dates as needed
      ]);

      if (distRes.data.success) setSpeciesDist(distRes.data.data);
      if (sightRes.data.success) setSightingTrends(sightRes.data.data);
      if (incRes.data.success) setIncidentTrends(incRes.data.data);

    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Chart Data Helpers ---

  // 1. Line Chart: Sightings over time
  const getSightingLineData = () => {
    if (!sightingTrends?.monthlyTrends) return { labels: [], datasets: [] };
    
    // Sort chronologically if needed, backend usually handles this but good to be safe
    const data = [...sightingTrends.monthlyTrends].reverse(); 

    return {
      labels: data.map(d => new Date(d.month).toLocaleDateString('default', { month: 'short', year: '2-digit' })),
      datasets: [
        {
          label: 'Total Sightings',
          data: data.map(d => d.count),
          borderColor: 'rgb(22, 163, 74)', // Green-600
          backgroundColor: 'rgba(22, 163, 74, 0.1)',
          fill: true,
          tension: 0.4,
        }
      ]
    };
  };

  // 2. Doughnut Chart: Species Categories
  const getCategoryDoughnutData = () => {
    if (!speciesDist?.byCategory) return { labels: [], datasets: [] };

    return {
      labels: speciesDist.byCategory.map(d => d.category),
      datasets: [
        {
          data: speciesDist.byCategory.map(d => d.count),
          backgroundColor: [
            '#16a34a', '#2563eb', '#db2777', '#9333ea', '#ea580c', '#0891b2', '#ca8a04'
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  // 3. Bar Chart: Incident Types
  const getIncidentBarData = () => {
    if (!incidentTrends?.byType) return { labels: [], datasets: [] };

    return {
      labels: incidentTrends.byType.map(d => d.incidentType),
      datasets: [
        {
          label: 'Incidents Reported',
          data: incidentTrends.byType.map(d => d.count),
          backgroundColor: 'rgba(239, 68, 68, 0.7)', // Red-500
        },
      ],
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Reports</h1>
            <p className="text-gray-600">Analytics and trends overview</p>
          </div>
          <button className="flex items-center space-x-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50">
            <Download className="h-4 w-4" />
            <span>Export PDF</span>
          </button>
        </div>

        {/* --- Top Row: Key Metrics --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Sighting Trends */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-green-600" />
              Sighting Activity
            </h3>
            <div className="h-64">
              <Line options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} data={getSightingLineData()} />
            </div>
          </div>

          {/* Incident Trends */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-red-600" />
              Incidents by Type
            </h3>
            <div className="h-64">
              <Bar options={{ maintainAspectRatio: false }} data={getIncidentBarData()} />
            </div>
          </div>
        </div>

        {/* --- Middle Row: Breakdown & Top Lists --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Species Category Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Species Distribution</h3>
            <div className="h-64 flex justify-center">
              <Doughnut options={{ maintainAspectRatio: false }} data={getCategoryDoughnutData()} />
            </div>
          </div>

          {/* Top Sighted Species Table */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Most Spotted Species</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Species</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scientific Name</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sightings</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Animals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sightingTrends?.topSpecies?.map((s) => (
                    <tr key={s.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.commonName}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 italic">{s.scientificName}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">{s.sightingCount}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right font-bold">{s.totalAnimals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* --- Bottom Row: Active Observers --- */}
        <div className="mt-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Contributors</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sightingTrends?.activeObservers?.slice(0, 4).map((obs) => (
              <div key={obs.id} className="flex items-center p-4 bg-gray-50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                  {obs.firstName[0]}{obs.lastName[0]}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">{obs.firstName} {obs.lastName}</p>
                  <p className="text-xs text-gray-500">{obs.role} • {obs.sightingCount} reports</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Reports;
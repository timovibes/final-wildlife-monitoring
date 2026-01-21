import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import api from '../../services/api';

const IoTDataViewer = () => {
  const [iotData, setIotData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/iot/data?limit=50');
      if (response.data.success) {
        setIotData(response.data.data.iotData);
      }
    } catch (error) {
      console.error('Failed to fetch IoT data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-blue-600" />
          Live IoT Sensor Data
        </h2>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sensor ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temp</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Battery</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motion</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {iotData.map((data) => (
              <tr key={data.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {data.sensorId}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {data.deviceType}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                    {data.latitude != null ? Number(data.latitude).toFixed(4) : '0.0000'}, 
                    {data.longitude != null ? Number(data.longitude).toFixed(4) : '0.0000'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {data.temperature ? `${data.temperature}°C` : '-'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {data.batteryLevel ? (
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      data.batteryLevel > 70 ? 'bg-green-100 text-green-800' :
                      data.batteryLevel > 30 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {data.batteryLevel}%
                    </span>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {data.motion !== null ? (
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      data.motion ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {data.motion ? 'Active' : 'Still'}
                    </span>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(data.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {iotData.length === 0 && (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {loading ? 'Loading sensor data...' : 'No IoT data available. Start the sensor simulation.'}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>Showing most recent {iotData.length} sensor readings • Auto-refreshes every 15 seconds</p>
      </div>
    </div>
  );
};

export default IoTDataViewer;
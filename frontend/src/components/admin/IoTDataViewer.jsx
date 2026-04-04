import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Table, Map as MapIcon } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../../services/api';

// --- Leaflet Default Icon Fix ---
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// --- Per-device-type coloured icons ---
// Uses the free DivIcon approach — no extra assets needed
const makeIcon = (color, shape = '●') =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        background:${color};
        color:#fff;
        border-radius:50%;
        width:32px;height:32px;
        display:flex;align-items:center;justify-content:center;
        font-size:16px;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
        border:2px solid #fff;
      ">${shape}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });

const DEVICE_ICONS = {
  'GPS Collar':      makeIcon('#16a34a', '🐾'),
  'Camera Trap':     makeIcon('#2563eb', '📷'),
  'Motion Sensor':   makeIcon('#d97706', '〰'),
  'Weather Station': makeIcon('#7c3aed', '🌤'),
};
const FALLBACK_ICON = makeIcon('#6b7280', '?');

// Nairobi National Park center
const NNP_CENTER = [-1.3700, 36.8500];
const NNP_ZOOM   = 13;

// ─── Key fix: keep only the latest reading per sensorId ───────────────────
const deduplicateBySensor = (readings) => {
  const latest = new Map();
  for (const reading of readings) {
    const existing = latest.get(reading.sensorId);
    if (!existing || new Date(reading.timestamp) > new Date(existing.timestamp)) {
      latest.set(reading.sensorId, reading);
    }
  }
  return Array.from(latest.values());
};

const IoTDataViewer = () => {
  const [iotData, setIotData]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [viewMode, setViewMode] = useState('table');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch enough rows to guarantee we get the latest per sensor
      const response = await api.get('/iot/data?limit=100');
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
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  // One marker per sensor — always the freshest reading
  const latestPerSensor = deduplicateBySensor(iotData);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-blue-600" />
          Live IoT Sensor Data
        </h2>

        <div className="flex items-center space-x-4">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'table' ? 'bg-white shadow text-blue-700' : 'text-gray-600'
              }`}
            >
              <Table className="h-4 w-4 mr-2" />
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'map' ? 'bg-white shadow text-blue-700' : 'text-gray-600'
              }`}
            >
              <MapIcon className="h-4 w-4 mr-2" />
              Map
            </button>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
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
              {/* Table still shows all recent readings for history */}
              {iotData.map((data) => (
                <tr key={data.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{data.sensorId}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      {data.deviceType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {data.latitude  != null ? Number(data.latitude).toFixed(5)  : '—'},{' '}
                    {data.longitude != null ? Number(data.longitude).toFixed(5) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {data.temperature ? `${data.temperature}°C` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {data.batteryLevel != null ? (
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        data.batteryLevel > 70 ? 'bg-green-100 text-green-800' :
                        data.batteryLevel > 30 ? 'bg-yellow-100 text-yellow-800' :
                                                  'bg-red-100 text-red-800'
                      }`}>
                        {data.batteryLevel}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {data.motion !== null && data.motion !== undefined ? (
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        data.motion ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {data.motion ? 'Active' : 'Still'}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(data.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {iotData.length === 0 && !loading && (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No IoT data available. Start the sensor simulation.</p>
            </div>
          )}
        </div>
      )}

      {/* MAP VIEW — one marker per sensor, latest reading only */}
      {viewMode === 'map' && (
        <>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-3 text-xs text-gray-600">
            {Object.entries(DEVICE_ICONS).map(([type]) => (
              <span key={type} className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full" style={{
                  background: { 'GPS Collar': '#16a34a', 'Camera Trap': '#2563eb', 'Motion Sensor': '#d97706', 'Weather Station': '#7c3aed' }[type]
                }} />
                {type}
              </span>
            ))}
          </div>

          <div className="h-[500px] w-full rounded-lg overflow-hidden border border-gray-200">
            <MapContainer
              center={NNP_CENTER}
              zoom={NNP_ZOOM}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />

              {latestPerSensor.map((data) => {
                const lat = parseFloat(data.latitude);
                const lng = parseFloat(data.longitude);
                if (isNaN(lat) || isNaN(lng)) return null;

                const icon = DEVICE_ICONS[data.deviceType] ?? FALLBACK_ICON;

                return (
                  <Marker key={data.sensorId} position={[lat, lng]} icon={icon}>
                    <Popup>
                      <div className="text-sm space-y-1 min-w-[160px]">
                        <p className="font-bold text-gray-800">{data.sensorId}</p>
                        <p className="text-gray-500">{data.deviceType}</p>
                        <hr />
                        {data.temperature  != null && <p>🌡 {data.temperature}°C</p>}
                        {data.batteryLevel != null && <p>🔋 {data.batteryLevel}%</p>}
                        {data.speed        != null && <p>💨 {Number(data.speed).toFixed(1)} km/h</p>}
                        {data.motion       != null && <p>📡 {data.motion ? 'Active' : 'Still'}</p>}
                        <p className="text-gray-400 text-xs pt-1">
                          {new Date(data.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Showing latest position for {latestPerSensor.length} sensor{latestPerSensor.length !== 1 ? 's' : ''} • Auto-refreshes every 15 s
          </p>
        </>
      )}

      {viewMode === 'table' && (
        <div className="mt-4 text-sm text-gray-600">
          Showing most recent {iotData.length} readings • Auto-refreshes every 15 seconds
        </div>
      )}
    </div>
  );
};

export default IoTDataViewer;
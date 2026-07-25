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
// Text-label markers (mono, field-tag style) - no emoji
const makeIcon = (color, label) =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        background:${color};
        color:#EDE6D3;
        border-radius:2px;
        width:34px;height:34px;
        display:flex;align-items:center;justify-content:center;
        font-family:'IBM Plex Mono',monospace;
        font-size:9px;
        font-weight:600;
        letter-spacing:0.02em;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
        border:1.5px solid #EDE6D3;
      ">${label}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });

const DEVICE_COLORS = {
  'GPS Collar':      '#C98A3E',
  'Camera Trap':     '#4A7C7C',
  'Motion Sensor':   '#8C6229',
  'Weather Station': '#6B8E8E',
};

const DEVICE_ICONS = {
  'GPS Collar':      makeIcon(DEVICE_COLORS['GPS Collar'], 'GPS'),
  'Camera Trap':     makeIcon(DEVICE_COLORS['Camera Trap'], 'CAM'),
  'Motion Sensor':   makeIcon(DEVICE_COLORS['Motion Sensor'], 'MOT'),
  'Weather Station': makeIcon(DEVICE_COLORS['Weather Station'], 'WX'),
};
const FALLBACK_ICON = makeIcon('#3A4433', '?');

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
    <div className="border border-bush-line bg-bush-surface p-6">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h2 className="font-display text-lg font-semibold flex items-center">
          <Activity className="h-4 w-4 mr-2 text-ochre" />
          Live IoT Sensor Data
        </h2>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex border border-bush-line">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                viewMode === 'table' ? 'bg-ochre text-bush' : 'text-bone/50 hover:text-bone'
              }`}
            >
              <Table className="h-3.5 w-3.5 mr-1.5" />
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-colors border-l border-bush-line ${
                viewMode === 'map' ? 'bg-ochre text-bush' : 'text-bone/50 hover:text-bone'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5 mr-1.5" />
              Map
            </button>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center px-4 py-2 border border-ochre text-ochre font-mono text-[11px] uppercase tracking-widest hover:bg-ochre hover:text-bush disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ochre transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto border border-bush-line">
          <table className="min-w-full divide-y divide-bush-line">
            <thead className="bg-bush">
              <tr>
                <th className="px-4 py-3 text-left font-mono text-[10px] font-medium text-bone/50 uppercase tracking-widest">Sensor ID</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] font-medium text-bone/50 uppercase tracking-widest">Type</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] font-medium text-bone/50 uppercase tracking-widest">Location</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] font-medium text-bone/50 uppercase tracking-widest">Temp</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] font-medium text-bone/50 uppercase tracking-widest">Battery</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] font-medium text-bone/50 uppercase tracking-widest">Motion</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] font-medium text-bone/50 uppercase tracking-widest">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bush-line">
              {/* Table still shows all recent readings for history */}
              {iotData.map((data) => (
                <tr key={data.id} className="hover:bg-bush transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{data.sensorId}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border"
                      style={{
                        color: DEVICE_COLORS[data.deviceType] || '#A8AE9C',
                        borderColor: DEVICE_COLORS[data.deviceType] || '#3A4433',
                      }}
                    >
                      {data.deviceType}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-bone/60">
                    {data.latitude  != null ? Number(data.latitude).toFixed(5)  : '—'},{' '}
                    {data.longitude != null ? Number(data.longitude).toFixed(5) : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-bone/60">
                    {data.temperature ? `${data.temperature}°C` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {data.batteryLevel != null ? (
                      <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 border ${
                        data.batteryLevel > 70 ? 'border-teal text-teal' :
                        data.batteryLevel > 30 ? 'border-ochre text-ochre' :
                                                  'border-rust text-rust'
                      }`}>
                        {data.batteryLevel}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {data.motion !== null && data.motion !== undefined ? (
                      <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 border ${
                        data.motion ? 'border-teal text-teal' : 'border-bush-line text-bone/40'
                      }`}>
                        {data.motion ? 'Active' : 'Still'}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-bone/50">
                    {new Date(data.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {iotData.length === 0 && !loading && (
            <div className="text-center py-12">
              <Activity className="h-10 w-10 text-bone/20 mx-auto mb-4" />
              <p className="font-mono text-xs uppercase tracking-widest text-bone/40">
                No IoT data available. Start the sensor simulation.
              </p>
            </div>
          )}
        </div>
      )}

      {/* MAP VIEW — one marker per sensor, latest reading only */}
      {viewMode === 'map' && (
        <>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-3 font-mono text-[11px] text-bone/60">
            {Object.entries(DEVICE_COLORS).map(([type, color]) => (
              <span key={type} className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5" style={{ background: color }} />
                {type}
              </span>
            ))}
          </div>

          <div className="h-[500px] w-full overflow-hidden border border-bush-line">
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
                      <div className="font-mono text-xs space-y-1 min-w-[160px]">
                        <p className="font-bold text-bush">{data.sensorId}</p>
                        <p className="text-bush/60">{data.deviceType}</p>
                        <hr />
                        {data.temperature  != null && <p>TEMP {data.temperature}°C</p>}
                        {data.batteryLevel != null && <p>BATT {data.batteryLevel}%</p>}
                        {data.speed        != null && <p>SPD {Number(data.speed).toFixed(1)} km/h</p>}
                        {data.motion       != null && <p>MOTION {data.motion ? 'Active' : 'Still'}</p>}
                        <p className="text-bush/40 text-[10px] pt-1">
                          {new Date(data.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          <p className="mt-2 font-mono text-[11px] text-bone/40">
            Showing latest position for {latestPerSensor.length} sensor{latestPerSensor.length !== 1 ? 's' : ''} &middot; Auto-refreshes every 15 s
          </p>
        </>
      )}

      {viewMode === 'table' && (
        <div className="mt-4 font-mono text-[11px] text-bone/40">
          Showing most recent {iotData.length} readings &middot; Auto-refreshes every 15 seconds
        </div>
      )}
    </div>
  );
};

export default IoTDataViewer;
const axios = require('axios');
require('dotenv').config();

/**
 * IoT Sensor Simulation Service
 *
 * Purpose: NOT a demo feature - this is a functional stress test layer
 *
 * Rationale:
 * - Simulates production IoT data patterns (GPS collars, camera traps)
 * - Validates system's ability to handle high-frequency data ingestion
 * - Tests reporting/analytics modules under realistic load
 * - Provides foundation for future real IoT device integration
 *
 * Only GPS Collar sensors move. Camera traps, motion sensors, and weather
 * stations are pinned to their fixed coordinates permanently.
 *
 * All animal movement is strictly constrained within the Nairobi National
 * Park polygon using ray-casting point-in-polygon checks.
 *
 * Usage (standalone):        node services/sensorSimulation.js
 * Usage (from other code):   const sim = require('./services/sensorSimulation');
 *                            sim.startSimulation(); sim.stopSimulation(); sim.isRunning();
 */

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// ─── Nairobi National Park Boundary ────────────────────────────────────────
const PARK_BOUNDARY = [
  { lat: -1.3620042910581462, lng: 36.84142655837787 },
  { lat: -1.3565652348842911, lng: 36.85717128769847 },
  { lat: -1.371893452616081,  lng: 36.882560694142164 },
  { lat: -1.39826434981521,   lng: 36.89006211014353 },
  { lat: -1.3920012884311217, lng: 36.85395639578529 },
  { lat: -1.35076904729797,   lng: 36.798790443246695 },
  { lat: -1.3427099859278102, lng: 36.82310866216303 },
];

const PARK_CENTROID = PARK_BOUNDARY.reduce(
  (acc, p) => ({ lat: acc.lat + p.lat / PARK_BOUNDARY.length, lng: acc.lng + p.lng / PARK_BOUNDARY.length }),
  { lat: 0, lng: 0 }
);

// ─── Point-in-polygon (ray casting) ────────────────────────────────────────
const isInsidePolygon = (lat, lng, polygon) => {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

// ─── Clamp to park boundary ─────────────────────────────────────────────────
const clampToPark = (proposedLat, proposedLng) => {
  if (isInsidePolygon(proposedLat, proposedLng, PARK_BOUNDARY)) {
    return { lat: proposedLat, lng: proposedLng };
  }
  let lo = 0, hi = 1;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    const midLat = proposedLat + (PARK_CENTROID.lat - proposedLat) * mid;
    const midLng = proposedLng + (PARK_CENTROID.lng - proposedLng) * mid;
    if (isInsidePolygon(midLat, midLng, PARK_BOUNDARY)) hi = mid;
    else lo = mid;
  }
  return {
    lat: proposedLat + (PARK_CENTROID.lat - proposedLat) * hi,
    lng: proposedLng + (PARK_CENTROID.lng - proposedLng) * hi,
  };
};

// ─── Sensor Definitions ─────────────────────────────────────────────────────
// stepSize: 0  → fixed device, never moves
// stepSize: >0 → GPS collar, moves every tick
const SENSORS = [
  // ── GPS COLLARS — original ──────────────────────────────────────────────
  { id: 'LION_01',           deviceType: 'GPS Collar',      speciesId: null, baseLocation: { lat: -1.3700, lng: 36.8580 }, stepSize: 0.0006, behaviorProfile: 'predator'  },
  { id: 'LION_02',           deviceType: 'GPS Collar',      speciesId: null, baseLocation: { lat: -1.3820, lng: 36.8720 }, stepSize: 0.0006, behaviorProfile: 'predator'  },
  { id: 'RHINO_01',          deviceType: 'GPS Collar',      speciesId: null, baseLocation: { lat: -1.3650, lng: 36.8350 }, stepSize: 0.0003, behaviorProfile: 'grazer'    },
  { id: 'ZEBRA_GRP_A',       deviceType: 'GPS Collar',      speciesId: null, baseLocation: { lat: -1.3880, lng: 36.8650 }, stepSize: 0.0008, behaviorProfile: 'herd'      },
  { id: 'GIRAFFE_01',        deviceType: 'GPS Collar',      speciesId: null, baseLocation: { lat: -1.3600, lng: 36.8200 }, stepSize: 0.0005, behaviorProfile: 'browser'   },

  // ── GPS COLLARS — new ───────────────────────────────────────────────────
  { id: 'CHEETAH_01',        deviceType: 'GPS Collar',      speciesId: null, baseLocation: { lat: -1.3680, lng: 36.8480 }, stepSize: 0.0009, behaviorProfile: 'predator'  },
  { id: 'BUFFALO_01',        deviceType: 'GPS Collar',      speciesId: null, baseLocation: { lat: -1.3780, lng: 36.8560 }, stepSize: 0.0004, behaviorProfile: 'grazer'    },
  { id: 'WILDEBEEST_GRP_B',  deviceType: 'GPS Collar',      speciesId: null, baseLocation: { lat: -1.3850, lng: 36.8420 }, stepSize: 0.0009, behaviorProfile: 'herd'      },
  { id: 'ELEPHANT_01',       deviceType: 'GPS Collar',      speciesId: null, baseLocation: { lat: -1.3720, lng: 36.8650 }, stepSize: 0.0002, behaviorProfile: 'browser'   },
  { id: 'LEOPARD_01',        deviceType: 'GPS Collar',      speciesId: null, baseLocation: { lat: -1.3640, lng: 36.8720 }, stepSize: 0.0007, behaviorProfile: 'nocturnal' },
  { id: 'HYENA_01',          deviceType: 'GPS Collar',      speciesId: null, baseLocation: { lat: -1.3900, lng: 36.8600 }, stepSize: 0.0006, behaviorProfile: 'nocturnal' },

  // ── CAMERA TRAPS — original ─────────────────────────────────────────────
  { id: 'CAM_WEST_GATE',     deviceType: 'Camera Trap',     speciesId: null, baseLocation: { lat: -1.3540, lng: 36.8100 }, stepSize: 0 },
  { id: 'CAM_IVORY_BURN',    deviceType: 'Camera Trap',     speciesId: null, baseLocation: { lat: -1.3630, lng: 36.8200 }, stepSize: 0 },
  { id: 'CAM_HIPPO_POOL',    deviceType: 'Camera Trap',     speciesId: null, baseLocation: { lat: -1.3870, lng: 36.8520 }, stepSize: 0 },

  // ── CAMERA TRAPS — new ──────────────────────────────────────────────────
  { id: 'CAM_ATHI_BASIN',    deviceType: 'Camera Trap',     speciesId: null, baseLocation: { lat: -1.3800, lng: 36.8380 }, stepSize: 0 },
  { id: 'CAM_MBAGATHI',      deviceType: 'Camera Trap',     speciesId: null, baseLocation: { lat: -1.3680, lng: 36.8620 }, stepSize: 0 },
  { id: 'CAM_NAGOLOMON_DAM', deviceType: 'Camera Trap',     speciesId: null, baseLocation: { lat: -1.3750, lng: 36.8750 }, stepSize: 0 },

  // ── FIXED STATIONS — original ───────────────────────────────────────────
  { id: 'MET_STATION_HQ',    deviceType: 'Weather Station', speciesId: null, baseLocation: { lat: -1.3730, lng: 36.8590 }, stepSize: 0 },
  { id: 'MOTION_PERIM_01',   deviceType: 'Motion Sensor',   speciesId: null, baseLocation: { lat: -1.3500, lng: 36.8450 }, stepSize: 0 },

  // ── FIXED STATIONS — new ────────────────────────────────────────────────
  { id: 'MOTION_PERIM_02',   deviceType: 'Motion Sensor',   speciesId: null, baseLocation: { lat: -1.3580, lng: 36.8550 }, stepSize: 0 },
  { id: 'MET_STATION_SOUTH', deviceType: 'Weather Station', speciesId: null, baseLocation: { lat: -1.3860, lng: 36.8460 }, stepSize: 0 },
];

// ─── Simulation Parameters ───────────────────────────────────────────────────
const SIMULATION_INTERVAL = 3000;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour >= 6  && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
};

const randomInRange = (min, max) => Math.random() * (max - min) + min;
const randomBoolean = (probability = 0.5) => Math.random() < probability;

// ─── Battery ─────────────────────────────────────────────────────────────────
const batteryLevels = {};
const updateBatteryLevel = (sensorId, deviceType) => {
  if (!batteryLevels[sensorId]) batteryLevels[sensorId] = randomInRange(70, 100);
  const drainRates = {
    'GPS Collar':     0.01,
    'Camera Trap':    0.005,
    'Motion Sensor':  0.003,
    'Weather Station':0.008,
  };
  batteryLevels[sensorId] -= drainRates[deviceType] || 0.01;
  if (batteryLevels[sensorId] < 5) batteryLevels[sensorId] = 5;
  return Math.floor(batteryLevels[sensorId]);
};

// ─── Animal State (GPS collars only) ─────────────────────────────────────────
const animalStates = {};
const lastKnownPositions = {};

const initializeAnimalState = (sensor) => {
  if (!animalStates[sensor.id]) {
    animalStates[sensor.id] = {
      isResting:       false,
      restDuration:    0,
      heading:         Math.random() * 360,
      headingVelocity: 0,
    };
    lastKnownPositions[sensor.id] = { ...sensor.baseLocation };
  }
};

const getBehaviorModifiers = (profile, timeOfDay) => {
  const profiles = {
    // Diurnal predators (lion, cheetah) — active dawn/dusk, rest midday
    predator: {
      morning:   { activity: 0.6, restProb: 0.30, speed: 0.8 },
      afternoon: { activity: 0.3, restProb: 0.60, speed: 0.4 },
      evening:   { activity: 0.9, restProb: 0.10, speed: 1.2 },
      night:     { activity: 1.0, restProb: 0.20, speed: 1.0 },
    },
    // Grazers (rhino, buffalo) — active morning, shade up midday
    grazer: {
      morning:   { activity: 1.0, restProb: 0.20, speed: 0.7 },
      afternoon: { activity: 0.5, restProb: 0.50, speed: 0.3 },
      evening:   { activity: 0.8, restProb: 0.30, speed: 0.6 },
      night:     { activity: 0.4, restProb: 0.60, speed: 0.2 },
    },
    // Herds (zebra, wildebeest) — constantly on the move
    herd: {
      morning:   { activity: 0.9, restProb: 0.20, speed: 0.8 },
      afternoon: { activity: 0.6, restProb: 0.40, speed: 0.5 },
      evening:   { activity: 0.8, restProb: 0.30, speed: 0.7 },
      night:     { activity: 0.3, restProb: 0.70, speed: 0.2 },
    },
    // Browsers (giraffe, elephant) — slow and deliberate
    browser: {
      morning:   { activity: 0.8, restProb: 0.30, speed: 0.6 },
      afternoon: { activity: 0.7, restProb: 0.40, speed: 0.5 },
      evening:   { activity: 0.6, restProb: 0.40, speed: 0.5 },
      night:     { activity: 0.5, restProb: 0.50, speed: 0.3 },
    },
    // Nocturnal hunters (leopard, hyena) — near-stationary by day, peak at night
    nocturnal: {
      morning:   { activity: 0.2, restProb: 0.80, speed: 0.3 },
      afternoon: { activity: 0.1, restProb: 0.90, speed: 0.2 },
      evening:   { activity: 0.7, restProb: 0.20, speed: 1.0 },
      night:     { activity: 1.0, restProb: 0.10, speed: 1.3 },
    },
  };
  return profiles[profile]?.[timeOfDay] || { activity: 0.7, restProb: 0.3, speed: 0.7 };
};

// ─── Movement ─────────────────────────────────────────────────────────────────
const simulateMovement = (sensor) => {
  // Fixed devices — return exact base location, no movement ever
  if (sensor.stepSize === 0) {
    return {
      latitude:  sensor.baseLocation.lat,
      longitude: sensor.baseLocation.lng,
      speed:     0,
      isResting: true,
    };
  }

  // GPS collar movement below
  initializeAnimalState(sensor);

  const state    = animalStates[sensor.id];
  const current  = lastKnownPositions[sensor.id];
  const timeOfDay = getTimeOfDay();
  const behavior = getBehaviorModifiers(sensor.behaviorProfile, timeOfDay);

  // Resting check
  if (!state.isResting && randomBoolean(behavior.restProb * 0.15)) {
    state.isResting    = true;
    state.restDuration = Math.floor(randomInRange(3, 8));
  }

  if (state.isResting) {
    state.restDuration--;
    if (state.restDuration <= 0) state.isResting = false;
    const drift    = 0.00004;
    const proposed = {
      lat: current.lat + (Math.random() - 0.5) * drift,
      lng: current.lng + (Math.random() - 0.5) * drift,
    };
    const safe = clampToPark(proposed.lat, proposed.lng);
    lastKnownPositions[sensor.id] = safe;
    return { latitude: safe.lat, longitude: safe.lng, speed: 0, isResting: true };
  }

  // Momentum-based heading
  const maxTurnRate = 20;
  state.headingVelocity += (Math.random() - 0.5) * 10;
  state.headingVelocity  = Math.max(-maxTurnRate, Math.min(maxTurnRate, state.headingVelocity));
  state.heading          = (state.heading + state.headingVelocity + 360) % 360;

  const stepSize   = sensor.stepSize * behavior.speed * behavior.activity;
  const headingRad = (state.heading * Math.PI) / 180;

  const proposedLat = current.lat + Math.cos(headingRad) * stepSize;
  const proposedLng = current.lng + Math.sin(headingRad) * stepSize;

  const safe = clampToPark(proposedLat, proposedLng);

  // If clamped, steer back toward centroid
  if (safe.lat !== proposedLat || safe.lng !== proposedLng) {
    state.headingVelocity = -state.headingVelocity * 0.8;
    const angleToCenter   = Math.atan2(
      PARK_CENTROID.lng - current.lng,
      PARK_CENTROID.lat - current.lat
    ) * (180 / Math.PI);
    state.heading = (state.heading * 0.6 + angleToCenter * 0.4 + 360) % 360;
  }

  lastKnownPositions[sensor.id] = safe;

  const distDeg  = Math.sqrt(Math.pow(safe.lat - current.lat, 2) + Math.pow(safe.lng - current.lng, 2));
  const speedKmh = (distDeg * 111) * (3600 / (SIMULATION_INTERVAL / 1000));

  return { latitude: safe.lat, longitude: safe.lng, speed: speedKmh, isResting: false };
};

// ─── Weather State ────────────────────────────────────────────────────────────
let weatherState = { baseTemp: 22, humidity: 50, windSpeed: 5, rainfall: 0, lastUpdate: Date.now() };

const updateWeatherState = () => {
  const hoursSince = (Date.now() - weatherState.lastUpdate) / (1000 * 60 * 60);
  if (hoursSince > 0.5) {
    weatherState.baseTemp   = Math.max(15, Math.min(35, weatherState.baseTemp  + (Math.random() - 0.5) * 2));
    weatherState.humidity   = Math.max(20, Math.min(90, weatherState.humidity  + (Math.random() - 0.5) * 10));
    weatherState.windSpeed  = Math.max(0,  Math.min(25, weatherState.windSpeed + (Math.random() - 0.5) * 5));
    weatherState.rainfall   = Math.random() < 0.1 ? randomInRange(0, 8) : Math.max(0, weatherState.rainfall - 0.5);
    weatherState.lastUpdate = Date.now();
  }
  return weatherState;
};

// ─── Payload Generation ───────────────────────────────────────────────────────
const generateSensorData = (sensor) => {
  const movement = simulateMovement(sensor);
  const weather  = updateWeatherState();

  const payload = {
    sensorId:   sensor.id,
    deviceType: sensor.deviceType,
    speciesId:  sensor.speciesId,
    latitude:   parseFloat(movement.latitude.toFixed(8)),
    longitude:  parseFloat(movement.longitude.toFixed(8)),
    timestamp:  new Date().toISOString(),
  };

  switch (sensor.deviceType) {
    case 'GPS Collar': {
      const isActive = !movement.isResting;
      const exertion = movement.speed > 5 ? 1.2 : 1.0;
      payload.temperature  = parseFloat((weather.baseTemp + randomInRange(-1, 2)).toFixed(2));
      payload.batteryLevel = updateBatteryLevel(sensor.id, sensor.deviceType);
      payload.heartbeat    = Math.floor(randomInRange(60, 80) * (isActive ? exertion : 0.7));
      payload.altitude     = parseFloat((1650 + randomInRange(-10, 20)).toFixed(2));
      payload.speed        = parseFloat(movement.speed.toFixed(2));
      payload.motion       = isActive;
      break;
    }
    case 'Camera Trap': {
      const tod           = getTimeOfDay();
      const detectionProb = (tod === 'morning' || tod === 'evening') ? 0.4 : 0.2;
      payload.motion       = randomBoolean(detectionProb);
      payload.batteryLevel = updateBatteryLevel(sensor.id, sensor.deviceType);
      payload.temperature  = parseFloat((weather.baseTemp + randomInRange(-0.5, 0.5)).toFixed(2));
      if (payload.motion) payload.imagesCaptured = Math.floor(randomInRange(1, 5));
      break;
    }
    case 'Motion Sensor': {
      payload.motion         = randomBoolean(0.35);
      payload.batteryLevel   = updateBatteryLevel(sensor.id, sensor.deviceType);
      payload.signalStrength = Math.floor(randomInRange(60, 100));
      break;
    }
    case 'Weather Station': {
      payload.temperature = parseFloat(weather.baseTemp.toFixed(2));
      payload.metadata    = {
        humidity:  parseFloat(weather.humidity.toFixed(2)),
        windSpeed: parseFloat(weather.windSpeed.toFixed(2)),
        rainfall:  parseFloat(weather.rainfall.toFixed(2)),
        pressure:  parseFloat(randomInRange(1010, 1020).toFixed(2)),
        uvIndex:   Math.max(0, Math.floor(randomInRange(0, 11) * (getTimeOfDay() === 'afternoon' ? 1.2 : 0.8))),
      };
      break;
    }
  }

  return payload;
};

// ─── API Send ─────────────────────────────────────────────────────────────────
const sendSensorData = async (payload, retries = 2) => {
  try {
    const response = await axios.post(`${API_URL}/iot/data`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });
    console.log(`✓ [${new Date().toISOString()}] ${payload.sensorId} → (${payload.latitude.toFixed(5)}, ${payload.longitude.toFixed(5)})`);
    return response.data;
  } catch (error) {
    if (retries > 0 && error.code !== 'ECONNREFUSED') {
      console.log(`⟳ Retrying ${payload.sensorId}... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return sendSensorData(payload, retries - 1);
    }
    console.error(`✗ [${new Date().toISOString()}] ${payload.sensorId} — ${error.message}`);
    return null;
  }
};

// ─── Start/Stop control (module-level state — one simulation per process) ─────
let simulationTimer = null;
let running = false;
let iteration = 0;
let successCount = 0;
let failCount = 0;

const isRunning = () => running;

const startSimulation = () => {
  if (running) {
    console.log('Simulation already running — ignoring start request.');
    return;
  }

  running = true;
  iteration = 0;
  successCount = 0;
  failCount = 0;

  const moving = SENSORS.filter(s => s.stepSize > 0);
  const fixed  = SENSORS.filter(s => s.stepSize === 0);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  IoT SENSOR SIMULATION SERVICE — STARTED');
  console.log('  Park: Nairobi National Park (polygon-constrained)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  API Endpoint  : ${API_URL}/iot/data`);
  console.log(`  Total Sensors : ${SENSORS.length}`);
  console.log(`  Moving (${moving.length})   : ${moving.map(s => s.id).join(', ')}`);
  console.log(`  Fixed  (${fixed.length})    : ${fixed.map(s => s.id).join(', ')}`);
  console.log(`  Interval      : ${SIMULATION_INTERVAL}ms`);

  moving.forEach(s => {
    if (!isInsidePolygon(s.baseLocation.lat, s.baseLocation.lng, PARK_BOUNDARY)) {
      console.warn(`  ⚠ WARNING: Base location for ${s.id} is outside the park boundary!`);
    }
  });

  console.log('═══════════════════════════════════════════════════════════\n');

  simulationTimer = setInterval(async () => {
    iteration++;
    console.log(`\n--- Iteration ${iteration} [${getTimeOfDay().toUpperCase()}] ---`);

    const results = await Promise.all(
      SENSORS.map(sensor => sendSensorData(generateSensorData(sensor)))
    );
    results.forEach(r => (r ? successCount++ : failCount++));
  }, SIMULATION_INTERVAL);
};

const stopSimulation = () => {
  if (!running) {
    console.log('Simulation is not running — ignoring stop request.');
    return;
  }

  clearInterval(simulationTimer);
  simulationTimer = null;
  running = false;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  SIMULATION STOPPED');
  console.log(`  Data points sent : ${successCount}`);
  console.log(`  Failed           : ${failCount}`);
  const total = successCount + failCount;
  console.log(`  Success rate     : ${total > 0 ? ((successCount / total) * 100).toFixed(2) : '0.00'}%`);
  console.log('═══════════════════════════════════════════════════════════\n');
};

module.exports = { startSimulation, stopSimulation, isRunning };

// ─── Standalone CLI usage — `node services/sensorSimulation.js` or `npm run simulate` ───
if (require.main === module) {
  process.on('SIGINT', () => {
    console.log('\n\nSimulation stopped by user');
    stopSimulation();
    process.exit(0);
  });

  console.log('Starting sensor simulation in 3 seconds...\n');
  setTimeout(startSimulation, 3000);
}
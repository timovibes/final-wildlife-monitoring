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
 * This service generates realistic wildlife tracking data and POSTs it
 * to the backend API at configurable intervals, mimicking real IoT sensors
 * in the field.
 * 
 * Usage: node services/sensorSimulation.js
 */

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

const SENSORS = [
  // --- GPS COLLARS (The Movers) ---
  { id: 'LION_01', deviceType: 'GPS Collar', speciesId: null, baseLocation: { lat: -1.37333, lng: 36.85889 }, movementRadius: 0.04, behaviorProfile: 'predator' },
  { id: 'LION_02', deviceType: 'GPS Collar', speciesId: null, baseLocation: { lat: -1.38500, lng: 36.88000 }, movementRadius: 0.03, behaviorProfile: 'predator' },
  { id: 'RHINO_01', deviceType: 'GPS Collar', speciesId: null, baseLocation: { lat: -1.36000, lng: 36.82000 }, movementRadius: 0.02, behaviorProfile: 'grazer' },
  { id: 'ZEBRA_GRP_A', deviceType: 'GPS Collar', speciesId: null, baseLocation: { lat: -1.41000, lng: 36.90000 }, movementRadius: 0.05, behaviorProfile: 'herd' },
  { id: 'GIRAFFE_01', deviceType: 'GPS Collar', speciesId: null, baseLocation: { lat: -1.35000, lng: 36.78000 }, movementRadius: 0.03, behaviorProfile: 'browser' },

  // --- CAMERA TRAPS (Fixed Locations) ---
  { id: 'CAM_WEST_GATE', deviceType: 'Camera Trap', speciesId: null, baseLocation: { lat: -1.33500, lng: 36.77000 }, movementRadius: 0.0005 },
  { id: 'CAM_IVORY_BURN', deviceType: 'Camera Trap', speciesId: null, baseLocation: { lat: -1.35800, lng: 36.78500 }, movementRadius: 0.0005 },
  { id: 'CAM_HIPPO_POOL', deviceType: 'Camera Trap', speciesId: null, baseLocation: { lat: -1.39500, lng: 36.84500 }, movementRadius: 0.0005 },

  // --- FIXED STATIONS ---
  { id: 'MET_STATION_HQ', deviceType: 'Weather Station', speciesId: null, baseLocation: { lat: -1.37333, lng: 36.85889 }, movementRadius: 0 },
  { id: 'MOTION_PERIM_01', deviceType: 'Motion Sensor', speciesId: null, baseLocation: { lat: -1.32500, lng: 36.86000 }, movementRadius: 0.001 }
];

// Simulation parameters
const SIMULATION_INTERVAL = 3000; // 3 seconds between data points
const MAX_ITERATIONS = Infinity; // Run for specified iterations (can be infinite)

// Time-of-day tracking for circadian patterns
const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
};

// Generate random number in range
const randomInRange = (min, max) => {
  return Math.random() * (max - min) + min;
};

// Generate random boolean with probability
const randomBoolean = (probability = 0.5) => {
  return Math.random() < probability;
};

// Simulate realistic battery drain
const batteryLevels = {};
const updateBatteryLevel = (sensorId, deviceType) => {
  if (!batteryLevels[sensorId]) {
    batteryLevels[sensorId] = randomInRange(70, 100);
  }
  
  // Realistic drain rates per iteration
  const drainRates = {
    'GPS Collar': 0.01,       // ~0.01% per reading
    'Camera Trap': 0.005,     // Slower drain
    'Motion Sensor': 0.003,
    'Weather Station': 0.008
  };
  
  batteryLevels[sensorId] -= drainRates[deviceType] || 0.01;
  
  // Prevent negative battery
  if (batteryLevels[sensorId] < 5) {
    batteryLevels[sensorId] = 5; // Critical battery level
  }
  
  return Math.floor(batteryLevels[sensorId]);
};

// Store movement state for realistic animal behavior
const animalStates = {};
const lastKnownPositions = {};

const initializeAnimalState = (sensorId) => {
  if (!animalStates[sensorId]) {
    animalStates[sensorId] = {
      isResting: false,
      restDuration: 0,
      activityLevel: 1.0,
      heading: Math.random() * 360, // Initial random heading
      consecutiveRestChecks: 0
    };
  }
};

// Behavior profiles for different animal types
const getBehaviorModifiers = (profile, timeOfDay) => {
  const profiles = {
    predator: {
      morning: { activity: 0.6, restProb: 0.3, speed: 0.8 },
      afternoon: { activity: 0.3, restProb: 0.6, speed: 0.4 },
      evening: { activity: 0.9, restProb: 0.1, speed: 1.2 },
      night: { activity: 1.0, restProb: 0.2, speed: 1.0 }
    },
    grazer: {
      morning: { activity: 1.0, restProb: 0.2, speed: 0.7 },
      afternoon: { activity: 0.5, restProb: 0.5, speed: 0.3 },
      evening: { activity: 0.8, restProb: 0.3, speed: 0.6 },
      night: { activity: 0.4, restProb: 0.6, speed: 0.2 }
    },
    herd: {
      morning: { activity: 0.9, restProb: 0.2, speed: 0.8 },
      afternoon: { activity: 0.6, restProb: 0.4, speed: 0.5 },
      evening: { activity: 0.8, restProb: 0.3, speed: 0.7 },
      night: { activity: 0.3, restProb: 0.7, speed: 0.2 }
    },
    browser: {
      morning: { activity: 0.8, restProb: 0.3, speed: 0.6 },
      afternoon: { activity: 0.7, restProb: 0.4, speed: 0.5 },
      evening: { activity: 0.6, restProb: 0.4, speed: 0.5 },
      night: { activity: 0.5, restProb: 0.5, speed: 0.3 }
    }
  };
  
  return profiles[profile]?.[timeOfDay] || { activity: 0.7, restProb: 0.3, speed: 0.7 };
};

// Simulate GPS movement with realistic animal behavior
const simulateMovement = (sensor) => {
  initializeAnimalState(sensor.id);
  
  const state = animalStates[sensor.id];
  const currentPos = lastKnownPositions[sensor.id] || { ...sensor.baseLocation };
  const timeOfDay = getTimeOfDay();
  const behavior = getBehaviorModifiers(sensor.behaviorProfile, timeOfDay);
  
  // Check if animal should rest
  if (!state.isResting && randomBoolean(behavior.restProb)) {
    state.isResting = true;
    state.restDuration = Math.floor(randomInRange(3, 10)); // Rest for 3-10 iterations
  }
  
  // Handle resting state
  if (state.isResting) {
    state.restDuration--;
    if (state.restDuration <= 0) {
      state.isResting = false;
    }
    
    // Minimal movement while resting (GPS drift)
    const drift = 0.00005;
    return {
      latitude: currentPos.lat + (Math.random() - 0.5) * drift,
      longitude: currentPos.lng + (Math.random() - 0.5) * drift,
      speed: 0,
      isResting: true
    };
  }
  
  // Active movement with momentum (animals don't change direction randomly)
  const baseStepSize = 0.0005 * behavior.speed * behavior.activity;
  
  // Gradual heading changes (realistic turning)
  state.heading += (Math.random() - 0.5) * 30; // Max 30 degree turn per iteration
  state.heading = state.heading % 360;
  
  const headingRad = (state.heading * Math.PI) / 180;
  
  // Calculate new position based on heading
  let nextLat = currentPos.lat + Math.cos(headingRad) * baseStepSize;
  let nextLng = currentPos.lng + Math.sin(headingRad) * baseStepSize;
  
  // Geofencing: keep animal within territory
  const distLat = nextLat - sensor.baseLocation.lat;
  const distLng = nextLng - sensor.baseLocation.lng;
  const distance = Math.sqrt(distLat * distLat + distLng * distLng);
  
  if (distance > sensor.movementRadius) {
    // Turn back toward center when hitting boundary
    const angleToCenter = Math.atan2(
      sensor.baseLocation.lng - currentPos.lng,
      sensor.baseLocation.lat - currentPos.lat
    );
    state.heading = (angleToCenter * 180) / Math.PI;
    
    // Pull back slightly
    nextLat -= distLat * 0.2;
    nextLng -= distLng * 0.2;
  }
  
  const newPos = { lat: nextLat, lng: nextLng };
  lastKnownPositions[sensor.id] = newPos;
  
  // Calculate speed based on distance moved
  const distMoved = Math.sqrt(
    Math.pow(nextLat - currentPos.lat, 2) + 
    Math.pow(nextLng - currentPos.lng, 2)
  );
  const speedKmh = (distMoved * 111) * (3600 / (SIMULATION_INTERVAL / 1000)); // Rough conversion
  
  return { 
    latitude: newPos.lat, 
    longitude: newPos.lng,
    speed: speedKmh,
    isResting: false
  };
};

// Track environmental conditions
let weatherState = {
  baseTemp: 22,
  humidity: 50,
  windSpeed: 5,
  rainfall: 0,
  lastUpdate: Date.now()
};

const updateWeatherState = () => {
  const now = Date.now();
  const hoursSinceUpdate = (now - weatherState.lastUpdate) / (1000 * 60 * 60);
  
  if (hoursSinceUpdate > 0.5) { // Update every 30 minutes
    // Gradual temperature change
    weatherState.baseTemp += (Math.random() - 0.5) * 2;
    weatherState.baseTemp = Math.max(15, Math.min(35, weatherState.baseTemp));
    
    // Humidity changes
    weatherState.humidity += (Math.random() - 0.5) * 10;
    weatherState.humidity = Math.max(20, Math.min(90, weatherState.humidity));
    
    // Wind fluctuations
    weatherState.windSpeed += (Math.random() - 0.5) * 5;
    weatherState.windSpeed = Math.max(0, Math.min(25, weatherState.windSpeed));
    
    // Rainfall (occasional)
    if (Math.random() < 0.1) {
      weatherState.rainfall = randomInRange(0, 8);
    } else {
      weatherState.rainfall = Math.max(0, weatherState.rainfall - 0.5);
    }
    
    weatherState.lastUpdate = now;
  }
  
  return weatherState;
};

// Generate sensor data payload
const generateSensorData = (sensor) => {
  const movement = simulateMovement(sensor);
  const weather = updateWeatherState();
  
  const payload = {
    sensorId: sensor.id,
    deviceType: sensor.deviceType,
    speciesId: sensor.speciesId,
    latitude: parseFloat(movement.latitude.toFixed(8)),
    longitude: parseFloat(movement.longitude.toFixed(8)),
    timestamp: new Date().toISOString()
  };

  // Device-specific data with realistic correlations
  switch (sensor.deviceType) {
    case 'GPS Collar':
      const isActive = !movement.isResting;
      const exertion = movement.speed > 5 ? 1.2 : 1.0;
      
      payload.temperature = parseFloat((weather.baseTemp + randomInRange(-1, 2)).toFixed(2));
      payload.batteryLevel = updateBatteryLevel(sensor.id, sensor.deviceType);
      payload.heartbeat = Math.floor(
        randomInRange(60, 80) * (isActive ? exertion : 0.7)
      ); // Lower heart rate when resting
      payload.altitude = parseFloat((1650 + randomInRange(-10, 20)).toFixed(2));
      payload.speed = parseFloat(movement.speed.toFixed(2));
      payload.motion = isActive;
      break;
      
    case 'Camera Trap':
      const timeOfDay = getTimeOfDay();
      const detectionProb = timeOfDay === 'morning' || timeOfDay === 'evening' ? 0.4 : 0.2;
      
      payload.motion = randomBoolean(detectionProb);
      payload.batteryLevel = updateBatteryLevel(sensor.id, sensor.deviceType);
      payload.temperature = parseFloat((weather.baseTemp + randomInRange(-0.5, 0.5)).toFixed(2));
      
      // Add image capture count when motion detected
      if (payload.motion) {
        payload.imagesCaptured = Math.floor(randomInRange(1, 5));
      }
      break;
      
    case 'Motion Sensor':
      payload.motion = randomBoolean(0.35);
      payload.batteryLevel = updateBatteryLevel(sensor.id, sensor.deviceType);
      payload.signalStrength = Math.floor(randomInRange(60, 100));
      break;
      
    case 'Weather Station':
      payload.temperature = parseFloat(weather.baseTemp.toFixed(2));
      payload.metadata = {
        humidity: parseFloat(weather.humidity.toFixed(2)),
        windSpeed: parseFloat(weather.windSpeed.toFixed(2)),
        rainfall: parseFloat(weather.rainfall.toFixed(2)),
        pressure: parseFloat(randomInRange(1010, 1020).toFixed(2)),
        uvIndex: Math.max(0, Math.floor(randomInRange(0, 11) * (getTimeOfDay() === 'afternoon' ? 1.2 : 0.8)))
      };
      break;
  }

  return payload;
};

// Send data to API with retry logic
const sendSensorData = async (payload, retries = 2) => {
  try {
    const response = await axios.post(`${API_URL}/iot/data`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    
    console.log(`✓ [${new Date().toISOString()}] ${payload.sensorId} - Data sent successfully`);
    return response.data;
  } catch (error) {
    if (retries > 0 && error.code !== 'ECONNREFUSED') {
      console.log(`⟳ Retrying ${payload.sensorId}... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return sendSensorData(payload, retries - 1);
    }
    
    console.error(`✗ [${new Date().toISOString()}] ${payload.sensorId} - Error:`, error.message);
    return null;
  }
};

// Main simulation loop
const runSimulation = async () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  IoT SENSOR SIMULATION SERVICE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  API Endpoint: ${API_URL}/iot/data`);
  console.log(`  Active Sensors: ${SENSORS.length}`);
  console.log(`  Interval: ${SIMULATION_INTERVAL}ms`);
  console.log(`  Max Iterations: ${MAX_ITERATIONS}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  let iteration = 0;
  let successCount = 0;
  let failCount = 0;

  const simulationTimer = setInterval(async () => {
    iteration++;
    
    console.log(`\n--- Iteration ${iteration}/${MAX_ITERATIONS} [${getTimeOfDay().toUpperCase()}] ---`);
    
    // Generate and send data for all sensors
    const promises = SENSORS.map(sensor => {
      const payload = generateSensorData(sensor);
      return sendSensorData(payload);
    });

    const results = await Promise.all(promises);
    results.forEach(r => r ? successCount++ : failCount++);

    // Stop after max iterations
    if (iteration >= MAX_ITERATIONS) {
      clearInterval(simulationTimer);
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('  SIMULATION COMPLETE');
      console.log(`  Total data points sent: ${successCount}`);
      console.log(`  Failed transmissions: ${failCount}`);
      console.log(`  Success rate: ${((successCount / (successCount + failCount)) * 100).toFixed(2)}%`);
      console.log('═══════════════════════════════════════════════════════════\n');
      process.exit(0);
    }
  }, SIMULATION_INTERVAL);
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nSimulation stopped by user');
  process.exit(0);
});

// Start simulation
console.log('Starting sensor simulation in 3 seconds...\n');
setTimeout(runSimulation, 3000);
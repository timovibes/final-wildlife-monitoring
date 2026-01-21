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

// Simulated sensor configurations
const SENSORS = [
  {
    id: 'GPS_COLLAR_001',
    deviceType: 'GPS Collar',
    speciesId: null,
    baseLocation: { lat: -1.3730, lng: 36.8520 }, // Central Plains
    movementRadius: 0.03 
  },
  {
    id: 'GPS_COLLAR_002',
    deviceType: 'GPS Collar',
    speciesId: null,
    baseLocation: { lat: -1.4150, lng: 36.9120 }, // Near Athi Basin
    movementRadius: 0.04
  },
  {
    id: 'CAMERA_TRAP_001',
    deviceType: 'Camera Trap',
    speciesId: null,
    baseLocation: { lat: -1.3550, lng: 36.7650 }, // Forest edge (West)
    movementRadius: 0.001 
  },
  {
    id: 'MOTION_SENSOR_001',
    deviceType: 'Motion Sensor',
    speciesId: null,
    baseLocation: { lat: -1.3900, lng: 36.8300 }, // Near a Hippo pool
    movementRadius: 0.002
  },
  {
    id: 'WEATHER_STATION_001',
    deviceType: 'Weather Station',
    speciesId: null,
    baseLocation: { lat: -1.3350, lng: 36.8650 }, // Near East Gate
    movementRadius: 0
  },
  {
    id: 'GPS_COLLAR_003',
    deviceType: 'GPS Collar',
    speciesId: null,
    baseLocation: { lat: -1.4450, lng: 36.8850 }, // Southern border
    movementRadius: 0.05 
  }
];

// Simulation parameters
const SIMULATION_INTERVAL = 3000; // 10 seconds between data points
const MAX_ITERATIONS = Infinity; // Run for 100 iterations (can be infinite in production)

// Generate random number in range
const randomInRange = (min, max) => {
  return Math.random() * (max - min) + min;
};

// Generate random boolean with probability
const randomBoolean = (probability = 0.5) => {
  return Math.random() < probability;
};

// Simulate GPS movement (random walk)
const simulateMovement = (baseLocation, radius) => {
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radius;
  
  return {
    latitude: baseLocation.lat + (distance * Math.cos(angle)),
    longitude: baseLocation.lng + (distance * Math.sin(angle))
  };
};

// Generate sensor data payload
const generateSensorData = (sensor) => {
  const location = simulateMovement(sensor.baseLocation, sensor.movementRadius);
  
  const payload = {
    sensorId: sensor.id,
    deviceType: sensor.deviceType,
    speciesId: sensor.speciesId,
    latitude: parseFloat(location.latitude.toFixed(8)),
    longitude: parseFloat(location.longitude.toFixed(8)),
    timestamp: new Date().toISOString()
  };

  // Device-specific data
  switch (sensor.deviceType) {
    case 'GPS Collar':
      payload.temperature = parseFloat(randomInRange(18, 32).toFixed(2));
      payload.batteryLevel = Math.floor(randomInRange(30, 100));
      payload.heartbeat = Math.floor(randomInRange(60, 120));
      payload.altitude = parseFloat(randomInRange(1600, 1800).toFixed(2));
      payload.speed = parseFloat(randomInRange(0, 15).toFixed(2));
      payload.motion = randomBoolean(0.7); // 70% probability of movement
      break;
      
    case 'Camera Trap':
      payload.motion = randomBoolean(0.3); // 30% probability of detection
      payload.batteryLevel = Math.floor(randomInRange(50, 100));
      payload.temperature = parseFloat(randomInRange(18, 32).toFixed(2));
      break;
      
    case 'Motion Sensor':
      payload.motion = randomBoolean(0.4);
      payload.batteryLevel = Math.floor(randomInRange(40, 100));
      break;
      
    case 'Weather Station':
      payload.temperature = parseFloat(randomInRange(15, 35).toFixed(2));
      payload.metadata = {
        humidity: parseFloat(randomInRange(30, 80).toFixed(2)),
        windSpeed: parseFloat(randomInRange(0, 20).toFixed(2)),
        rainfall: parseFloat(randomInRange(0, 5).toFixed(2))
      };
      break;
  }

  return payload;
};

// Send data to API
const sendSensorData = async (payload) => {
  try {
    const response = await axios.post(`${API_URL}/iot/data`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`✓ [${new Date().toISOString()}] ${payload.sensorId} - Data sent successfully`);
    return response.data;
  } catch (error) {
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

  const simulationTimer = setInterval(async () => {
    iteration++;
    
    console.log(`\n--- Iteration ${iteration}/${MAX_ITERATIONS} ---`);
    
    // Generate and send data for all sensors
    const promises = SENSORS.map(sensor => {
      const payload = generateSensorData(sensor);
      return sendSensorData(payload);
    });

    await Promise.all(promises);

    // Stop after max iterations
    if (iteration >= MAX_ITERATIONS) {
      clearInterval(simulationTimer);
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('  SIMULATION COMPLETE');
      console.log(`  Total data points sent: ${iteration * SENSORS.length}`);
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
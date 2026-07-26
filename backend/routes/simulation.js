const express = require('express');
const router = express.Router();
const simulation = require('../services/sensorSimulation');

/**
 * IoT Sensor Simulation Control Routes
 *
 * GET  /api/simulation/status  - check whether the simulation is running
 * POST /api/simulation/toggle  - start it if stopped, stop it if running
 */

router.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    data: { running: simulation.isRunning() },
  });
});

router.post('/toggle', (req, res) => {
  if (simulation.isRunning()) {
    simulation.stopSimulation();
  } else {
    simulation.startSimulation();
  }

  res.status(200).json({
    success: true,
    data: { running: simulation.isRunning() },
  });
});

module.exports = router;
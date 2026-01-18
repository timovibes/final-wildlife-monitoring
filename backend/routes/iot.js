const express = require('express');
const { IoTData, Species } = require('../models');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * IoT Data Management Routes
 * 
 * POST /api/iot/data - Receive IoT sensor data (simulated sensors)
 * GET /api/iot/data - Get all IoT data (All authenticated users)
 * GET /api/iot/data/:sensorId - Get data by sensor ID (All authenticated users)
 * DELETE /api/iot/data/:id - Delete IoT data (Admin only - for testing)
 */

// Receive IoT sensor data (No auth required - simulates external IoT devices)
router.post('/data', async (req, res) => {
  try {
    const {
      sensorId,
      deviceType,
      speciesId,
      latitude,
      longitude,
      temperature,
      motion,
      batteryLevel,
      heartbeat,
      altitude,
      speed,
      metadata
    } = req.body;

    // Validation
    if (!sensorId || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Sensor ID, latitude, and longitude are required.'
      });
    }

    // Verify species exists if provided
    if (speciesId) {
      const species = await Species.findByPk(speciesId);
      if (!species) {
        return res.status(404).json({
          success: false,
          message: 'Species not found.'
        });
      }
    }

    const iotData = await IoTData.create({
      sensorId,
      deviceType: deviceType || 'GPS Collar',
      speciesId: speciesId || null,
      latitude,
      longitude,
      temperature,
      motion,
      batteryLevel,
      heartbeat,
      altitude,
      speed,
      metadata,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'IoT data received successfully.',
      data: { iotData }
    });
  } catch (error) {
    console.error('IoT data ingestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to ingest IoT data.',
      error: error.message
    });
  }
});

// Get all IoT data (All authenticated users)
router.get('/data', authMiddleware, async (req, res) => {
  try {
    const { sensorId, deviceType, speciesId, limit = 100 } = req.query;
    
    const where = {};
    if (sensorId) where.sensorId = sensorId;
    if (deviceType) where.deviceType = deviceType;
    if (speciesId) where.speciesId = speciesId;

    const iotData = await IoTData.findAll({
      where,
      include: [
        {
          model: Species,
          as: 'species',
          attributes: ['id', 'commonName', 'scientificName']
        }
      ],
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      count: iotData.length,
      data: { iotData }
    });
  } catch (error) {
    console.error('Get IoT data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch IoT data.',
      error: error.message
    });
  }
});

// Get data by sensor ID (All authenticated users)
router.get('/data/:sensorId', authMiddleware, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const iotData = await IoTData.findAll({
      where: { sensorId: req.params.sensorId },
      include: [
        {
          model: Species,
          as: 'species',
          attributes: ['id', 'commonName', 'scientificName']
        }
      ],
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      count: iotData.length,
      data: { iotData }
    });
  } catch (error) {
    console.error('Get sensor data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sensor data.',
      error: error.message
    });
  }
});

// Delete IoT data (For testing/cleanup)
router.delete('/data/:id', authMiddleware, async (req, res) => {
  try {
    const iotData = await IoTData.findByPk(req.params.id);

    if (!iotData) {
      return res.status(404).json({
        success: false,
        message: 'IoT data not found.'
      });
    }

    await iotData.destroy();

    res.status(200).json({
      success: true,
      message: 'IoT data deleted successfully.'
    });
  } catch (error) {
    console.error('Delete IoT data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete IoT data.',
      error: error.message
    });
  }
});

module.exports = router;
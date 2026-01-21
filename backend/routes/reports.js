const express = require('express');
const { sequelize, Sighting, Incident, Species, User, IoTData } = require('../models');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * Reports and Analytics Routes
 * 
 * GET /api/reports/dashboard - Get dashboard summary
 * GET /api/reports/species-distribution - Get species distribution data
 * GET /api/reports/incident-trends - Get incident trends over time
 * GET /api/reports/sighting-trends - Get sighting trends over time
 * GET /api/reports/endangered-species - Get endangered species report
 * GET /api/reports/iot-activity - Get IoT sensor activity
 */

// Dashboard summary (All authenticated users)
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    // Get counts
    const [
      totalSpecies,
      totalSightings,
      totalIncidents,
      totalUsers,
      endangeredSpecies,
      sensorCountResult
    ] = await Promise.all([
      Species.count(),
      Sighting.count(),
      Incident.count(),
      User.count(),
      Species.count({ where: { isEndangered: true } }),
      sequelize.query(
        'SELECT COUNT(DISTINCT "sensorId") as count FROM iot_data WHERE "sensorId" IS NOT NULL',
        { type: sequelize.QueryTypes.SELECT }
      )
    ]);

    // Extract the actual count from the query result
    const activeSensors = parseInt(sensorCountResult[0]?.count) || 0;

    // Recent activity
    const recentSightings = await Sighting.findAll({
      limit: 5,
      include: [
        { model: Species, as: 'species', attributes: ['commonName'] },
        { model: User, as: 'observer', attributes: ['firstName', 'lastName'] }
      ],
      order: [['sightingDate', 'DESC']]
    });

    const recentIncidents = await Incident.findAll({
      limit: 5,
      include: [
        { model: Species, as: 'species', attributes: ['commonName'] },
        { model: User, as: 'reporter', attributes: ['firstName', 'lastName'] }
      ],
      order: [['incidentDate', 'DESC']]
    });

    // Incident status breakdown
    const incidentsByStatus = await Incident.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalSpecies,
          totalSightings,
          totalIncidents,
          totalUsers,
          endangeredSpecies,
          activeSensors
        },
        recentActivity: {
          sightings: recentSightings,
          incidents: recentIncidents
        },
        incidentsByStatus
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data.',
      error: error.message
    });
  }
});

// Species distribution (All authenticated users)
router.get('/species-distribution', authMiddleware, async (req, res) => {
  try {
    const distribution = await Species.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['category'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });

    const conservationStatus = await Species.findAll({
      attributes: [
        'conservationStatus',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['conservationStatus']
    });

    res.status(200).json({
      success: true,
      data: {
        byCategory: distribution,
        byConservationStatus: conservationStatus
      }
    });
  } catch (error) {
    console.error('Species distribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch species distribution.',
      error: error.message
    });
  }
});

// Incident trends (All authenticated users)
router.get('/incident-trends', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = `WHERE "incidentDate" BETWEEN '${startDate}' AND '${endDate}'`;
    }

    // Incidents by type
    const byType = await Incident.findAll({
      attributes: [
        'incidentType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['incidentType'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
    });

    // Incidents by severity
    const bySeverity = await Incident.findAll({
      attributes: [
        'severity',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['severity']
    });

    // Incidents over time (monthly)
    const monthlyTrends = await sequelize.query(`
      SELECT 
        DATE_TRUNC('month', "incidentDate") as month,
        COUNT(*) as count
      FROM incidents
      ${dateFilter}
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `, { type: sequelize.QueryTypes.SELECT });

    res.status(200).json({
      success: true,
      data: {
        byType,
        bySeverity,
        monthlyTrends
      }
    });
  } catch (error) {
    console.error('Incident trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incident trends.',
      error: error.message
    });
  }
});

// Sighting trends (All authenticated users)
router.get('/sighting-trends', authMiddleware, async (req, res) => {
  try {
    // Top sighted species
    const topSpecies = await sequelize.query(`
      SELECT 
        s.id,
        s."commonName",
        s."scientificName",
        COUNT(si.id) as "sightingCount",
        SUM(si.count) as "totalAnimals"
      FROM species s
      LEFT JOIN sightings si ON s.id = si."speciesId"
      GROUP BY s.id
      ORDER BY "sightingCount" DESC
      LIMIT 10
    `, { type: sequelize.QueryTypes.SELECT });

    // Sightings over time (monthly)
    const monthlyTrends = await sequelize.query(`
      SELECT 
        DATE_TRUNC('month', "sightingDate") as month,
        COUNT(*) as count,
        SUM(count) as "totalAnimals"
      FROM sightings
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `, { type: sequelize.QueryTypes.SELECT });

    // Most active observers
    const activeObservers = await sequelize.query(`
      SELECT 
        u.id,
        u."firstName",
        u."lastName",
        u.role,
        COUNT(si.id) as "sightingCount"
      FROM users u
      LEFT JOIN sightings si ON u.id = si."observerId"
      GROUP BY u.id
      HAVING COUNT(si.id) > 0
      ORDER BY "sightingCount" DESC
      LIMIT 10
    `, { type: sequelize.QueryTypes.SELECT });

    res.status(200).json({
      success: true,
      data: {
        topSpecies,
        monthlyTrends,
        activeObservers
      }
    });
  } catch (error) {
    console.error('Sighting trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sighting trends.',
      error: error.message
    });
  }
});

// Endangered species report (All authenticated users)
router.get('/endangered-species', authMiddleware, async (req, res) => {
  try {
    const endangeredSpecies = await Species.findAll({
      where: { isEndangered: true },
      include: [
        {
          model: Sighting,
          as: 'sightings',
          attributes: [],
          required: false
        }
      ],
      attributes: [
        'id',
        'commonName',
        'scientificName',
        'category',
        'conservationStatus',
        'population',
        [sequelize.fn('COUNT', sequelize.col('sightings.id')), 'recentSightings']
      ],
      group: ['Species.id'],
      order: [['conservationStatus', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: endangeredSpecies.length,
      data: { species: endangeredSpecies }
    });
  } catch (error) {
    console.error('Endangered species report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch endangered species report.',
      error: error.message
    });
  }
});

// IoT sensor activity (All authenticated users)
router.get('/iot-activity', authMiddleware, async (req, res) => {
  try {
    // Recent IoT data
    const recentData = await IoTData.findAll({
      limit: 50,
      include: [
        {
          model: Species,
          as: 'species',
          attributes: ['commonName', 'scientificName']
        }
      ],
      order: [['timestamp', 'DESC']]
    });

    // Sensor activity summary
    const sensorSummary = await sequelize.query(`
      SELECT 
        "sensorId",
        "deviceType",
        COUNT(*) as "dataPoints",
        MAX(timestamp) as "lastReading",
        AVG("batteryLevel") as "avgBattery"
      FROM iot_data
      GROUP BY "sensorId", "deviceType"
      ORDER BY "lastReading" DESC
    `, { type: sequelize.QueryTypes.SELECT });

    // Activity by device type
    const byDeviceType = await IoTData.findAll({
      attributes: [
        'deviceType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['deviceType']
    });

    res.status(200).json({
      success: true,
      data: {
        recentData,
        sensorSummary,
        byDeviceType
      }
    });
  } catch (error) {
    console.error('IoT activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch IoT activity.',
      error: error.message
    });
  }
});

module.exports = router;
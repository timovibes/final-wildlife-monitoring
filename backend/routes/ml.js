const express = require('express');
const axios = require('axios');
const { sequelize, Species } = require('../models');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
const SEVERITY_WEIGHTS = { Low: 1, Medium: 2, High: 3, Critical: 5 };

const getLast12MonthKeys = () => {
  const keys = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(d.toISOString().slice(0, 7));
  }
  return keys;
};

router.get('/risk-score', authMiddleware, async (req, res) => {
  try {
    const species = await Species.findAll({
      attributes: ['id', 'commonName', 'scientificName', 'conservationStatus'],
      order: [['commonName', 'ASC']],
    });

    if (species.length === 0) {
      return res.status(200).json({ success: true, data: { scores: [] } });
    }

    const monthKeys = getLast12MonthKeys();

    const sightingRows = await sequelize.query(`
      SELECT "speciesId", DATE_TRUNC('month', "sightingDate") as month, COUNT(*) as count
      FROM sightings
      WHERE "sightingDate" >= NOW() - INTERVAL '12 months'
      GROUP BY "speciesId", month
      ORDER BY "speciesId", month ASC
    `, { type: sequelize.QueryTypes.SELECT });

    const incidentRows = await sequelize.query(`
      SELECT "speciesId", severity, COUNT(*) as count
      FROM incidents
      WHERE "speciesId" IS NOT NULL
      GROUP BY "speciesId", severity
    `, { type: sequelize.QueryTypes.SELECT });

    const sightingsBySpecies = {};
    species.forEach((sp) => {
      sightingsBySpecies[sp.id] = monthKeys.reduce((acc, m) => ({ ...acc, [m]: 0 }), {});
    });
    sightingRows.forEach((row) => {
      const monthKey = new Date(row.month).toISOString().slice(0, 7);
      if (sightingsBySpecies[row.speciesId] && monthKey in sightingsBySpecies[row.speciesId]) {
        sightingsBySpecies[row.speciesId][monthKey] = parseInt(row.count, 10);
      }
    });

    const incidentPressureBySpecies = {};
    incidentRows.forEach((row) => {
      const weight = SEVERITY_WEIGHTS[row.severity] || 1;
      incidentPressureBySpecies[row.speciesId] =
        (incidentPressureBySpecies[row.speciesId] || 0) + weight * parseInt(row.count, 10);
    });

    const payload = {
      species: species.map((sp) => ({
        speciesId: sp.id,
        conservationStatus: sp.conservationStatus,
        monthlySightings: monthKeys.map((m) => sightingsBySpecies[sp.id][m]),
        incidentPressure: incidentPressureBySpecies[sp.id] || 0,
      })),
    };

    let mlResponse;
    try {
      mlResponse = await axios.post(`${ML_SERVICE_URL}/risk-score`, payload, { timeout: 25000 });
    } catch (mlError) {
      console.error('ML service call failed:', mlError.message);
      return res.status(503).json({
        success: false,
        message: 'The ML scoring service is not reachable. Make sure it is running (cd ml-service && python app.py).',
      });
    }

    const speciesById = Object.fromEntries(species.map((sp) => [sp.id, sp]));
    const scores = mlResponse.data.data.scores.map((s) => ({
      ...s,
      commonName: speciesById[s.speciesId]?.commonName,
      scientificName: speciesById[s.speciesId]?.scientificName,
      conservationStatus: speciesById[s.speciesId]?.conservationStatus,
    }));

    res.status(200).json({ success: true, data: { scores } });
  } catch (error) {
    console.error('Risk score error:', error);
    res.status(500).json({ success: false, message: 'Failed to compute risk scores.', error: error.message });
  }
});

router.get('/hotspots', authMiddleware, async (req, res) => {
  try {
    const sightingRows = await sequelize.query(
      `
      SELECT si.latitude, si.longitude, sp."commonName"
      FROM sightings si
      JOIN species sp ON sp.id = si."speciesId"
      WHERE si.latitude IS NOT NULL AND si.longitude IS NOT NULL
      `,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (sightingRows.length === 0) {
      return res.status(200).json({ success: true, data: { clusters: [], noiseCount: 0 } });
    }

    const payload = {
      sightings: sightingRows.map((r) => ({
        latitude: parseFloat(r.latitude),
        longitude: parseFloat(r.longitude),
        commonName: r.commonName,
      })),
      eps: 0.003,
      minSamples: 5,
    };

    let mlResponse;
    try {
      mlResponse = await axios.post(`${ML_SERVICE_URL}/cluster-hotspots`, payload, { timeout: 15000 });
    } catch (mlError) {
      console.error('Hotspot clustering call failed:', mlError.message);
      return res.status(503).json({
        success: false,
        message: 'The ML scoring service is not reachable. Make sure it is running (cd ml-service && python app.py).',
      });
    }

    res.status(200).json({ success: true, data: mlResponse.data.data });
  } catch (error) {
    console.error('Hotspot clustering error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compute sighting hotspots.',
      error: error.message,
    });
  }
});

router.get('/anomalies', authMiddleware, async (req, res) => {
  try {
    const weekRows = await sequelize.query(
      `
      SELECT
        DATE_TRUNC('week', "incidentDate") as week,
        COUNT(*) as count,
        SUM(
          CASE severity
            WHEN 'Critical' THEN 5
            WHEN 'High' THEN 3
            WHEN 'Medium' THEN 2
            WHEN 'Low' THEN 1
            ELSE 1
          END
        ) as "severityWeight"
      FROM incidents
      WHERE "incidentDate" >= NOW() - INTERVAL '16 weeks'
      GROUP BY week
      ORDER BY week ASC
      `,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (weekRows.length === 0) {
      return res.status(200).json({ success: true, data: { weeks: [], message: 'No incident data yet.' } });
    }

    const payload = {
      weeks: weekRows.map((w) => {
        const weekStart = new Date(w.week);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        return {
          weekLabel: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          count: parseInt(w.count, 10),
          severityWeight: parseInt(w.severityWeight, 10),
        };
      }),
    };

    let mlResponse;
    try {
      mlResponse = await axios.post(`${ML_SERVICE_URL}/detect-anomalies`, payload, { timeout: 15000 });
    } catch (mlError) {
      console.error('Anomaly detection call failed:', mlError.message);
      return res.status(503).json({
        success: false,
        message: 'The ML scoring service is not reachable. Make sure it is running (cd ml-service && python app.py).',
      });
    }

    res.status(200).json({ success: true, data: mlResponse.data.data });
  } catch (error) {
    console.error('Anomaly detection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect anomalies.',
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/ml/forecast-sightings
//
// Same monthly aggregation approach as reports.js's sighting-trends route,
// but forwarded to Flask's regression forecaster instead of just returning
// the historical numbers.
// ═══════════════════════════════════════════════════════════════════════════
router.get('/forecast-sightings', authMiddleware, async (req, res) => {
  try {
    const monthKeys = getLast12MonthKeys();

    const monthlyRows = await sequelize.query(
      `
      SELECT DATE_TRUNC('month', "sightingDate") as month, COUNT(*) as count
      FROM sightings
      WHERE "sightingDate" >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month ASC
      `,
      { type: sequelize.QueryTypes.SELECT }
    );

    const countsByMonth = monthKeys.reduce((acc, m) => ({ ...acc, [m]: 0 }), {});
    monthlyRows.forEach((row) => {
      const monthKey = new Date(row.month).toISOString().slice(0, 7);
      if (monthKey in countsByMonth) {
        countsByMonth[monthKey] = parseInt(row.count, 10);
      }
    });

    const payload = {
      monthlyCounts: monthKeys.map((m) => countsByMonth[m]),
      periods: 3,
    };

    let mlResponse;
    try {
      mlResponse = await axios.post(`${ML_SERVICE_URL}/forecast-trend`, payload, { timeout: 15000 });
    } catch (mlError) {
      console.error('Forecast call failed:', mlError.message);
      return res.status(503).json({
        success: false,
        message: 'The ML scoring service is not reachable. Make sure it is running (cd ml-service && python app.py).',
      });
    }

    // Build future month labels (e.g. "Sep 26") to pair with Flask's numbers
    const now = new Date();
    const projected = (mlResponse.data.data.projected || []).map((p) => {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + p.monthsAhead, 1);
      return {
        ...p,
        month: futureDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      };
    });

    res.status(200).json({
      success: true,
      data: {
        ...mlResponse.data.data,
        projected,
      },
    });
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ success: false, message: 'Failed to compute forecast.', error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/ml/species-cooccurrence
//
// Buckets sightings by calendar day, gets the distinct species seen each
// day, and sends that to Flask to compute pairwise "lift" scores — see
// app.py for the full explanation of why lift instead of a raw count.
// ═══════════════════════════════════════════════════════════════════════════
router.get('/species-cooccurrence', authMiddleware, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `
      SELECT DISTINCT DATE(si."sightingDate") as day, sp."commonName"
      FROM sightings si
      JOIN species sp ON sp.id = si."speciesId"
      `,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (rows.length === 0) {
      return res.status(200).json({ success: true, data: { pairs: [], totalDays: 0 } });
    }

    // Group into { 'YYYY-MM-DD': [speciesName, speciesName, ...] }
    const speciesByDay = {};
    rows.forEach((row) => {
      const dayKey = new Date(row.day).toISOString().slice(0, 10);
      if (!speciesByDay[dayKey]) speciesByDay[dayKey] = [];
      speciesByDay[dayKey].push(row.commonName);
    });

    const payload = {
      dailySpeciesLists: Object.values(speciesByDay),
      minCoOccurrences: 3,
    };

    let mlResponse;
    try {
      mlResponse = await axios.post(`${ML_SERVICE_URL}/species-cooccurrence`, payload, { timeout: 15000 });
    } catch (mlError) {
      console.error('Co-occurrence call failed:', mlError.message);
      return res.status(503).json({
        success: false,
        message: 'The ML scoring service is not reachable. Make sure it is running (cd ml-service && python app.py).',
      });
    }

    res.status(200).json({ success: true, data: mlResponse.data.data });
  } catch (error) {
    console.error('Co-occurrence error:', error);
    res.status(500).json({ success: false, message: 'Failed to compute species co-occurrence.', error: error.message });
  }
});

module.exports = router;
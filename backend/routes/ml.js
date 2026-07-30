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

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/ml/hotspots — see ml-service/app.py for the clustering explanation
// ═══════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/ml/anomalies
//
// Buckets incidents into weeks (last ~16 weeks), computes a severity-
// weighted score per week, and sends both to Flask's Isolation Forest
// route to flag weeks that look statistically unusual. See app.py for the
// full explanation of why Isolation Forest was chosen.
// ═══════════════════════════════════════════════════════════════════════════
router.get('/anomalies', authMiddleware, async (req, res) => {
  try {
    // Bucket by week, count incidents, and sum a severity weight per week
    // in a single query — Postgres computes the weight inline via CASE.
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
      weeks: weekRows.map((w) => ({
        weekLabel: new Date(w.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: parseInt(w.count, 10),
        severityWeight: parseInt(w.severityWeight, 10),
      })),
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

module.exports = router;
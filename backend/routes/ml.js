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
// GET /api/ml/hotspots
//
// Pulls every sighting's coordinates + species name from Postgres and sends
// them to the Flask ML service to be grouped into hotspots via DBSCAN
// clustering. Same division of labor as /risk-score: this route owns the
// data (Postgres), Flask owns the math (the actual clustering algorithm).
// ═══════════════════════════════════════════════════════════════════════════
router.get('/hotspots', authMiddleware, async (req, res) => {
  try {
    // Raw join so we get the species' common name alongside each sighting's
    // coordinates in a single query, instead of fetching sightings and
    // species separately and joining them in JS.
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
      // eps/minSamples left at the Flask service's defaults for now.
      // Could be exposed as query params later to let a researcher tune
      // "how tight a hotspot needs to be" directly from the UI.
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

module.exports = router;
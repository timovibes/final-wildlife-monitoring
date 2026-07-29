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
      mlResponse = await axios.post(`${ML_SERVICE_URL}/risk-score`, payload, { timeout: 8000 });
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

module.exports = router;
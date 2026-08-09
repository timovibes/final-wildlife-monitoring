const express = require('express');
const axios = require('axios');
const { sequelize, Species, User } = require('../models');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

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
      data: { ...mlResponse.data.data, projected },
    });
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ success: false, message: 'Failed to compute forecast.', error: error.message });
  }
});

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

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/ml/verification-priority — Admin only
//
// For every PENDING sighting, gathers the four signals Flask's weighted
// scorer needs: species rarity (from the species record itself), distance
// from that species' historically VERIFIED sighting locations, deviation
// from that species' historical average count, and the reporting ranger's
// historical verification rate. See app.py for why this is a transparent
// weighted composite rather than a black-box model.
// ═══════════════════════════════════════════════════════════════════════════
router.get('/verification-priority', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const pendingSightings = await sequelize.query(
      `
      SELECT si.id, si.count, si.latitude, si.longitude, si."speciesId", si."observerId",
             sp."commonName", sp."conservationStatus",
             u."firstName", u."lastName"
      FROM sightings si
      JOIN species sp ON sp.id = si."speciesId"
      JOIN users u ON u.id = si."observerId"
      WHERE si.verified = false
      `,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (pendingSightings.length === 0) {
      return res.status(200).json({ success: true, data: { scores: [] } });
    }

    // Historical stats per species, built ONLY from already-verified
    // sightings, so unverified noise doesn't contaminate the "normal"
    // baseline we're comparing pending sightings against.
    const speciesStatsRows = await sequelize.query(
      `
      SELECT "speciesId",
             AVG(count) as "avgCount",
             AVG(latitude) as "avgLat",
             AVG(longitude) as "avgLng"
      FROM sightings
      WHERE verified = true
      GROUP BY "speciesId"
      `,
      { type: sequelize.QueryTypes.SELECT }
    );
    const speciesStats = Object.fromEntries(speciesStatsRows.map((r) => [r.speciesId, r]));

    // Reporter verification rate: verified sightings / total sightings,
    // per observer, again only counting their OTHER sightings (not the
    // pending one itself, which obviously isn't verified yet).
    const reporterStatsRows = await sequelize.query(
      `
      SELECT "observerId",
             COUNT(*) FILTER (WHERE verified = true)::float / NULLIF(COUNT(*), 0) as "verificationRate"
      FROM sightings
      GROUP BY "observerId"
      `,
      { type: sequelize.QueryTypes.SELECT }
    );
    const reporterStats = Object.fromEntries(reporterStatsRows.map((r) => [r.observerId, r.verificationRate]));

    // Haversine-lite distance in km — accurate enough at park scale, avoids
    // pulling in an extra dependency for a single distance calculation.
    const distanceKm = (lat1, lng1, lat2, lng2) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const payload = {
      sightings: pendingSightings.map((s) => {
        const stats = speciesStats[s.speciesId];
        const distanceFromSpeciesCentroidKm = stats
          ? distanceKm(parseFloat(s.latitude), parseFloat(s.longitude), parseFloat(stats.avgLat), parseFloat(stats.avgLng))
          : null;

        return {
          sightingId: s.id,
          count: s.count,
          conservationStatus: s.conservationStatus,
          speciesHistoricalAvgCount: stats ? parseFloat(stats.avgCount) : null,
          distanceFromSpeciesCentroidKm,
          reporterVerificationRate:
            reporterStats[s.observerId] != null ? parseFloat(reporterStats[s.observerId]) : null,
        };
      }),
    };

    let mlResponse;
    try {
      mlResponse = await axios.post(`${ML_SERVICE_URL}/score-verification-priority`, payload, { timeout: 15000 });
    } catch (mlError) {
      console.error('Verification priority call failed:', mlError.message);
      return res.status(503).json({
        success: false,
        message: 'The ML scoring service is not reachable. Make sure it is running (cd ml-service && python app.py).',
      });
    }

    // Merge display info (species name, reporter name) back onto scores
    const sightingById = Object.fromEntries(pendingSightings.map((s) => [s.id, s]));
    const scores = mlResponse.data.data.scores.map((score) => {
      const s = sightingById[score.sightingId];
      return {
        ...score,
        commonName: s.commonName,
        reporterName: `${s.firstName} ${s.lastName}`,
        count: s.count,
      };
    });

    res.status(200).json({ success: true, data: { scores } });
  } catch (error) {
    console.error('Verification priority error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compute verification priority.',
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/ml/user-activity-anomalies — Admin only
//
// Gathers each ranger/researcher's weekly sighting-submission counts over
// the last 8 weeks, sends them to Flask for per-user z-score analysis
// (each person compared only to their OWN history — see app.py for why).
// ═══════════════════════════════════════════════════════════════════════════
router.get('/user-activity-anomalies', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const users = await User.findAll({
      where: { role: ['ranger', 'researcher'] },
      attributes: ['id', 'firstName', 'lastName', 'role'],
    });

    if (users.length === 0) {
      return res.status(200).json({ success: true, data: { users: [] } });
    }

    const weeklyRows = await sequelize.query(
      `
      SELECT "observerId", DATE_TRUNC('week', "sightingDate") as week, COUNT(*) as count
      FROM sightings
      WHERE "sightingDate" >= NOW() - INTERVAL '8 weeks'
      GROUP BY "observerId", week
      ORDER BY "observerId", week ASC
      `,
      { type: sequelize.QueryTypes.SELECT }
    );

    // Build the last 8 week keys so every user gets a zero-filled series,
    // same zero-fill pattern as the risk score's monthly sightings.
    const weekKeys = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      weekKeys.push(d.toISOString().slice(0, 10));
    }

    const countsByUser = {};
    users.forEach((u) => {
      countsByUser[u.id] = weekKeys.reduce((acc, w) => ({ ...acc, [w]: 0 }), {});
    });
    weeklyRows.forEach((row) => {
      // Match each row's week to the nearest week bucket — good enough at
      // week granularity for this purpose.
      const rowWeek = new Date(row.week).toISOString().slice(0, 10);
      const closest = weekKeys.reduce((best, w) =>
        Math.abs(new Date(w) - new Date(rowWeek)) < Math.abs(new Date(best) - new Date(rowWeek)) ? w : best
      );
      if (countsByUser[row.observerId]) {
        countsByUser[row.observerId][closest] += parseInt(row.count, 10);
      }
    });

    const payload = {
      users: users.map((u) => ({
        userId: u.id,
        weeklyCounts: weekKeys.map((w) => countsByUser[u.id][w]),
      })),
    };

    let mlResponse;
    try {
      mlResponse = await axios.post(`${ML_SERVICE_URL}/detect-user-activity-anomalies`, payload, { timeout: 15000 });
    } catch (mlError) {
      console.error('User activity anomaly call failed:', mlError.message);
      return res.status(503).json({
        success: false,
        message: 'The ML scoring service is not reachable. Make sure it is running (cd ml-service && python app.py).',
      });
    }

    const usersById = Object.fromEntries(users.map((u) => [u.id, u]));
    const results = mlResponse.data.data.users.map((r) => ({
      ...r,
      name: `${usersById[r.userId]?.firstName} ${usersById[r.userId]?.lastName}`,
      role: usersById[r.userId]?.role,
    }));

    res.status(200).json({ success: true, data: { users: results } });
  } catch (error) {
    console.error('User activity anomaly error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect user activity anomalies.',
      error: error.message,
    });
  }
});

module.exports = router;
const request = require('supertest');
const app = require('../server');
const {
  sequelize,
  User,
  Species,
  Sighting,
  Incident,
  IoTData,
  syncDatabase
} = require('../models');

/**
 * Reports Endpoint Tests
 *
 * Seeds a small, known dataset (one species, one sighting, one incident,
 * one IoT reading) so aggregate endpoints can be asserted on shape and
 * on the presence of the seeded records, without depending on whatever
 * else happens to be in the database.
 */

let rangerToken;
let observerId;
let seededSpeciesId;
let seededSightingId;
let seededIncidentId;

const rangerEmail = 'reportsranger@wildlife.com';
const scientificName = 'Panthera pardus reports';

beforeAll(async () => {
  await syncDatabase();

  await User.destroy({ where: { email: rangerEmail }, force: true });
  await Species.destroy({ where: { scientificName }, force: true });

  const ranger = await User.create({
    firstName: 'Reports',
    lastName: 'Ranger',
    email: rangerEmail,
    password: 'RangerPass123!',
    role: 'ranger',
    isActive: true
  });
  observerId = ranger.id;

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: rangerEmail, password: 'RangerPass123!' });
  rangerToken = login.body.data.token;

  const species = await Species.create({
    commonName: 'Leopard (reports)',
    scientificName,
    category: 'Mammal',
    conservationStatus: 'VU'
  });
  seededSpeciesId = species.id;

  const sighting = await Sighting.create({
    speciesId: seededSpeciesId,
    observerId,
    latitude: -1.36,
    longitude: 36.85,
    count: 2,
    sightingDate: new Date()
  });
  seededSightingId = sighting.id;

  const incident = await Incident.create({
    speciesId: seededSpeciesId,
    reporterId: observerId,
    incidentType: 'poaching',
    severity: 'high',
    status: 'open',
    latitude: -1.36,
    longitude: 36.85,
    incidentDate: new Date(),
    description: 'Seeded incident for reports tests'
  });
  seededIncidentId = incident.id;

  await IoTData.create({
    sensorId: 'REPORTS-SENSOR-001',
    deviceType: 'GPS Collar',
    speciesId: seededSpeciesId,
    latitude: -1.36,
    longitude: 36.85,
    batteryLevel: 90,
    timestamp: new Date()
  });
});

afterAll(async () => {
  await IoTData.destroy({ where: { sensorId: 'REPORTS-SENSOR-001' }, force: true });
  await Incident.destroy({ where: { id: seededIncidentId }, force: true });
  await Sighting.destroy({ where: { id: seededSightingId }, force: true });
  await Species.destroy({ where: { scientificName }, force: true });
  await User.destroy({ where: { email: rangerEmail }, force: true });
  await sequelize.close();
});

describe('GET /api/reports/dashboard', () => {
  it('rejects requests without an auth token', async () => {
    const res = await request(app).get('/api/reports/dashboard');
    expect(res.statusCode).toBe(401);
  });

  it('returns summary counts that include the seeded records', async () => {
    const res = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${rangerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    const { summary } = res.body.data;
    expect(summary.totalSpecies).toBeGreaterThanOrEqual(1);
    expect(summary.totalSightings).toBeGreaterThanOrEqual(1);
    expect(summary.totalIncidents).toBeGreaterThanOrEqual(1);
    expect(summary.activeSensors).toBeGreaterThanOrEqual(1);
  });

  it('includes recent activity and an incident status breakdown', async () => {
    const res = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${rangerToken}`);

    expect(Array.isArray(res.body.data.recentActivity.sightings)).toBe(true);
    expect(Array.isArray(res.body.data.recentActivity.incidents)).toBe(true);
    expect(Array.isArray(res.body.data.incidentsByStatus)).toBe(true);
  });
});

describe('GET /api/reports/species-distribution', () => {
  it('rejects requests without an auth token', async () => {
    const res = await request(app).get('/api/reports/species-distribution');
    expect(res.statusCode).toBe(401);
  });

  it('groups species by category and conservation status', async () => {
    const res = await request(app)
      .get('/api/reports/species-distribution')
      .set('Authorization', `Bearer ${rangerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.byCategory)).toBe(true);
    expect(Array.isArray(res.body.data.byConservationStatus)).toBe(true);
    expect(
      res.body.data.byCategory.some((c) => c.category === 'Mammal')
    ).toBe(true);
  });
});

describe('GET /api/reports/incident-trends', () => {
  it('rejects requests without an auth token', async () => {
    const res = await request(app).get('/api/reports/incident-trends');
    expect(res.statusCode).toBe(401);
  });

  it('returns breakdowns by type, severity, and month', async () => {
    const res = await request(app)
      .get('/api/reports/incident-trends')
      .set('Authorization', `Bearer ${rangerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.byType)).toBe(true);
    expect(Array.isArray(res.body.data.bySeverity)).toBe(true);
    expect(Array.isArray(res.body.data.monthlyTrends)).toBe(true);
  });

  it('accepts a startDate/endDate range filter', async () => {
    const startDate = '2000-01-01';
    const endDate = '2999-01-01';

    const res = await request(app)
      .get('/api/reports/incident-trends')
      .query({ startDate, endDate })
      .set('Authorization', `Bearer ${rangerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.monthlyTrends)).toBe(true);
  });
});

describe('GET /api/reports/sighting-trends', () => {
  it('rejects requests without an auth token', async () => {
    const res = await request(app).get('/api/reports/sighting-trends');
    expect(res.statusCode).toBe(401);
  });

  it('returns top species, monthly trends, and active observers', async () => {
    const res = await request(app)
      .get('/api/reports/sighting-trends')
      .set('Authorization', `Bearer ${rangerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.topSpecies)).toBe(true);
    expect(Array.isArray(res.body.data.monthlyTrends)).toBe(true);
    expect(Array.isArray(res.body.data.activeObservers)).toBe(true);
    expect(
      res.body.data.activeObservers.some((o) => o.id === observerId)
    ).toBe(true);
  });
});

describe('GET /api/reports/endangered-species', () => {
  it('rejects requests without an auth token', async () => {
    const res = await request(app).get('/api/reports/endangered-species');
    expect(res.statusCode).toBe(401);
  });

  it('only returns species with EN, CR, or EW status', async () => {
    const res = await request(app)
      .get('/api/reports/endangered-species')
      .set('Authorization', `Bearer ${rangerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    const statuses = res.body.data.species.map((s) => s.conservationStatus);
    expect(statuses.every((s) => ['EN', 'CR', 'EW'].includes(s))).toBe(true);
    // The seeded species is VU, so it should NOT show up here
    expect(res.body.data.species.some((s) => s.id === seededSpeciesId)).toBe(false);
  });
});

describe('GET /api/reports/iot-activity', () => {
  it('rejects requests without an auth token', async () => {
    const res = await request(app).get('/api/reports/iot-activity');
    expect(res.statusCode).toBe(401);
  });

  it('returns recent data, sensor summary, and device-type breakdown', async () => {
    const res = await request(app)
      .get('/api/reports/iot-activity')
      .set('Authorization', `Bearer ${rangerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.recentData)).toBe(true);
    expect(Array.isArray(res.body.data.sensorSummary)).toBe(true);
    expect(Array.isArray(res.body.data.byDeviceType)).toBe(true);
    expect(
      res.body.data.sensorSummary.some((s) => s.sensorId === 'REPORTS-SENSOR-001')
    ).toBe(true);
  });
});
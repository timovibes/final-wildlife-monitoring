const request = require('supertest');
const app = require('../server');
const { sequelize, User, Species, IoTData, syncDatabase } = require('../models');

/**
 * IoT Endpoint Tests
 *
 * Covers unauthenticated ingestion, validation, species linkage,
 * auth-gated reads/deletes, and query filtering.
 */

let rangerToken;
let adminToken;
let seededSpeciesId;
let seededIoTId;

const rangerEmail = 'iotranger@wildlife.com';
const adminEmail = 'iotadmin@wildlife.com';
const testSensorId = 'TEST-SENSOR-001';

beforeAll(async () => {
  await syncDatabase();

  await User.destroy({ where: { email: [rangerEmail, adminEmail] }, force: true });
  await Species.destroy({ where: { scientificName: 'Loxodonta africana' }, force: true });
  await IoTData.destroy({ where: { sensorId: testSensorId }, force: true });

  await User.create({
    firstName: 'Iot',
    lastName: 'Ranger',
    email: rangerEmail,
    password: 'RangerPass123!',
    role: 'ranger',
    isActive: true
  });

  await User.create({
    firstName: 'Iot',
    lastName: 'Admin',
    email: adminEmail,
    password: 'AdminPass123!',
    role: 'admin',
    isActive: true
  });

  const rangerLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: rangerEmail, password: 'RangerPass123!' });
  rangerToken = rangerLogin.body.data.token;

  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: adminEmail, password: 'AdminPass123!' });
  adminToken = adminLogin.body.data.token;

  const species = await Species.create({
    commonName: 'African Elephant',
    scientificName: 'Loxodonta africana',
    category: 'Mammal',
    conservationStatus: 'EN'
  });
  seededSpeciesId = species.id;

  const seeded = await IoTData.create({
    sensorId: testSensorId,
    deviceType: 'GPS Collar',
    speciesId: seededSpeciesId,
    latitude: -1.3667,
    longitude: 36.8333,
    batteryLevel: 87,
    timestamp: new Date()
  });
  seededIoTId = seeded.id;
});

afterAll(async () => {
  await IoTData.destroy({ where: { sensorId: testSensorId }, force: true });
  await Species.destroy({ where: { scientificName: 'Loxodonta africana' }, force: true });
  await User.destroy({ where: { email: [rangerEmail, adminEmail] }, force: true });
  await sequelize.close();
});

describe('POST /api/iot/data', () => {
  it('accepts a reading with no auth token (public ingestion endpoint)', async () => {
    const res = await request(app)
      .post('/api/iot/data')
      .send({
        sensorId: testSensorId,
        deviceType: 'GPS Collar',
        speciesId: seededSpeciesId,
        latitude: -1.37,
        longitude: 36.84,
        batteryLevel: 74
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.iotData.sensorId).toBe(testSensorId);
  });

  it('defaults deviceType to "GPS Collar" when omitted', async () => {
    const res = await request(app)
      .post('/api/iot/data')
      .send({
        sensorId: testSensorId,
        latitude: -1.37,
        longitude: 36.84
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.iotData.deviceType).toBe('GPS Collar');
  });

  it('rejects a payload missing sensorId', async () => {
    const res = await request(app)
      .post('/api/iot/data')
      .send({ latitude: -1.37, longitude: 36.84 });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects a payload missing latitude', async () => {
    const res = await request(app)
      .post('/api/iot/data')
      .send({ sensorId: testSensorId, longitude: 36.84 });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects a payload missing longitude', async () => {
    const res = await request(app)
      .post('/api/iot/data')
      .send({ sensorId: testSensorId, latitude: -1.37 });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects a reading with a non-existent speciesId', async () => {
    const res = await request(app)
      .post('/api/iot/data')
      .send({
        sensorId: testSensorId,
        speciesId: '00000000-0000-0000-0000-000000000000',
        latitude: -1.37,
        longitude: 36.84
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/iot/data', () => {
  it('rejects requests without an auth token', async () => {
    const res = await request(app).get('/api/iot/data');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns IoT data for an authenticated ranger', async () => {
    const res = await request(app)
      .get('/api/iot/data')
      .set('Authorization', `Bearer ${rangerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.iotData)).toBe(true);
    expect(res.body.data.iotData.some((d) => d.id === seededIoTId)).toBe(true);
  });

  it('filters results by sensorId query param', async () => {
    const res = await request(app)
      .get('/api/iot/data')
      .query({ sensorId: testSensorId })
      .set('Authorization', `Bearer ${rangerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.iotData.every((d) => d.sensorId === testSensorId)).toBe(true);
  });

  it('filters results by deviceType query param', async () => {
    const res = await request(app)
      .get('/api/iot/data')
      .query({ deviceType: 'GPS Collar' })
      .set('Authorization', `Bearer ${rangerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.iotData.every((d) => d.deviceType === 'GPS Collar')).toBe(true);
  });

  it('respects the limit query param', async () => {
    const res = await request(app)
      .get('/api/iot/data')
      .query({ limit: 1 })
      .set('Authorization', `Bearer ${rangerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.iotData.length).toBeLessThanOrEqual(1);
  });

  it('includes species details when a reading is linked to a species', async () => {
    const res = await request(app)
      .get('/api/iot/data')
      .query({ sensorId: testSensorId })
      .set('Authorization', `Bearer ${rangerToken}`);

    const linked = res.body.data.iotData.find((d) => d.id === seededIoTId);
    expect(linked.species).toBeDefined();
    expect(linked.species.commonName).toBe('African Elephant');
  });
});

describe('GET /api/iot/data/:sensorId', () => {
  it('rejects requests without an auth token', async () => {
    const res = await request(app).get(`/api/iot/data/${testSensorId}`);
    expect(res.statusCode).toBe(401);
  });

  it('returns only readings for the given sensor', async () => {
    const res = await request(app)
      .get(`/api/iot/data/${testSensorId}`)
      .set('Authorization', `Bearer ${rangerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.iotData.every((d) => d.sensorId === testSensorId)).toBe(true);
  });

  it('returns an empty array for a sensor with no data', async () => {
    const res = await request(app)
      .get('/api/iot/data/NO-SUCH-SENSOR')
      .set('Authorization', `Bearer ${rangerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(0);
    expect(res.body.data.iotData).toEqual([]);
  });
});

describe('DELETE /api/iot/data/:id', () => {
  it('rejects requests without an auth token', async () => {
    const res = await request(app).delete(`/api/iot/data/${seededIoTId}`);
    expect(res.statusCode).toBe(401);
  });

  it('returns 404 for a non-existent record', async () => {
    const res = await request(app)
      .delete('/api/iot/data/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('deletes an existing record for an authenticated user', async () => {
    const res = await request(app)
      .delete(`/api/iot/data/${seededIoTId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await IoTData.findByPk(seededIoTId);
    expect(check).toBeNull();
  });
});
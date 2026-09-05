const request = require('supertest');
const app = require('../server');
const { sequelize, User, Species, Sighting, syncDatabase } = require('../models');

/**
 * Sightings Endpoint Tests
 *
 * Covers creation by a ranger, coordinate validation, and access control
 * for unauthenticated requests.
 */

let rangerToken;
let speciesId;

const rangerEmail = 'sightingsranger@wildlife.com';
const scientificName = 'Loxodonta africana';

beforeAll(async () => {
  await syncDatabase();

  await User.destroy({ where: { email: rangerEmail }, force: true });
  await Species.destroy({ where: { scientificName }, force: true });

  await User.create({
    firstName: 'Sightings',
    lastName: 'Ranger',
    email: rangerEmail,
    password: 'RangerPass123!',
    role: 'ranger',
    isActive: true
  });

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: rangerEmail, password: 'RangerPass123!' });
  rangerToken = login.body.data.token;

  const species = await Species.create({
    commonName: 'African Elephant',
    scientificName,
    category: 'Mammal',
    conservationStatus: 'EN'
  });
  speciesId = species.id;
});

afterAll(async () => {
  await Sighting.destroy({ where: { speciesId }, force: true });
  await Species.destroy({ where: { scientificName }, force: true });
  await User.destroy({ where: { email: rangerEmail }, force: true });
  await sequelize.close();
});

describe('POST /api/sightings', () => {
  it('rejects requests without an auth token', async () => {
    const res = await request(app)
      .post('/api/sightings')
      .send({
        speciesId,
        count: 3,
        latitude: -1.2921,
        longitude: 36.8219
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('creates a sighting with valid data', async () => {
    const res = await request(app)
      .post('/api/sightings')
      .set('Authorization', `Bearer ${rangerToken}`)
      .send({
        speciesId,
        count: 4,
        latitude: -1.2921,
        longitude: 36.8219,
        location: 'Nairobi National Park',
        behavior: 'feeding'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sighting.speciesId).toBe(speciesId);
    expect(res.body.data.sighting.count).toBe(4);
  });

  it('rejects a sighting with an out-of-range latitude', async () => {
    const res = await request(app)
      .post('/api/sightings')
      .set('Authorization', `Bearer ${rangerToken}`)
      .send({
        speciesId,
        count: 1,
        latitude: 200, // invalid: must be between -90 and 90
        longitude: 36.8219
      });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/sightings', () => {
  it('returns sightings for an authenticated user, filterable by speciesId', async () => {
    const res = await request(app)
      .get('/api/sightings')
      .query({ speciesId })
      .set('Authorization', `Bearer ${rangerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.sightings)).toBe(true);
    expect(res.body.data.sightings.every((s) => s.speciesId === speciesId)).toBe(true);
  });
});
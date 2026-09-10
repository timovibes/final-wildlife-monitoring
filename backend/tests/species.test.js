const request = require('supertest');
const app = require('../server');
const { sequelize, User, Species, syncDatabase } = require('../models');

/**
 * Species Endpoint Tests
 *
 * Covers read access for any authenticated role, write access restricted
 * to admins, and duplicate scientific-name protection.
 */

let adminToken;
let rangerToken;
let seededSpeciesId;

const adminEmail = 'speciesadmin@wildlife.com';
const rangerEmail = 'speciesranger@wildlife.com';

beforeAll(async () => {
  await syncDatabase();

  await User.destroy({ where: { email: [adminEmail, rangerEmail] }, force: true });
  await Species.destroy({ where: { scientificName: ['Panthera leo', 'Panthera pardus'] }, force: true });

  await User.create({
    firstName: 'Species',
    lastName: 'Admin',
    email: adminEmail,
    password: 'AdminPass123!',
    role: 'admin',
    isActive: true
  });

  await User.create({
    firstName: 'Species',
    lastName: 'Ranger',
    email: rangerEmail,
    password: 'RangerPass123!',
    role: 'ranger',
    isActive: true
  });

  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: adminEmail, password: 'AdminPass123!' });
  adminToken = adminLogin.body.data.token;

  const rangerLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: rangerEmail, password: 'RangerPass123!' });
  rangerToken = rangerLogin.body.data.token;

  const seeded = await Species.create({
    commonName: 'Lion',
    scientificName: 'Panthera leo',
    category: 'Mammal',
    conservationStatus: 'VU'
  });
  seededSpeciesId = seeded.id;
});

afterAll(async () => {
  await Species.destroy({ where: { scientificName: ['Panthera leo', 'Panthera pardus'] }, force: true });
  await User.destroy({ where: { email: [adminEmail, rangerEmail] }, force: true });
  await sequelize.close();
});

describe('GET /api/species', () => {
  it('rejects requests without an auth token', async () => {
    const res = await request(app).get('/api/species');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns species list for an authenticated ranger', async () => {
    const res = await request(app)
      .get('/api/species')
      .set('Authorization', `Bearer ${rangerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.species)).toBe(true);
    expect(res.body.data.species.some((s) => s.id === seededSpeciesId)).toBe(true);
  });
});

describe('POST /api/species', () => {
  it('allows an admin to create a species', async () => {
    const res = await request(app)
      .post('/api/species')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        commonName: 'Leopard',
        scientificName: 'Panthera pardus',
        category: 'Mammal',
        conservationStatus: 'VU'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.species.scientificName).toBe('Panthera pardus');
    // EN/CR/EW should flip isEndangered, VU should not
    expect(res.body.data.species.isEndangered).toBe(false);
  });

  it('rejects creation from a non-admin role', async () => {
    const res = await request(app)
      .post('/api/species')
      .set('Authorization', `Bearer ${rangerToken}`)
      .send({
        commonName: 'Cheetah',
        scientificName: 'Acinonyx jubatus',
        category: 'Mammal'
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('rejects a duplicate scientific name', async () => {
    const res = await request(app)
      .post('/api/species')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        commonName: 'Lion (duplicate)',
        scientificName: 'Panthera leo',
        category: 'Mammal'
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/species/:id', () => {
  it('returns 404 for a non-existent species id', async () => {
    const res = await request(app)
      .get('/api/species/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${rangerToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
const request = require('supertest');
const app = require('../server');
const { sequelize, User, Incident, syncDatabase } = require('../models');

/**
 * Incidents Endpoint Tests
 *
 * Covers role-based creation (ranger/admin can report, researcher cannot),
 * required-field validation, and read access.
 */

let rangerToken;
let researcherToken;

const rangerEmail = 'incidentsranger@wildlife.com';
const researcherEmail = 'incidentsresearcher@wildlife.com';

let createdIncidentId;

beforeAll(async () => {
  await syncDatabase();

  await User.destroy({ where: { email: [rangerEmail, researcherEmail] }, force: true });

  await User.create({
    firstName: 'Incidents',
    lastName: 'Ranger',
    email: rangerEmail,
    password: 'RangerPass123!',
    role: 'ranger',
    isActive: true
  });

  await User.create({
    firstName: 'Incidents',
    lastName: 'Researcher',
    email: researcherEmail,
    password: 'ResearchPass123!',
    role: 'researcher',
    isActive: true
  });

  const rangerLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: rangerEmail, password: 'RangerPass123!' });
  rangerToken = rangerLogin.body.data.token;

  const researcherLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: researcherEmail, password: 'ResearchPass123!' });
  researcherToken = researcherLogin.body.data.token;
});

afterAll(async () => {
  if (createdIncidentId) {
    await Incident.destroy({ where: { id: createdIncidentId }, force: true });
  }
  await User.destroy({ where: { email: [rangerEmail, researcherEmail] }, force: true });
  await sequelize.close();
});

describe('POST /api/incidents', () => {
  it('allows a ranger to report an incident', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${rangerToken}`)
      .send({
        incidentType: 'Poaching',
        severity: 'High',
        description: 'Snare traps found near the northern watering hole.',
        latitude: -1.4,
        longitude: 36.9
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.incident.incidentType).toBe('Poaching');
    expect(res.body.data.incident.status).toBe('Reported');
    createdIncidentId = res.body.data.incident.id;
  });

  it('rejects incident creation from a researcher (read-only role)', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${researcherToken}`)
      .send({
        incidentType: 'Injury',
        severity: 'Low',
        description: 'A juvenile antelope was found with a leg injury.',
        latitude: -1.4,
        longitude: 36.9
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('rejects an incident missing required fields', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${rangerToken}`)
      .send({
        severity: 'Medium'
        // incidentType, description, latitude, longitude all missing
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/incidents', () => {
  it('allows a researcher to view incidents (read-only access)', async () => {
    const res = await request(app)
      .get('/api/incidents')
      .set('Authorization', `Bearer ${researcherToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.incidents)).toBe(true);
  });
});
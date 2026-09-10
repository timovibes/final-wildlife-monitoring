const request = require('supertest');
const app = require('../server');
const { sequelize, User, syncDatabase } = require('../models');

/**
 * Auth Endpoint Tests
 *
 * Runs against the isolated wildlife_test database (see .env.test).
 * Tables are rebuilt fresh before this file runs, and the test user
 * is removed afterward so runs stay repeatable.
 */

beforeAll(async () => {
  await syncDatabase(); // creates tables in wildlife_test if they don't exist

  // Clean slate for this specific test's data
  await User.destroy({ where: { email: 'testuser@wildlife.com' }, force: true });

  // Create a known user to log in against
  await User.create({
    firstName: 'Test',
    lastName: 'User',
    email: 'testuser@wildlife.com',
    password: 'TestPass123!', // hashed automatically by the model's beforeCreate hook
    role: 'ranger',
    isActive: true
  });
});

afterAll(async () => {
  await User.destroy({ where: { email: 'testuser@wildlife.com' }, force: true });
  await sequelize.close(); // closes the DB connection so Jest can exit cleanly
});

describe('POST /api/auth/login', () => {
  it('logs in successfully with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testuser@wildlife.com', password: 'TestPass123!' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('testuser@wildlife.com');
  });

  it('rejects an incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testuser@wildlife.com', password: 'WrongPassword' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects a login for an email that does not exist', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@wildlife.com', password: 'TestPass123!' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
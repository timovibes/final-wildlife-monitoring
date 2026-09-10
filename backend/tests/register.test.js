const request = require('supertest');
const app = require('../server');
const { sequelize, User, syncDatabase } = require('../models');

/**
 * Registration Endpoint Tests
 *
 * Runs against the isolated wildlife_test database (see .env.test).
 */

const newUserEmail = 'newranger@wildlife.com';
const existingUserEmail = 'existing@wildlife.com';

beforeAll(async () => {
  await syncDatabase();

  await User.destroy({ where: { email: [newUserEmail, existingUserEmail] }, force: true });

  // Seed a user so we can test the duplicate-email path
  await User.create({
    firstName: 'Existing',
    lastName: 'User',
    email: existingUserEmail,
    password: 'TestPass123!',
    role: 'ranger',
    isActive: true
  });
});

afterAll(async () => {
  await User.destroy({ where: { email: [newUserEmail, existingUserEmail] }, force: true });
  await sequelize.close();
});

describe('POST /api/auth/register', () => {
  it('registers a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'New',
        lastName: 'Ranger',
        email: newUserEmail,
        password: 'StrongPass123!'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(newUserEmail);
    // Defaults to 'ranger' when no role is supplied
    expect(res.body.data.user.role).toBe('ranger');
    // Password must never be echoed back
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('rejects registration with a missing required field', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Missing',
        email: 'incomplete@wildlife.com',
        password: 'StrongPass123!'
        // lastName omitted
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects registration with a password shorter than 6 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Short',
        lastName: 'Password',
        email: 'shortpass@wildlife.com',
        password: '123'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects registration when the email is already in use', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Duplicate',
        lastName: 'Email',
        email: existingUserEmail,
        password: 'StrongPass123!'
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });
});
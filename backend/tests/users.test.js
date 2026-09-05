const request = require('supertest');
const app = require('../server');
const { sequelize, User, syncDatabase } = require('../models');

/**
 * User Management Endpoint Tests (Admin Only)
 *
 * Covers RBAC (non-admins blocked), toggling another user's status,
 * and the self-protection guard that stops an admin deactivating
 * or deleting their own account.
 */

let adminToken;
let rangerToken;
let adminId;
let targetUserId;

const adminEmail = 'usersadmin@wildlife.com';
const rangerEmail = 'usersranger@wildlife.com';
const targetEmail = 'usersmanaged@wildlife.com';

beforeAll(async () => {
  await syncDatabase();

  await User.destroy({ where: { email: [adminEmail, rangerEmail, targetEmail] }, force: true });

  const admin = await User.create({
    firstName: 'Users',
    lastName: 'Admin',
    email: adminEmail,
    password: 'AdminPass123!',
    role: 'admin',
    isActive: true
  });
  adminId = admin.id;

  await User.create({
    firstName: 'Users',
    lastName: 'Ranger',
    email: rangerEmail,
    password: 'RangerPass123!',
    role: 'ranger',
    isActive: true
  });

  const target = await User.create({
    firstName: 'Managed',
    lastName: 'User',
    email: targetEmail,
    password: 'TargetPass123!',
    role: 'researcher',
    isActive: true
  });
  targetUserId = target.id;

  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: adminEmail, password: 'AdminPass123!' });
  adminToken = adminLogin.body.data.token;

  const rangerLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: rangerEmail, password: 'RangerPass123!' });
  rangerToken = rangerLogin.body.data.token;
});

afterAll(async () => {
  await User.destroy({ where: { email: [adminEmail, rangerEmail, targetEmail] }, force: true });
  await sequelize.close();
});

describe('GET /api/users', () => {
  it('rejects a non-admin from listing users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${rangerToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('allows an admin to list users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.users.some((u) => u.id === targetUserId)).toBe(true);
  });
});

describe('PUT /api/users/:id/toggle-status', () => {
  it('lets an admin deactivate a different user', async () => {
    const res = await request(app)
      .put(`/api/users/${targetUserId}/toggle-status`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.isActive).toBe(false);
  });

  it('prevents an admin from deactivating their own account', async () => {
    const res = await request(app)
      .put(`/api/users/${adminId}/toggle-status`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('DELETE /api/users/:id', () => {
  it('prevents an admin from deleting their own account', async () => {
    const res = await request(app)
      .delete(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
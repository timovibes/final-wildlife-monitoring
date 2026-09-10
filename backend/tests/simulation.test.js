const request = require('supertest');
const app = require('../server');
const { sequelize, syncDatabase } = require('../models');
const simulation = require('../services/sensorSimulation');

/**
 * Simulation Control Endpoint Tests
 *
 * These routes are unauthenticated by design (internal ops toggle), so
 * coverage focuses on correct state transitions and idempotency of the
 * toggle rather than access control. The real interval-based simulation
 * loop is stopped in afterAll so Jest can exit cleanly.
 */

beforeAll(async () => {
  await syncDatabase();
  // Ensure a known starting state regardless of what earlier tests did.
  if (simulation.isRunning()) {
    simulation.stopSimulation();
  }
});

afterAll(async () => {
  if (simulation.isRunning()) {
    simulation.stopSimulation();
  }
  await sequelize.close();
});

describe('GET /api/simulation/status', () => {
  it('reports not running before anything has been started', async () => {
    const res = await request(app).get('/api/simulation/status');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.running).toBe(false);
  });

  it('reflects the true running state after a toggle', async () => {
    await request(app).post('/api/simulation/toggle');

    const res = await request(app).get('/api/simulation/status');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.running).toBe(true);

    // Clean up so this test doesn't leak a running interval to other files.
    await request(app).post('/api/simulation/toggle');
  });
});

describe('POST /api/simulation/toggle', () => {
  it('starts the simulation when it is stopped', async () => {
    expect(simulation.isRunning()).toBe(false);

    const res = await request(app).post('/api/simulation/toggle');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.running).toBe(true);
    expect(simulation.isRunning()).toBe(true);
  });

  it('stops the simulation when it is running', async () => {
    expect(simulation.isRunning()).toBe(true);

    const res = await request(app).post('/api/simulation/toggle');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.running).toBe(false);
    expect(simulation.isRunning()).toBe(false);
  });

  it('is idempotent across repeated toggles (always flips exactly once)', async () => {
    const before = simulation.isRunning();

    const res1 = await request(app).post('/api/simulation/toggle');
    expect(res1.body.data.running).toBe(!before);

    const res2 = await request(app).post('/api/simulation/toggle');
    expect(res2.body.data.running).toBe(before);
  });
});
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { syncDatabase } = require('./models'); // Pull syncDatabase from the models folder
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const speciesRoutes = require('./routes/species');
const sightingsRoutes = require('./routes/sightings');
const incidentsRoutes = require('./routes/incidents');
const reportsRoutes = require('./routes/reports');
const iotRoutes = require('./routes/iot');

/**
 * Wildlife & Biodiversity Monitoring System - Backend Server
 * 
 * Technology Stack:
 * - Express.js: RESTful API framework
 * - PostgreSQL: Relational database (via Sequelize ORM)
 * - JWT: Stateless authentication
 * - Helmet: Security headers
 * - CORS: Cross-origin resource sharing
 * 
 * Architecture: Three-layer (Presentation, Logic, Data)
 * Security: JWT-based auth, bcrypt password hashing, role-based access control
 */

const app = express();
const PORT = process.env.PORT || 5000;

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// =============================================================================
// ROUTES
// =============================================================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Wildlife Monitoring System API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/species', speciesRoutes);
app.use('/api/sightings', sightingsRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/iot', iotRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// =============================================================================
// SERVER INITIALIZATION
// =============================================================================

const startServer = async () => {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  WILDLIFE & BIODIVERSITY MONITORING SYSTEM - BACKEND');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Test database connection
    console.log('Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Synchronize database models
    console.log('Synchronizing database models...');
    await syncDatabase();

    // Start Express server
    app.listen(PORT, () => {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('  SERVER STATUS: RUNNING');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`  Environment:  ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Port:         ${PORT}`);
      console.log(`  Database:     ${process.env.DB_NAME}`);
      console.log(`  API URL:      http://localhost:${PORT}`);
      console.log(`  Health Check: http://localhost:${PORT}/health`);
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('  API Endpoints:');
      console.log('    POST   /api/auth/register');
      console.log('    POST   /api/auth/login');
      console.log('    GET    /api/auth/me');
      console.log('    GET    /api/species');
      console.log('    GET    /api/sightings');
      console.log('    GET    /api/incidents');
      console.log('    GET    /api/reports/dashboard');
      console.log('    POST   /api/iot/data');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('  Server ready. Press Ctrl+C to stop.\n');
    });
  } catch (error) {
    console.error('\n✗ Server initialization failed:', error.message);
    console.error('  Please check your configuration and database connection.\n');
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();
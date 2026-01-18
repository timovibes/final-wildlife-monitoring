const { sequelize } = require('../config/database');

/**
 * Models Index
 * 
 * Initializes all database models and defines their relationships
 * 
 * Rationale:
 * - Centralized model management simplifies imports
 * - Foreign key relationships enforce referential integrity
 * - Cascade/restrict rules prevent orphaned records
 * - Associations enable efficient JOIN queries
 */

const User = require('./User')(sequelize);
const Species = require('./Species')(sequelize);
const Sighting = require('./Sighting')(sequelize);
const Incident = require('./Incident')(sequelize);
const IoTData = require('./IoTData')(sequelize);

// Define relationships

// User -> Sightings (One-to-Many)
User.hasMany(Sighting, {
  foreignKey: 'observerId',
  as: 'sightings',
  onDelete: 'RESTRICT'
});
Sighting.belongsTo(User, {
  foreignKey: 'observerId',
  as: 'observer'
});

// Species -> Sightings (One-to-Many)
Species.hasMany(Sighting, {
  foreignKey: 'speciesId',
  as: 'sightings',
  onDelete: 'CASCADE'
});
Sighting.belongsTo(Species, {
  foreignKey: 'speciesId',
  as: 'species'
});

// User -> Incidents (One-to-Many)
User.hasMany(Incident, {
  foreignKey: 'reportedById',
  as: 'reportedIncidents',
  onDelete: 'RESTRICT'
});
Incident.belongsTo(User, {
  foreignKey: 'reportedById',
  as: 'reporter'
});

// Species -> Incidents (One-to-Many, Optional)
Species.hasMany(Incident, {
  foreignKey: 'speciesId',
  as: 'incidents',
  onDelete: 'SET NULL'
});
Incident.belongsTo(Species, {
  foreignKey: 'speciesId',
  as: 'species'
});

// Species -> IoTData (One-to-Many, Optional)
Species.hasMany(IoTData, {
  foreignKey: 'speciesId',
  as: 'iotData',
  onDelete: 'SET NULL'
});
IoTData.belongsTo(Species, {
  foreignKey: 'speciesId',
  as: 'species'
});

// Synchronize database
const syncDatabase = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('✓ Database synchronized successfully');
    console.log('✓ All tables created/updated');
  } catch (error) {
    console.error('✗ Database synchronization failed:', error);
    throw error;
  }
};

// Run sync if this file is executed directly
if (require.main === module) {
  syncDatabase()
    .then(() => {
      console.log('\n✓ Database setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = {
  sequelize,
  User,
  Species,
  Sighting,
  Incident,
  IoTData,
  syncDatabase
};
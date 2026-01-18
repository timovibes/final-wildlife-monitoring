const { DataTypes } = require('sequelize');

/**
 * Sighting Model
 * 
 * Records wildlife observations made by rangers and researchers
 * 
 * Rationale:
 * - Geographic coordinates enable spatial analysis and mapping
 * - Count validation ensures data quality
 * - Observer tracking provides accountability and data provenance
 * - Behavior notes support ecological research
 * - Photo URLs enable visual verification and species confirmation
 */

module.exports = (sequelize) => {
  const Sighting = sequelize.define('Sighting', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    speciesId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'species',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    observerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      comment: 'Ranger or Researcher who recorded the sighting'
    },
    count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 10000
      }
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
      validate: {
        min: -90,
        max: 90
      }
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
      validate: {
        min: -180,
        max: 180
      }
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Named location or description'
    },
    behavior: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Observed animal behavior (feeding, resting, migrating, etc.)'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    photoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    sightingDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    weather: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Weather conditions during sighting'
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Admin verification status'
    }
  }, {
    tableName: 'sightings',
    timestamps: true,
    indexes: [
      {
        fields: ['speciesId']
      },
      {
        fields: ['observerId']
      },
      {
        fields: ['sightingDate']
      },
      {
        fields: ['latitude', 'longitude']
      },
      {
        fields: ['verified']
      }
    ],
    validate: {
      validCoordinates() {
        if (this.latitude < -90 || this.latitude > 90) {
          throw new Error('Latitude must be between -90 and 90 degrees');
        }
        if (this.longitude < -180 || this.longitude > 180) {
          throw new Error('Longitude must be between -180 and 180 degrees');
        }
      }
    }
  });

  return Sighting;
};
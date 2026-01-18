const { DataTypes } = require('sequelize');

/**
 * Incident Model
 * 
 * Tracks wildlife-related incidents requiring intervention or monitoring
 * 
 * Incident Types:
 * - Poaching: Illegal hunting or trapping
 * - Human-Wildlife Conflict: Crop raiding, livestock predation
 * - Injury: Sick or injured animals
 * - Habitat Destruction: Deforestation, land encroachment
 * - Other: Miscellaneous incidents
 * 
 * Rationale:
 * - Severity classification enables priority-based response
 * - Status tracking supports case management workflow
 * - Geographic data enables hotspot identification
 * - Reporter accountability ensures data reliability
 */

module.exports = (sequelize) => {
  const Incident = sequelize.define('Incident', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    incidentType: {
      type: DataTypes.ENUM('Poaching', 'Human-Wildlife Conflict', 'Injury', 'Habitat Destruction', 'Other'),
      allowNull: false
    },
    severity: {
      type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
      allowNull: false,
      defaultValue: 'Medium'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [10, 5000]
      }
    },
    status: {
      type: DataTypes.ENUM('Reported', 'Under Investigation', 'Resolved', 'Closed'),
      allowNull: false,
      defaultValue: 'Reported'
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
    reportedById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      comment: 'User who reported the incident'
    },
    speciesId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'species',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Affected species (if applicable)'
    },
    incidentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    actionTaken: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Response actions and outcomes'
    },
    photoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    casualties: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Number of animals affected'
    }
  }, {
    tableName: 'incidents',
    timestamps: true,
    indexes: [
      {
        fields: ['incidentType']
      },
      {
        fields: ['severity']
      },
      {
        fields: ['status']
      },
      {
        fields: ['reportedById']
      },
      {
        fields: ['speciesId']
      },
      {
        fields: ['incidentDate']
      },
      {
        fields: ['latitude', 'longitude']
      }
    ]
  });

  return Incident;
};
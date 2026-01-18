const { DataTypes } = require('sequelize');

/**
 * IoTData Model
 * 
 * Stores simulated sensor data from virtual wildlife tracking devices
 * 
 * Purpose:
 * - Demonstrates real-time data ingestion capability
 * - Stress tests reporting and analytics modules
 * - Validates system performance under high-frequency data loads
 * - Provides foundation for future GPS collar/camera trap integration
 * 
 * Rationale:
 * - This is NOT a demo feature - it is a functional stress test layer
 * - Simulates production IoT data patterns
 * - Enables validation of time-series analysis capabilities
 * - Battery and motion data support predictive maintenance scenarios
 */

module.exports = (sequelize) => {
  const IoTData = sequelize.define('IoTData', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    sensorId: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      },
      comment: 'Unique identifier for the IoT device'
    },
    deviceType: {
      type: DataTypes.ENUM('GPS Collar', 'Camera Trap', 'Motion Sensor', 'Weather Station'),
      allowNull: false,
      defaultValue: 'GPS Collar'
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
      comment: 'Associated species (for GPS collars)'
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
    temperature: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Temperature in Celsius'
    },
    motion: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Motion detection status'
    },
    batteryLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Battery percentage'
    },
    heartbeat: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 300
      },
      comment: 'Heart rate (for advanced collars)'
    },
    altitude: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      comment: 'Elevation in meters'
    },
    speed: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      comment: 'Movement speed in km/h'
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Sensor reading timestamp'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional sensor-specific data'
    }
  }, {
    tableName: 'iot_data',
    timestamps: true,
    indexes: [
      {
        fields: ['sensorId']
      },
      {
        fields: ['deviceType']
      },
      {
        fields: ['speciesId']
      },
      {
        fields: ['timestamp']
      },
      {
        fields: ['latitude', 'longitude']
      },
      {
        fields: ['createdAt'],
        comment: 'Optimize time-series queries'
      }
    ]
  });

  return IoTData;
};
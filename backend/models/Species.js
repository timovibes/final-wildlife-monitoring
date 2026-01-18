const { DataTypes } = require('sequelize');

/**
 * Species Model
 * 
 * Stores wildlife species information for conservation tracking
 * 
 * Conservation Status Options (IUCN Red List):
 * - Least Concern (LC)
 * - Near Threatened (NT)
 * - Vulnerable (VU)
 * - Endangered (EN)
 * - Critically Endangered (CR)
 * - Extinct in Wild (EW)
 * - Extinct (EX)
 * 
 * Rationale:
 * - Scientific name enforced for taxonomic accuracy
 * - Population tracking enables trend analysis
 * - Habitat data supports spatial planning
 */

module.exports = (sequelize) => {
  const Species = sequelize.define('Species', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    commonName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    scientificName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, 150]
      }
    },
    category: {
      type: DataTypes.ENUM('Mammal', 'Bird', 'Reptile', 'Amphibian', 'Fish', 'Invertebrate', 'Plant'),
      allowNull: false
    },
    conservationStatus: {
      type: DataTypes.ENUM('LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX'),
      allowNull: false,
      defaultValue: 'LC',
      comment: 'IUCN Red List Status'
    },
    habitat: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    population: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    isEndangered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'species',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['scientificName']
      },
      {
        fields: ['category']
      },
      {
        fields: ['conservationStatus']
      },
      {
        fields: ['isEndangered']
      }
    ],
    hooks: {
      beforeSave: (species) => {
        // Automatically mark as endangered based on conservation status
        species.isEndangered = ['EN', 'CR', 'EW'].includes(species.conservationStatus);
      }
    }
  });

  return Species;
};
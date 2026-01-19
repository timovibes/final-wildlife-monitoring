require('dotenv').config();
const { User, Species, Sighting, Incident } = require('../models');
const bcrypt = require('bcryptjs');

/**
 * Database Seeder
 * 
 * Populates database with initial data for testing and demonstration
 * 
 * Creates:
 * - 3 users (admin, ranger, researcher) with predefined credentials
 * - 15+ wildlife species with realistic conservation data
 * - Sample sightings and incidents for demonstration
 * 
 * Usage: node seeders/seed.js
 */

const seedDatabase = async () => {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  DATABASE SEEDER');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Clear existing data (optional - comment out to preserve data)
    console.log('Clearing existing data...');
    await Incident.destroy({ where: {}, force: true });
    await Sighting.destroy({ where: {}, force: true });
    await Species.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    console.log('✓ Existing data cleared\n');

    // Seed Users
    console.log('Seeding users...');
    const users = await User.bulkCreate([
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@wildlife.com',
        password: 'Admin123!',
        role: 'admin',
        isActive: true
      },
      {
        firstName: 'John',
        lastName: 'Ranger',
        email: 'ranger@wildlife.com',
        password: 'Ranger123!',
        role: 'ranger',
        isActive: true
      },
      {
        firstName: 'Sarah',
        lastName: 'Researcher',
        email: 'researcher@wildlife.com',
        password: 'Researcher123!',
        role: 'researcher',
        isActive: true
      }
    ], {individualHooks: true}); // Ensure beforeCreate hooks run so passwords are hashed
    console.log(`✓ Created ${users.length} users\n`);

    // Seed Species
    console.log('Seeding species...');
    const species = await Species.bulkCreate([
      {
        commonName: 'African Elephant',
        scientificName: 'Loxodonta africana',
        category: 'Mammal',
        conservationStatus: 'EN',
        habitat: 'Savanna, forests, and grasslands',
        description: 'Largest land mammal, known for intelligence and social behavior',
        population: 415000,
        imageUrl: null
      },
      {
        commonName: 'Lion',
        scientificName: 'Panthera leo',
        category: 'Mammal',
        conservationStatus: 'VU',
        habitat: 'Grasslands and savannas',
        description: 'Apex predator, lives in prides',
        population: 23000,
        imageUrl: null
      },
      {
        commonName: 'Black Rhinoceros',
        scientificName: 'Diceros bicornis',
        category: 'Mammal',
        conservationStatus: 'CR',
        habitat: 'Bushlands and grasslands',
        description: 'Critically endangered due to poaching',
        population: 5500,
        imageUrl: null
      },
      {
        commonName: 'Giraffe',
        scientificName: 'Giraffa camelopardalis',
        category: 'Mammal',
        conservationStatus: 'VU',
        habitat: 'Savannas and open woodlands',
        description: 'Tallest land animal, distinctive long neck',
        population: 117000,
        imageUrl: null
      },
      {
        commonName: 'Cheetah',
        scientificName: 'Acinonyx jubatus',
        category: 'Mammal',
        conservationStatus: 'VU',
        habitat: 'Grasslands and savannas',
        description: 'Fastest land animal, can reach 70 mph',
        population: 7100,
        imageUrl: null
      },
      {
        commonName: 'African Wild Dog',
        scientificName: 'Lycaon pictus',
        category: 'Mammal',
        conservationStatus: 'EN',
        habitat: 'Savannas and grasslands',
        description: 'Highly social, cooperative hunters',
        population: 6600,
        imageUrl: null
      },
      {
        commonName: 'Leopard',
        scientificName: 'Panthera pardus',
        category: 'Mammal',
        conservationStatus: 'VU',
        habitat: 'Forests, grasslands, and mountains',
        description: 'Adaptable and solitary big cat',
        population: 50000,
        imageUrl: null
      },
      {
        commonName: 'Plains Zebra',
        scientificName: 'Equus quagga',
        category: 'Mammal',
        conservationStatus: 'NT',
        habitat: 'Grasslands and savannas',
        description: 'Distinctive black and white stripes',
        population: 500000,
        imageUrl: null
      },
      {
        commonName: 'African Buffalo',
        scientificName: 'Syncerus caffer',
        category: 'Mammal',
        conservationStatus: 'LC',
        habitat: 'Savannas and forests',
        description: 'Large bovine, lives in herds',
        population: 900000,
        imageUrl: null
      },
      {
        commonName: 'Crowned Eagle',
        scientificName: 'Stephanoaetus coronatus',
        category: 'Bird',
        conservationStatus: 'LC',
        habitat: 'Forests',
        description: 'Powerful raptor, hunts monkeys and small antelopes',
        population: 100000,
        imageUrl: null
      },
      {
        commonName: 'Grey Crowned Crane',
        scientificName: 'Balearica regulorum',
        category: 'Bird',
        conservationStatus: 'EN',
        habitat: 'Wetlands and grasslands',
        description: 'National bird of Uganda, distinctive golden crown',
        population: 35000,
        imageUrl: null
      },
      {
        commonName: 'Nile Crocodile',
        scientificName: 'Crocodylus niloticus',
        category: 'Reptile',
        conservationStatus: 'LC',
        habitat: 'Rivers, lakes, and wetlands',
        description: 'Large aquatic predator, can live 70+ years',
        population: 250000,
        imageUrl: null
      },
      {
        commonName: 'Hippo',
        scientificName: 'Hippopotamus amphibius',
        category: 'Mammal',
        conservationStatus: 'VU',
        habitat: 'Rivers and lakes',
        description: 'Semi-aquatic herbivore, highly territorial',
        population: 115000,
        imageUrl: null
      },
      {
        commonName: 'Warthog',
        scientificName: 'Phacochoerus africanus',
        category: 'Mammal',
        conservationStatus: 'LC',
        habitat: 'Grasslands and savannas',
        description: 'Wild pig with distinctive facial warts',
        population: 250000,
        imageUrl: null
      },
      {
        commonName: 'Impala',
        scientificName: 'Aepyceros melampus',
        category: 'Mammal',
        conservationStatus: 'LC',
        habitat: 'Woodlands and savannas',
        description: 'Medium-sized antelope, exceptional jumper',
        population: 2000000,
        imageUrl: null
      }
    ]);
    console.log(`✓ Created ${species.length} species\n`);

    // Seed Sightings
    console.log('Seeding sightings...');
    const sightings = await Sighting.bulkCreate([
      {
        speciesId: species[0].id, // African Elephant
        observerId: users[1].id, // Ranger
        count: 12,
        latitude: -1.2921,
        longitude: 36.8219,
        location: 'Nairobi National Park - Mbagathi River',
        behavior: 'Drinking and bathing',
        notes: 'Herd with several calves, healthy condition',
        sightingDate: new Date('2024-12-15'),
        weather: 'Clear, sunny',
        verified: true
      },
      {
        speciesId: species[1].id, // Lion
        observerId: users[1].id,
        count: 5,
        latitude: -1.3015,
        longitude: 36.8345,
        location: 'Nairobi National Park - Central Plains',
        behavior: 'Resting under acacia tree',
        notes: 'Pride of 5, 1 male, 4 females',
        sightingDate: new Date('2024-12-16'),
        weather: 'Partly cloudy',
        verified: true
      },
      {
        speciesId: species[2].id, // Black Rhino
        observerId: users[1].id,
        count: 2,
        latitude: -1.2875,
        longitude: 36.8190,
        location: 'Nairobi National Park - Rhino Valley',
        behavior: 'Grazing',
        notes: 'Adult pair, appear healthy',
        sightingDate: new Date('2024-12-18'),
        weather: 'Clear',
        verified: true
      }
    ]);
    console.log(`✓ Created ${sightings.length} sightings\n`);

    // Seed Incidents
    console.log('Seeding incidents...');
    const incidents = await Incident.bulkCreate([
      {
        incidentType: 'Poaching',
        severity: 'Critical',
        description: 'Evidence of snare traps found near waterhole. Three wire snares removed.',
        status: 'Under Investigation',
        latitude: -1.2950,
        longitude: 36.8270,
        location: 'Nairobi National Park - Eastern Boundary',
        reportedById: users[1].id,
        speciesId: null,
        incidentDate: new Date('2024-12-10'),
        casualties: 0
      },
      {
        incidentType: 'Human-Wildlife Conflict',
        severity: 'High',
        description: 'Elephants broke through fence and damaged crops in adjacent farmland.',
        status: 'Resolved',
        latitude: -1.3100,
        longitude: 36.8400,
        location: 'Southern Park Boundary',
        reportedById: users[1].id,
        speciesId: species[0].id, // Elephant
        incidentDate: new Date('2024-12-12'),
        actionTaken: 'Fence repaired, electric fence enhancement recommended',
        casualties: 0
      }
    ]);
    console.log(`✓ Created ${incidents.length} incidents\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  SEEDING COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\nLogin Credentials:');
    console.log('  Admin:      admin@wildlife.com      / Admin123!');
    console.log('  Ranger:     ranger@wildlife.com     / Ranger123!');
    console.log('  Researcher: researcher@wildlife.com / Researcher123!');
    console.log('═══════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('✗ Seeding failed:', error);
    process.exit(1);
  }
};

// Run seeder
seedDatabase();
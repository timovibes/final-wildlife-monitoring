# Wildlife & Biodiversity Monitoring System

A comprehensive, full-stack application designed to track wildlife sightings, manage conservation data, and report critical incidents in protected areas and conservation zones.

## 🌍 Overview

The Wildlife & Biodiversity Monitoring System is a modern web-based platform that enables rangers, researchers, and administrators to:

- **Record Wildlife Sightings**: Log detailed observations of animals with geographic coordinates, behavior patterns, and photographic evidence
- **Track Conservation Status**: Monitor endangered and vulnerable species using IUCN Red List classifications
- **Incident Management**: Report and track wildlife-related incidents including poaching, human-wildlife conflict, habitat destruction, and injuries
- **Real-Time Data Ingestion**: Simulate and validate high-frequency IoT sensor data from GPS collars and camera traps
- **Access Control**: Role-based dashboard for Admins, Rangers, and Researchers with appropriate permissions

## ✨ Key Features

### Wildlife Observation & Sighting Management
- **Geospatial Tracking**: Record precise latitude/longitude coordinates for wildlife locations
- **Rich Observation Data**: Capture behavior notes, animal counts, weather conditions, and photographic evidence
- **Data Verification**: Admin verification system for sighting accuracy and data quality
- **Observer Accountability**: Full audit trail linking observations to specific rangers/researchers

### Species Database
- **Comprehensive Species Catalog**: Manage wildlife species with scientific and common names
- **Conservation Classification**: Track 7 IUCN conservation status levels (LC, NT, VU, EN, CR, EW, EX)
- **Population Tracking**: Monitor population estimates and habitat information
- **Taxonomic Categories**: Support for mammals, birds, reptiles, amphibians, fish, invertebrates, and plants

### Incident Tracking & Response
- **Incident Classification**: Support for poaching, human-wildlife conflict, habitat destruction, injuries, and other incidents
- **Priority Management**: Severity-based incident prioritization (High, Medium, Low, Critical)
- **Status Workflow**: Track incidents through open, investigating, resolved, and closed states
- **Geographic Hotspot Identification**: Identify and analyze incident concentration areas

### IoT & Real-Time Data Integration
- **Sensor Simulation Service**: Stress test framework simulating GPS collars and camera traps
- **High-Frequency Data Processing**: Validate system performance under realistic IoT data loads
- **Time-Series Analytics**: Foundation for predictive maintenance and behavioral analysis
- **Device Lifecycle Management**: Track battery status, motion data, and device health

### Progressive Web App (PWA)
- **Offline Capability**: Service worker caching for offline field operations
- **Mobile Optimized**: Responsive design for tablet and mobile devices in remote areas
- **Fast Performance**: Optimized asset loading and cache management

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Node.js + Express.js for REST API
- Sequelize ORM with SQL database support
- JWT authentication with role-based access control
- Helmet for security headers and CORS
- Dotenv for environment configuration

**Frontend:**
- React with modern hooks and component architecture
- Tailwind CSS for responsive UI styling
- Lucide React for consistent icon library
- Axios for API communication
- Service Worker for PWA capabilities

**Database:**
- SQL-compatible relational database
- UUID primary keys for distributed systems
- Indexed queries for optimal performance on large datasets

### Project Structure

```
final-wildlife-monitoring/
├── backend/
│   ├── models/              # Database models (Sighting, Species, Incident, IoTData, User)
│   ├── routes/              # API endpoints
│   ├── controllers/         # Business logic
│   ├── services/            # Utilities (IoT simulation, email, etc.)
│   ├── middleware/          # Authentication, validation
│   ├── seeders/             # Sample data initialization
│   └── server.js            # Express server entry point
├── frontend/
│   ├── src/
│   │   ├── components/      # React components (admin, ranger, shared)
│   │   ├── services/        # API client, authentication service
│   │   ├── styles/          # Global styles
│   │   └── App.jsx          # Main application component
│   ├── public/
│   │   ├── service-worker.js # PWA offline support
│   │   └── manifest.json    # PWA metadata
│   └── package.json
├── .env.example             # Environment configuration template
└── README.md                # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- SQL database (PostgreSQL, MySQL, etc.)
- Modern web browser with ES6+ support

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/timovibes/final-wildlife-monitoring.git
   cd final-wildlife-monitoring
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Configure environment variables
   cp .env.example .env
   # Edit .env with your database credentials and settings
   
   # Seed the database with initial data
   npm run seed
   
   # Start the development server
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Start the development server
   npm start
   ```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api

## 🔐 Authentication & Authorization

The system implements role-based access control (RBAC) with three primary roles:

### Admin
- Full system access
- User and species management
- Incident oversight and approval
- System analytics and reporting

### Ranger
- Wildlife sighting recording
- Personal incident reporting
- Limited species catalog access
- Dashboard with personal statistics

### Researcher
- Advanced data querying
- Scientific analysis tools
- Read-only access to sightings and incidents
- Species database contributions (pending approval)

## 📊 Data Models

### Sighting
Captures wildlife observations with geographic precision and behavior context:
- Species reference with count
- Observer identification
- Precise coordinates (lat/long)
- Behavioral observations
- Weather conditions
- Photo documentation
- Verification status

### Species
Maintains comprehensive wildlife species information:
- Common and scientific names
- Taxonomic category
- IUCN conservation status
- Habitat and population data
- Images and descriptions

### Incident
Tracks intervention-requiring events:
- Incident type classification
- Severity and status tracking
- Species and affected area
- Reporter accountability
- Geographic location
- Impact assessment

### IoTData
Simulates real sensor device data:
- Sensor identification
- Device type (GPS collar, camera trap)
- Geographic and temporal data
- Battery and motion metrics
- Data quality indicators

## 🧪 Testing & Data Generation

The project includes a comprehensive seed file with sample data:

```bash
cd backend
npm run seed
```

This initializes the database with:
- Test user accounts across all roles
- 15+ wildlife species across categories
- Sample sightings with realistic geographic data
- Incident records demonstrating various scenarios
- IoT sensor simulation data

### IoT Sensor Simulation

Run the sensor simulation service for stress testing:

```bash
cd backend
npm run simulate-iot
```

This service:
- Simulates realistic GPS collar and camera trap data
- POSTs data to the API at configurable intervals
- Tests system performance under production-like loads
- Validates analytics pipeline accuracy

## 🌐 API Documentation

### Health Check
```
GET /health
```

### Species Endpoints
```
GET    /api/species              # List all species
POST   /api/species              # Create new species (admin only)
GET    /api/species/:id          # Get species details
PUT    /api/species/:id          # Update species (admin only)
DELETE /api/species/:id          # Delete species (admin only)
```

### Sighting Endpoints
```
GET    /api/sightings            # List all sightings
POST   /api/sightings            # Record new sighting
GET    /api/sightings/:id        # Get sighting details
PUT    /api/sightings/:id        # Update sighting
DELETE /api/sightings/:id        # Delete sighting
```

### Incident Endpoints
```
GET    /api/incidents            # List all incidents
POST   /api/incidents            # Report new incident
GET    /api/incidents/:id        # Get incident details
PUT    /api/incidents/:id        # Update incident status
DELETE /api/incidents/:id        # Delete incident
```

### Authentication Endpoints
```
POST   /api/auth/register        # User registration
POST   /api/auth/login           # User login
POST   /api/auth/logout          # User logout
```

## 🔄 Workflow Examples

### Recording a Wildlife Sighting
1. Ranger logs into dashboard
2. Clicks "Record Sighting"
3. Selects species from database
4. Inputs location (auto-populated from device GPS or manual entry)
5. Records behavior and weather conditions
6. Optionally attaches photo
7. Submits for system ingestion
8. Admin receives notification for verification

### Reporting a Critical Incident
1. Ranger identifies wildlife-related incident
2. Selects incident type (e.g., Poaching)
3. Indicates severity level and species affected
4. Provides location and detailed description
5. System auto-alerts admins based on severity
6. Incident status tracked through resolution workflow
7. Analytics track incident patterns and hotspots

## 📈 Analytics & Insights

The system supports analysis through:
- Species population trend analysis
- Incident hotspot mapping
- Ranger performance metrics
- Data quality dashboards
- IoT device health monitoring
- Behavioral pattern detection

## 🛠️ Development

### Environment Variables

Create a `.env` file in the backend directory:

```
NODE_ENV=development
PORT=5000
DATABASE_URL=your_database_connection_string
JWT_SECRET=your_jwt_secret_key
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:5000/api
```

### Running Tests

```bash
cd backend
npm test
```

### Code Quality

The project follows these standards:
- ES6+ JavaScript conventions
- React functional components with hooks
- Consistent naming conventions
- Component composition patterns
- Proper error handling and validation

## 📝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes with clear messages
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Author

Created by [timovibes](https://github.com/timovibes)

## 🙏 Acknowledgments

- IUCN Red List for conservation status classifications
- Wildlife conservation organizations for inspiring feature set
- Open-source community for excellent tools and libraries

## 📞 Support

For questions or issues:
- Open a GitHub Issue for bug reports
- Contact the development team for feature requests
- Check existing documentation for common questions

## 🚦 Project Status

- **Status**: Active Development
- **Last Updated**: January 2026
- **Version**: 1.0.0
- **Open Issues**: 1

---

**Join the effort to protect our planet's biodiversity through technology and data-driven conservation.
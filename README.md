# Wildlife & Biodiversity Monitoring System

A comprehensive, full-stack application designed to track wildlife sightings, manage conservation data, and report critical incidents in protected areas and conservation zones.

## Overview

The Wildlife & Biodiversity Monitoring System is a modern web-based platform that enables rangers, researchers, and administrators to:

- **Record Wildlife Sightings**: Log detailed observations of animals with geographic coordinates, behavior patterns, and photographic evidence
- **Track Conservation Status**: Monitor endangered and vulnerable species using IUCN Red List classifications
- **Incident Management**: Report and track wildlife-related incidents including poaching, human-wildlife conflict, habitat destruction, and injuries
- **Real-Time Data Ingestion**: Simulate and validate high-frequency IoT sensor data from GPS collars and camera traps
- **Access Control**: Role-based dashboard for Admins, Rangers, and Researchers with appropriate permissions


## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- PostgreSQL
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


## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes with clear messages
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Created by [timovibes](https://github.com/timovibes)

## Acknowledgments

- IUCN Red List for conservation status classifications
- Wildlife conservation organizations for inspiring feature set
- Open-source community for excellent tools and libraries

## Support

For questions or issues:
- Open a GitHub Issue for bug reports
- Contact the development team for feature requests
- Check existing documentation for common questions


---

**Join the effort to protect our planet's biodiversity through technology and data-driven conservation.

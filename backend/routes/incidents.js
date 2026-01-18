const express = require('express');
const { Incident, Species, User } = require('../models');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

/**
 * Incidents Management Routes
 * 
 * GET /api/incidents - Get all incidents (All authenticated users)
 * GET /api/incidents/:id - Get incident by ID (All authenticated users)
 * POST /api/incidents - Create incident (Ranger, Admin)
 * PUT /api/incidents/:id - Update incident (Admin only)
 * DELETE /api/incidents/:id - Delete incident (Admin only)
 * PUT /api/incidents/:id/status - Update incident status (Admin only)
 */

// Get all incidents (All authenticated users)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { incidentType, severity, status, reportedById, speciesId } = req.query;
    
    const where = {};
    if (incidentType) where.incidentType = incidentType;
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (reportedById) where.reportedById = reportedById;
    if (speciesId) where.speciesId = speciesId;

    const incidents = await Incident.findAll({
      where,
      include: [
        {
          model: Species,
          as: 'species',
          attributes: ['id', 'commonName', 'scientificName', 'category']
        },
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        }
      ],
      order: [['incidentDate', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: incidents.length,
      data: { incidents }
    });
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incidents.',
      error: error.message
    });
  }
});

// Get incident by ID (All authenticated users)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id, {
      include: [
        {
          model: Species,
          as: 'species'
        },
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        }
      ]
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: { incident }
    });
  } catch (error) {
    console.error('Get incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incident.',
      error: error.message
    });
  }
});

// Create incident (Ranger, Admin)
router.post('/', authMiddleware, roleCheck('ranger', 'admin'), async (req, res) => {
  try {
    const {
      incidentType,
      severity,
      description,
      latitude,
      longitude,
      location,
      speciesId,
      incidentDate,
      photoUrl,
      casualties
    } = req.body;

    // Validation
    if (!incidentType || !description || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Incident type, description, latitude, and longitude are required.'
      });
    }

    // Verify species exists if provided
    if (speciesId) {
      const species = await Species.findByPk(speciesId);
      if (!species) {
        return res.status(404).json({
          success: false,
          message: 'Species not found.'
        });
      }
    }

    const incident = await Incident.create({
      incidentType,
      severity: severity || 'Medium',
      description,
      status: 'Reported',
      latitude,
      longitude,
      location,
      reportedById: req.user.id,
      speciesId: speciesId || null,
      incidentDate: incidentDate || new Date(),
      photoUrl,
      casualties: casualties || 0
    });

    // Fetch complete incident with associations
    const completeIncident = await Incident.findByPk(incident.id, {
      include: [
        {
          model: Species,
          as: 'species'
        },
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Incident reported successfully.',
      data: { incident: completeIncident }
    });
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create incident.',
      error: error.message
    });
  }
});

// Update incident (Admin only)
router.put('/:id', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found.'
      });
    }

    const {
      incidentType,
      severity,
      description,
      status,
      latitude,
      longitude,
      location,
      speciesId,
      incidentDate,
      actionTaken,
      photoUrl,
      casualties
    } = req.body;

    // Verify species exists if being updated
    if (speciesId !== undefined && speciesId !== null) {
      const species = await Species.findByPk(speciesId);
      if (!species) {
        return res.status(404).json({
          success: false,
          message: 'Species not found.'
        });
      }
    }

    // Update fields
    if (incidentType !== undefined) incident.incidentType = incidentType;
    if (severity !== undefined) incident.severity = severity;
    if (description !== undefined) incident.description = description;
    if (status !== undefined) incident.status = status;
    if (latitude !== undefined) incident.latitude = latitude;
    if (longitude !== undefined) incident.longitude = longitude;
    if (location !== undefined) incident.location = location;
    if (speciesId !== undefined) incident.speciesId = speciesId;
    if (incidentDate !== undefined) incident.incidentDate = incidentDate;
    if (actionTaken !== undefined) incident.actionTaken = actionTaken;
    if (photoUrl !== undefined) incident.photoUrl = photoUrl;
    if (casualties !== undefined) incident.casualties = casualties;

    await incident.save();

    // Fetch complete incident with associations
    const updatedIncident = await Incident.findByPk(incident.id, {
      include: [
        {
          model: Species,
          as: 'species'
        },
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Incident updated successfully.',
      data: { incident: updatedIncident }
    });
  } catch (error) {
    console.error('Update incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update incident.',
      error: error.message
    });
  }
});

// Update incident status (Admin only)
router.put('/:id/status', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found.'
      });
    }

    const { status, actionTaken } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required.'
      });
    }

    incident.status = status;
    if (actionTaken) incident.actionTaken = actionTaken;

    await incident.save();

    res.status(200).json({
      success: true,
      message: 'Incident status updated successfully.',
      data: { incident }
    });
  } catch (error) {
    console.error('Update incident status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update incident status.',
      error: error.message
    });
  }
});

// Delete incident (Admin only)
router.delete('/:id', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found.'
      });
    }

    await incident.destroy();

    res.status(200).json({
      success: true,
      message: 'Incident deleted successfully.'
    });
  } catch (error) {
    console.error('Delete incident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete incident.',
      error: error.message
    });
  }
});

module.exports = router;
const express = require('express');
const { Sighting, Species, User } = require('../models');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

/**
 * Sightings Management Routes
 * 
 * GET /api/sightings - Get all sightings (All authenticated users)
 * GET /api/sightings/:id - Get sighting by ID (All authenticated users)
 * POST /api/sightings - Create sighting (Ranger, Admin)
 * PUT /api/sightings/:id - Update sighting (Owner, Admin)
 * DELETE /api/sightings/:id - Delete sighting (Owner, Admin)
 * PUT /api/sightings/:id/verify - Verify sighting (Admin only)
 */

// Get all sightings (All authenticated users)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { speciesId, observerId, verified, startDate, endDate } = req.query;
    
    const where = {};
    if (speciesId) where.speciesId = speciesId;
    if (observerId) where.observerId = observerId;
    if (verified !== undefined) where.verified = verified === 'true';
    if (startDate) where.sightingDate = { [Op.gte]: new Date(startDate) };
    if (endDate) where.sightingDate = { ...where.sightingDate, [Op.lte]: new Date(endDate) };

    const sightings = await Sighting.findAll({
      where,
      include: [
        {
          model: Species,
          as: 'species',
          attributes: ['id', 'commonName', 'scientificName', 'category', 'conservationStatus']
        },
        {
          model: User,
          as: 'observer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        }
      ],
      order: [['sightingDate', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: sightings.length,
      data: { sightings }
    });
  } catch (error) {
    console.error('Get sightings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sightings.',
      error: error.message
    });
  }
});

// Get sighting by ID (All authenticated users)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const sighting = await Sighting.findByPk(req.params.id, {
      include: [
        {
          model: Species,
          as: 'species'
        },
        {
          model: User,
          as: 'observer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        }
      ]
    });

    if (!sighting) {
      return res.status(404).json({
        success: false,
        message: 'Sighting not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: { sighting }
    });
  } catch (error) {
    console.error('Get sighting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sighting.',
      error: error.message
    });
  }
});

// Create sighting (Ranger, Admin)
router.post('/', authMiddleware, roleCheck('ranger', 'admin'), async (req, res) => {
  try {
    const {
      speciesId,
      count,
      latitude,
      longitude,
      location,
      behavior,
      notes,
      photoUrl,
      sightingDate,
      weather
    } = req.body;

    // Validation
    if (!speciesId || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Species, latitude, and longitude are required.'
      });
    }

    // Verify species exists
    const species = await Species.findByPk(speciesId);
    if (!species) {
      return res.status(404).json({
        success: false,
        message: 'Species not found.'
      });
    }

    const sighting = await Sighting.create({
      speciesId,
      observerId: req.user.id,
      count: count || 1,
      latitude,
      longitude,
      location,
      behavior,
      notes,
      photoUrl,
      sightingDate: sightingDate || new Date(),
      weather,
      verified: false
    });

    // Fetch complete sighting with associations
    const completeSighting = await Sighting.findByPk(sighting.id, {
      include: [
        {
          model: Species,
          as: 'species'
        },
        {
          model: User,
          as: 'observer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Sighting recorded successfully.',
      data: { sighting: completeSighting }
    });
  } catch (error) {
    console.error('Create sighting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sighting.',
      error: error.message
    });
  }
});

// Update sighting (Owner or Admin)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const sighting = await Sighting.findByPk(req.params.id);

    if (!sighting) {
      return res.status(404).json({
        success: false,
        message: 'Sighting not found.'
      });
    }

    // Check authorization (owner or admin)
    if (sighting.observerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this sighting.'
      });
    }

    const {
      speciesId,
      count,
      latitude,
      longitude,
      location,
      behavior,
      notes,
      photoUrl,
      sightingDate,
      weather
    } = req.body;

    // Verify species exists if being updated
    if (speciesId && speciesId !== sighting.speciesId) {
      const species = await Species.findByPk(speciesId);
      if (!species) {
        return res.status(404).json({
          success: false,
          message: 'Species not found.'
        });
      }
      sighting.speciesId = speciesId;
    }

    // Update fields
    if (count !== undefined) sighting.count = count;
    if (latitude !== undefined) sighting.latitude = latitude;
    if (longitude !== undefined) sighting.longitude = longitude;
    if (location !== undefined) sighting.location = location;
    if (behavior !== undefined) sighting.behavior = behavior;
    if (notes !== undefined) sighting.notes = notes;
    if (photoUrl !== undefined) sighting.photoUrl = photoUrl;
    if (sightingDate !== undefined) sighting.sightingDate = sightingDate;
    if (weather !== undefined) sighting.weather = weather;

    await sighting.save();

    // Fetch complete sighting with associations
    const updatedSighting = await Sighting.findByPk(sighting.id, {
      include: [
        {
          model: Species,
          as: 'species'
        },
        {
          model: User,
          as: 'observer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Sighting updated successfully.',
      data: { sighting: updatedSighting }
    });
  } catch (error) {
    console.error('Update sighting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update sighting.',
      error: error.message
    });
  }
});

// Verify sighting (Admin only)
router.put('/:id/verify', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const sighting = await Sighting.findByPk(req.params.id);

    if (!sighting) {
      return res.status(404).json({
        success: false,
        message: 'Sighting not found.'
      });
    }

    sighting.verified = !sighting.verified;
    await sighting.save();

    res.status(200).json({
      success: true,
      message: `Sighting ${sighting.verified ? 'verified' : 'unverified'} successfully.`,
      data: { sighting }
    });
  } catch (error) {
    console.error('Verify sighting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify sighting.',
      error: error.message
    });
  }
});

// Delete sighting (Owner or Admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const sighting = await Sighting.findByPk(req.params.id);

    if (!sighting) {
      return res.status(404).json({
        success: false,
        message: 'Sighting not found.'
      });
    }

    // Check authorization
    if (sighting.observerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this sighting.'
      });
    }

    await sighting.destroy();

    res.status(200).json({
      success: true,
      message: 'Sighting deleted successfully.'
    });
  } catch (error) {
    console.error('Delete sighting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete sighting.',
      error: error.message
    });
  }
});

module.exports = router;
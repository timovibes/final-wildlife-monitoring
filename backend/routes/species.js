const express = require('express');
const { Species } = require('../models');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

/**
 * Species Management Routes
 * 
 * GET /api/species - Get all species (All authenticated users)
 * GET /api/species/:id - Get species by ID (All authenticated users)
 * POST /api/species - Create species (Admin only)
 * PUT /api/species/:id - Update species (Admin only)
 * DELETE /api/species/:id - Delete species (Admin only)
 */

// Get all species (All authenticated users)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { category, conservationStatus, isEndangered } = req.query;
    
    const where = {};
    if (category) where.category = category;
    if (conservationStatus) where.conservationStatus = conservationStatus;
    if (isEndangered !== undefined) where.isEndangered = isEndangered === 'true';

    const species = await Species.findAll({
      where,
      order: [['commonName', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: species.length,
      data: { species }
    });
  } catch (error) {
    console.error('Get species error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch species.',
      error: error.message
    });
  }
});

// Get species by ID (All authenticated users)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const species = await Species.findByPk(req.params.id);

    if (!species) {
      return res.status(404).json({
        success: false,
        message: 'Species not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: { species }
    });
  } catch (error) {
    console.error('Get species error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch species.',
      error: error.message
    });
  }
});

// Create species (Admin only)
router.post('/', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const {
      commonName,
      scientificName,
      category,
      conservationStatus,
      habitat,
      description,
      population,
      imageUrl
    } = req.body;

    // Validation
    if (!commonName || !scientificName || !category) {
      return res.status(400).json({
        success: false,
        message: 'Common name, scientific name, and category are required.'
      });
    }

    // Check for duplicate scientific name
    const existing = await Species.findOne({ where: { scientificName } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Species with this scientific name already exists.'
      });
    }

    const species = await Species.create({
      commonName,
      scientificName,
      category,
      conservationStatus: conservationStatus || 'LC',
      habitat,
      description,
      population: population || 0,
      imageUrl
    });

    res.status(201).json({
      success: true,
      message: 'Species created successfully.',
      data: { species }
    });
  } catch (error) {
    console.error('Create species error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create species.',
      error: error.message
    });
  }
});

// Update species (Admin only)
router.put('/:id', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const species = await Species.findByPk(req.params.id);

    if (!species) {
      return res.status(404).json({
        success: false,
        message: 'Species not found.'
      });
    }

    const {
      commonName,
      scientificName,
      category,
      conservationStatus,
      habitat,
      description,
      population,
      imageUrl
    } = req.body;

    // Check for duplicate scientific name (excluding current species)
    if (scientificName && scientificName !== species.scientificName) {
      const existing = await Species.findOne({ where: { scientificName } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Another species with this scientific name already exists.'
        });
      }
    }

    // Update fields
    if (commonName) species.commonName = commonName;
    if (scientificName) species.scientificName = scientificName;
    if (category) species.category = category;
    if (conservationStatus) species.conservationStatus = conservationStatus;
    if (habitat !== undefined) species.habitat = habitat;
    if (description !== undefined) species.description = description;
    if (population !== undefined) species.population = population;
    if (imageUrl !== undefined) species.imageUrl = imageUrl;

    await species.save();

    res.status(200).json({
      success: true,
      message: 'Species updated successfully.',
      data: { species }
    });
  } catch (error) {
    console.error('Update species error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update species.',
      error: error.message
    });
  }
});

// Delete species (Admin only)
router.delete('/:id', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const species = await Species.findByPk(req.params.id);

    if (!species) {
      return res.status(404).json({
        success: false,
        message: 'Species not found.'
      });
    }

    await species.destroy();

    res.status(200).json({
      success: true,
      message: 'Species deleted successfully.'
    });
  } catch (error) {
    console.error('Delete species error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete species.',
      error: error.message
    });
  }
});

module.exports = router;
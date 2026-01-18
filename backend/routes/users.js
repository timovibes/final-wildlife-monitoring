const express = require('express');
const { User } = require('../models');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

/**
 * User Management Routes (Admin Only)
 * 
 * GET /api/users - Get all users
 * GET /api/users/:id - Get user by ID
 * PUT /api/users/:id - Update user
 * DELETE /api/users/:id - Delete user
 * PUT /api/users/:id/toggle-status - Activate/Deactivate user
 */

// Get all users (Admin only)
router.get('/', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const { role, isActive, search } = req.query;
    
    const where = {};
    
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const users = await User.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: users.length,
      data: { users }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users.',
      error: error.message
    });
  }
});

// Get user by ID (Admin only)
router.get('/:id', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user.',
      error: error.message
    });
  }
});

// Update user (Admin only)
router.put('/:id', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const { firstName, lastName, email, role, isActive } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Prevent admin from deactivating themselves
    if (req.user.id === user.id && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account.'
      });
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: { user }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user.',
      error: error.message
    });
  }
});

// Toggle user active status (Admin only)
router.put('/:id/toggle-status', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Prevent admin from deactivating themselves
    if (req.user.id === user.id && user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account.'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: { user }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle user status.',
      error: error.message
    });
  }
});

// Delete user (Admin only)
router.delete('/:id', authMiddleware, roleCheck('admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Prevent admin from deleting themselves
    if (req.user.id === user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account.'
      });
    }

    await user.destroy();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully.'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user.',
      error: error.message
    });
  }
});

module.exports = router;
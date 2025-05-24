const express = require('express');
const router = express.Router();

// Import middleware
const { authenticateBusiness, authenticateCustomer, authenticateUser } = require('../middleware/auth');
const { validateReward, validateRedemption, validatePagination, validateObjectId } = require('../middleware/validation');

// Import controllers
const {
  createReward,
  getRewards,
  getRewardById,
  updateReward,
  deleteReward,
  redeemReward,
  getRedemptions,
  verifyRedemption
} = require('../controllers/rewardController');

// Reward management routes (business only)
router.post('/', authenticateBusiness, validateReward, createReward);
router.put('/:id', authenticateBusiness, validateObjectId('id'), updateReward);
router.delete('/:id', authenticateBusiness, validateObjectId('id'), deleteReward);

// Get rewards (both business and customer can access)
router.get('/', authenticateUser, validatePagination, getRewards);
router.get('/:id', authenticateUser, validateObjectId('id'), getRewardById);

// Redemption routes
router.post('/redeem', authenticateCustomer, validateRedemption, redeemReward);
router.get('/redemptions', authenticateUser, validatePagination, getRedemptions);

// Verify redemption code (business only)
router.get('/verify/:code', authenticateBusiness, verifyRedemption);

// Test route
router.get('/test/endpoint', (req, res) => {
  res.json({
    success: true,
    message: 'Reward routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

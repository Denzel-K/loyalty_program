const express = require('express');
const router = express.Router();

// Import middleware
const { authenticateCustomer, requireVerifiedCustomer } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');

// Import controllers
const {
  getProfile,
  updateProfile,
  getVisitHistory,
  getPointsBalance,
  getRedemptionHistory
} = require('../controllers/customerController');

// All routes require customer authentication
router.use(authenticateCustomer);
router.use(requireVerifiedCustomer);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Activity routes
router.get('/visits', validatePagination, getVisitHistory);
router.get('/points', getPointsBalance);
router.get('/redemptions', validatePagination, getRedemptionHistory);

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Customer routes are working',
    customer: req.customer.phoneNumber,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

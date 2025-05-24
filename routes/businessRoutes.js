const express = require('express');
const router = express.Router();

// Import middleware
const { authenticateBusiness, requireVerifiedBusiness } = require('../middleware/auth');
const { validatePagination, validateDateRange } = require('../middleware/validation');

// Import controllers
const {
  getDashboard,
  updateProfile,
  getAnalytics,
  updateLoyaltySettings,
  getCustomers
} = require('../controllers/businessController');

// All routes require business authentication
router.use(authenticateBusiness);

// Dashboard and profile routes
router.get('/dashboard', getDashboard);
router.put('/profile', updateProfile);
router.get('/analytics', validateDateRange, getAnalytics);

// Loyalty program settings
router.put('/loyalty-settings', updateLoyaltySettings);

// Customer management
router.get('/customers', validatePagination, getCustomers);

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Business routes are working',
    business: req.business.businessName,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

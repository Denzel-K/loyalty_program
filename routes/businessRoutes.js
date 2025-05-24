const express = require('express');
const router = express.Router();

// Import middleware
const { authenticateBusiness, requireVerifiedBusiness } = require('../middleware/auth');
const { validatePagination, validateDateRange } = require('../middleware/validation');

// Placeholder controllers - will be implemented later
const businessController = {
  getDashboard: (req, res) => {
    res.json({
      success: true,
      message: 'Business dashboard endpoint - to be implemented',
      businessId: req.business._id
    });
  },
  
  updateProfile: (req, res) => {
    res.json({
      success: true,
      message: 'Update business profile endpoint - to be implemented',
      businessId: req.business._id
    });
  },
  
  getAnalytics: (req, res) => {
    res.json({
      success: true,
      message: 'Business analytics endpoint - to be implemented',
      businessId: req.business._id
    });
  },
  
  updateLoyaltySettings: (req, res) => {
    res.json({
      success: true,
      message: 'Update loyalty settings endpoint - to be implemented',
      businessId: req.business._id
    });
  },
  
  getCustomers: (req, res) => {
    res.json({
      success: true,
      message: 'Get business customers endpoint - to be implemented',
      businessId: req.business._id
    });
  }
};

// All routes require business authentication
router.use(authenticateBusiness);

// Dashboard and profile routes
router.get('/dashboard', businessController.getDashboard);
router.put('/profile', businessController.updateProfile);
router.get('/analytics', validateDateRange, businessController.getAnalytics);

// Loyalty program settings
router.put('/loyalty-settings', businessController.updateLoyaltySettings);

// Customer management
router.get('/customers', validatePagination, businessController.getCustomers);

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

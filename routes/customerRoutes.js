const express = require('express');
const router = express.Router();

// Import middleware
const { authenticateCustomer, requireVerifiedCustomer } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');

// Placeholder controllers - will be implemented later
const customerController = {
  getProfile: (req, res) => {
    res.json({
      success: true,
      message: 'Customer profile endpoint - to be implemented',
      customer: req.customer.getPublicInfo()
    });
  },
  
  updateProfile: (req, res) => {
    res.json({
      success: true,
      message: 'Update customer profile endpoint - to be implemented',
      customerId: req.customer._id
    });
  },
  
  getVisitHistory: (req, res) => {
    res.json({
      success: true,
      message: 'Customer visit history endpoint - to be implemented',
      customerId: req.customer._id
    });
  },
  
  getPointsBalance: (req, res) => {
    res.json({
      success: true,
      message: 'Customer points balance endpoint - to be implemented',
      customerId: req.customer._id
    });
  },
  
  getRedemptionHistory: (req, res) => {
    res.json({
      success: true,
      message: 'Customer redemption history endpoint - to be implemented',
      customerId: req.customer._id
    });
  }
};

// All routes require customer authentication
router.use(authenticateCustomer);
router.use(requireVerifiedCustomer);

// Profile routes
router.get('/profile', customerController.getProfile);
router.put('/profile', customerController.updateProfile);

// Activity routes
router.get('/visits', validatePagination, customerController.getVisitHistory);
router.get('/points', customerController.getPointsBalance);
router.get('/redemptions', validatePagination, customerController.getRedemptionHistory);

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

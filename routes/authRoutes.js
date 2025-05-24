const express = require('express');
const router = express.Router();

// Import controllers
const {
  registerBusiness,
  loginBusiness,
  registerCustomer,
  verifyOTP,
  resendOTP,
  logout,
  getProfile
} = require('../controllers/authControllers');

// Import middleware
const { authenticateUser } = require('../middleware/auth');
const {
  validateBusinessRegistration,
  validateBusinessLogin,
  validateCustomerRegistration,
  validateOTP
} = require('../middleware/validation');

// Business Authentication Routes
router.post('/business/register', validateBusinessRegistration, registerBusiness);
router.post('/business/login', validateBusinessLogin, loginBusiness);

// Customer Authentication Routes (Phone-based)
router.post('/customer/register', validateCustomerRegistration, registerCustomer);
router.post('/customer/verify-otp', validateOTP, verifyOTP);
router.post('/customer/resend-otp', validateCustomerRegistration, resendOTP);

// Common Routes
router.post('/logout', logout);
router.get('/profile', authenticateUser, getProfile);

// Test route for development
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
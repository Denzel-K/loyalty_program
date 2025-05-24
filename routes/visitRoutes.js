const express = require('express');
const router = express.Router();

// Import middleware
const { authenticateBusiness, authenticateUser } = require('../middleware/auth');
const { validateVisit, validatePagination, validateObjectId } = require('../middleware/validation');

// Import controllers
const {
  recordVisit,
  getVisits,
  getVisitById,
  updateVisit,
  deleteVisit
} = require('../controllers/visitController');

// Record a new visit (business only)
router.post('/', authenticateBusiness, validateVisit, recordVisit);

// Get visits (both business and customer can access)
router.get('/', authenticateUser, validatePagination, getVisits);

// Get specific visit by ID
router.get('/:id', authenticateUser, validateObjectId('id'), getVisitById);

// Update visit (business only)
router.put('/:id', authenticateBusiness, validateObjectId('id'), updateVisit);

// Delete visit (business only)
router.delete('/:id', authenticateBusiness, validateObjectId('id'), deleteVisit);

// Test route
router.get('/test/endpoint', (req, res) => {
  res.json({
    success: true,
    message: 'Visit routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

const Visit = require('../models/Visit');
const Customer = require('../models/Customer');
const Business = require('../models/Business');
const phoneValidator = require('../utils/phoneValidator');

// Record a new visit
const recordVisit = async (req, res) => {
  try {
    const businessId = req.business._id;
    const { customerId, customerPhone, serviceType, amount, notes, pointsMultiplier } = req.body;
    
    let customer;
    
    // Find customer by ID or phone number
    if (customerId) {
      customer = await Customer.findById(customerId);
    } else if (customerPhone) {
      const phoneValidation = phoneValidator.validateAndNormalize(customerPhone);
      if (!phoneValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: phoneValidation.error
        });
      }
      
      customer = await Customer.findOne({ phoneNumber: phoneValidation.normalized });
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found. Customer must register first.'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either customerId or customerPhone is required'
      });
    }
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    // Create visit
    const visit = new Visit({
      customer: customer._id,
      business: businessId,
      serviceType,
      amount,
      notes,
      pointsMultiplier: pointsMultiplier || 1
    });
    
    await visit.save();
    
    // Populate the visit for response
    await visit.populate('customer', 'phoneNumber firstName lastName');
    
    res.status(201).json({
      success: true,
      message: 'Visit recorded successfully',
      data: {
        visit,
        pointsEarned: visit.pointsEarned
      }
    });

  } catch (error) {
    console.error('Record visit error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording visit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get visits (filtered by user type)
const getVisits = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    let filter = {};
    
    // Filter based on user type
    if (req.userType === 'business') {
      filter.business = req.business._id;
    } else if (req.userType === 'customer') {
      filter.customer = req.customer._id;
    }
    
    const visits = await Visit.find(filter)
      .populate('customer', 'phoneNumber firstName lastName')
      .populate('business', 'businessName businessType')
      .sort({ visitDate: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Visit.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        visits,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get visits error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching visits',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get specific visit by ID
const getVisitById = async (req, res) => {
  try {
    const visitId = req.params.id;
    
    const visit = await Visit.findById(visitId)
      .populate('customer', 'phoneNumber firstName lastName')
      .populate('business', 'businessName businessType');
    
    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Visit not found'
      });
    }
    
    // Check authorization
    if (req.userType === 'business' && !visit.business._id.equals(req.business._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    if (req.userType === 'customer' && !visit.customer._id.equals(req.customer._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      data: {
        visit
      }
    });

  } catch (error) {
    console.error('Get visit error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching visit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update visit (business only)
const updateVisit = async (req, res) => {
  try {
    const visitId = req.params.id;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated
    delete updates.customer;
    delete updates.business;
    delete updates.visitDate;
    delete updates.pointsEarned;
    
    const visit = await Visit.findOneAndUpdate(
      { _id: visitId, business: req.business._id },
      updates,
      { new: true, runValidators: true }
    ).populate('customer', 'phoneNumber firstName lastName');
    
    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Visit not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Visit updated successfully',
      data: {
        visit
      }
    });

  } catch (error) {
    console.error('Update visit error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating visit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete visit (business only)
const deleteVisit = async (req, res) => {
  try {
    const visitId = req.params.id;
    
    const visit = await Visit.findOneAndDelete({
      _id: visitId,
      business: req.business._id
    });
    
    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Visit not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Visit deleted successfully'
    });

  } catch (error) {
    console.error('Delete visit error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting visit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  recordVisit,
  getVisits,
  getVisitById,
  updateVisit,
  deleteVisit
};

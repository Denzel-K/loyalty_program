const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  // References
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer reference is required']
  },
  
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: [true, 'Business reference is required']
  },
  
  // Visit details
  visitDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  // Points earned for this visit
  pointsEarned: {
    type: Number,
    required: true,
    min: [0, 'Points earned cannot be negative']
  },
  
  // Visit metadata
  visitType: {
    type: String,
    enum: ['regular', 'bonus', 'promotional'],
    default: 'regular'
  },
  
  // Optional visit details
  serviceType: {
    type: String,
    trim: true,
    maxlength: [100, 'Service type cannot exceed 100 characters']
  },
  
  amount: {
    type: Number,
    min: [0, 'Amount cannot be negative']
  },
  
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  
  // Visit validation
  isValidated: {
    type: Boolean,
    default: true
  },
  
  validatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business'
  },
  
  validatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Bonus multiplier (for special promotions)
  pointsMultiplier: {
    type: Number,
    default: 1,
    min: [0.1, 'Points multiplier must be at least 0.1']
  }
  
}, {
  timestamps: true
});

// Compound index for efficient queries
visitSchema.index({ customer: 1, business: 1, visitDate: -1 });
visitSchema.index({ business: 1, visitDate: -1 });
visitSchema.index({ customer: 1, visitDate: -1 });

// Pre-save middleware to calculate points
visitSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      // Get business loyalty settings
      const Business = mongoose.model('Business');
      const business = await Business.findById(this.business);
      
      if (!business) {
        return next(new Error('Business not found'));
      }
      
      // Calculate points if not already set
      if (!this.pointsEarned) {
        this.pointsEarned = Math.floor(
          business.loyaltySettings.pointsPerVisit * this.pointsMultiplier
        );
      }
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Post-save middleware to update customer and business statistics
visitSchema.post('save', async function(doc) {
  try {
    const Customer = mongoose.model('Customer');
    const Business = mongoose.model('Business');
    
    // Update customer statistics
    const customerStats = await mongoose.model('Visit').aggregate([
      { $match: { customer: doc.customer } },
      {
        $group: {
          _id: null,
          totalVisits: { $sum: 1 },
          totalPointsEarned: { $sum: '$pointsEarned' },
          lastVisitDate: { $max: '$visitDate' }
        }
      }
    ]);
    
    if (customerStats.length > 0) {
      await Customer.findByIdAndUpdate(doc.customer, {
        totalVisits: customerStats[0].totalVisits,
        totalPointsEarned: customerStats[0].totalPointsEarned,
        lastVisitDate: customerStats[0].lastVisitDate,
        lastBusinessVisited: doc.business
      });
    }
    
    // Update business statistics
    const businessStats = await mongoose.model('Visit').aggregate([
      { $match: { business: doc.business } },
      {
        $group: {
          _id: null,
          totalVisits: { $sum: 1 },
          totalPointsIssued: { $sum: '$pointsEarned' },
          uniqueCustomers: { $addToSet: '$customer' }
        }
      }
    ]);
    
    if (businessStats.length > 0) {
      await Business.findByIdAndUpdate(doc.business, {
        totalVisits: businessStats[0].totalVisits,
        totalPointsIssued: businessStats[0].totalPointsIssued,
        totalCustomers: businessStats[0].uniqueCustomers.length
      });
    }
    
  } catch (error) {
    console.error('Error updating statistics after visit save:', error);
  }
});

// Static method to get customer visits for a business
visitSchema.statics.getCustomerVisitsForBusiness = function(customerId, businessId, limit = 10) {
  return this.find({
    customer: customerId,
    business: businessId
  })
  .sort({ visitDate: -1 })
  .limit(limit)
  .populate('business', 'businessName businessType');
};

// Static method to get business visit analytics
visitSchema.statics.getBusinessAnalytics = function(businessId, startDate, endDate) {
  const matchStage = { business: mongoose.Types.ObjectId(businessId) };
  
  if (startDate && endDate) {
    matchStage.visitDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$visitDate' },
          month: { $month: '$visitDate' },
          day: { $dayOfMonth: '$visitDate' }
        },
        totalVisits: { $sum: 1 },
        totalPoints: { $sum: '$pointsEarned' },
        uniqueCustomers: { $addToSet: '$customer' },
        averageAmount: { $avg: '$amount' }
      }
    },
    {
      $project: {
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day'
          }
        },
        totalVisits: 1,
        totalPoints: 1,
        uniqueCustomers: { $size: '$uniqueCustomers' },
        averageAmount: { $round: ['$averageAmount', 2] }
      }
    },
    { $sort: { date: 1 } }
  ]);
};

// Method to check if visit is recent (within last 24 hours)
visitSchema.methods.isRecent = function() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.visitDate > twentyFourHoursAgo;
};

module.exports = mongoose.model('Visit', visitSchema);

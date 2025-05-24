const mongoose = require('mongoose');

const redemptionSchema = new mongoose.Schema({
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
  
  reward: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reward',
    required: [true, 'Reward reference is required']
  },
  
  // Redemption details
  pointsUsed: {
    type: Number,
    required: [true, 'Points used is required'],
    min: [1, 'Points used must be at least 1']
  },
  
  redemptionDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'used', 'expired', 'cancelled'],
    default: 'pending'
  },
  
  // Redemption code for verification
  redemptionCode: {
    type: String,
    required: true,
    unique: true
  },
  
  // Expiration (redemptions typically expire after some time)
  expiresAt: {
    type: Date,
    required: true
  },
  
  // Usage tracking
  usedAt: Date,
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business' // Staff member who processed the redemption
  },
  
  // Additional details
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  
  // Transaction details (if applicable)
  transactionAmount: {
    type: Number,
    min: [0, 'Transaction amount cannot be negative']
  },
  
  discountApplied: {
    type: Number,
    min: [0, 'Discount applied cannot be negative']
  }
  
}, {
  timestamps: true
});

// Indexes for efficient queries
redemptionSchema.index({ customer: 1, redemptionDate: -1 });
redemptionSchema.index({ business: 1, redemptionDate: -1 });
redemptionSchema.index({ redemptionCode: 1 });
redemptionSchema.index({ status: 1, expiresAt: 1 });

// Pre-save middleware to generate redemption code and set expiration
redemptionSchema.pre('save', function(next) {
  if (this.isNew) {
    // Generate unique redemption code
    if (!this.redemptionCode) {
      this.redemptionCode = this.generateRedemptionCode();
    }
    
    // Set expiration date (default 30 days from now)
    if (!this.expiresAt) {
      this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  }
  next();
});

// Post-save middleware to update statistics
redemptionSchema.post('save', async function(doc) {
  if (doc.isNew) {
    try {
      // Update reward total redemptions
      await mongoose.model('Reward').findByIdAndUpdate(
        doc.reward,
        { $inc: { totalRedemptions: 1 } }
      );
      
      // Update business total redemptions
      await mongoose.model('Business').findByIdAndUpdate(
        doc.business,
        { $inc: { totalRedemptions: 1 } }
      );
      
      // Update customer total redemptions
      await mongoose.model('Customer').findByIdAndUpdate(
        doc.customer,
        { $inc: { totalRedemptions: 1 } }
      );
      
    } catch (error) {
      console.error('Error updating redemption statistics:', error);
    }
  }
});

// Method to generate unique redemption code
redemptionSchema.methods.generateRedemptionCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Method to check if redemption is valid
redemptionSchema.methods.isValid = function() {
  return this.status === 'confirmed' && 
         this.expiresAt > new Date() && 
         !this.usedAt;
};

// Method to mark as used
redemptionSchema.methods.markAsUsed = async function(usedBy, transactionAmount, discountApplied) {
  if (!this.isValid()) {
    throw new Error('Redemption is not valid for use');
  }
  
  this.status = 'used';
  this.usedAt = new Date();
  this.usedBy = usedBy;
  
  if (transactionAmount !== undefined) {
    this.transactionAmount = transactionAmount;
  }
  
  if (discountApplied !== undefined) {
    this.discountApplied = discountApplied;
  }
  
  return await this.save();
};

// Static method to find redemption by code
redemptionSchema.statics.findByCode = function(code) {
  return this.findOne({ redemptionCode: code })
    .populate('customer', 'phoneNumber firstName lastName')
    .populate('business', 'businessName')
    .populate('reward', 'title description rewardType rewardValue');
};

// Static method to get customer redemption history
redemptionSchema.statics.getCustomerHistory = function(customerId, limit = 10) {
  return this.find({ customer: customerId })
    .sort({ redemptionDate: -1 })
    .limit(limit)
    .populate('business', 'businessName businessType')
    .populate('reward', 'title description rewardType rewardValue');
};

// Static method to get business redemption analytics
redemptionSchema.statics.getBusinessAnalytics = function(businessId, startDate, endDate) {
  const matchStage = { business: mongoose.Types.ObjectId(businessId) };
  
  if (startDate && endDate) {
    matchStage.redemptionDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$redemptionDate' },
          month: { $month: '$redemptionDate' },
          day: { $dayOfMonth: '$redemptionDate' }
        },
        totalRedemptions: { $sum: 1 },
        totalPointsUsed: { $sum: '$pointsUsed' },
        totalDiscountGiven: { $sum: '$discountApplied' },
        uniqueCustomers: { $addToSet: '$customer' }
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
        totalRedemptions: 1,
        totalPointsUsed: 1,
        totalDiscountGiven: { $round: ['$totalDiscountGiven', 2] },
        uniqueCustomers: { $size: '$uniqueCustomers' }
      }
    },
    { $sort: { date: 1 } }
  ]);
};

// Method to auto-expire old redemptions
redemptionSchema.statics.expireOldRedemptions = async function() {
  const result = await this.updateMany(
    {
      status: { $in: ['pending', 'confirmed'] },
      expiresAt: { $lt: new Date() }
    },
    {
      $set: { status: 'expired' }
    }
  );
  
  return result.modifiedCount;
};

module.exports = mongoose.model('Redemption', redemptionSchema);

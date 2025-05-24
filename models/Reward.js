const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  // Business reference
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: [true, 'Business reference is required']
  },
  
  // Reward details
  title: {
    type: String,
    required: [true, 'Reward title is required'],
    trim: true,
    maxlength: [100, 'Reward title cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Reward description is required'],
    trim: true,
    maxlength: [500, 'Reward description cannot exceed 500 characters']
  },
  
  // Points required to redeem this reward
  pointsRequired: {
    type: Number,
    required: [true, 'Points required is required'],
    min: [1, 'Points required must be at least 1']
  },
  
  // Reward value/type
  rewardType: {
    type: String,
    enum: ['discount_percentage', 'discount_fixed', 'free_service', 'free_item', 'other'],
    required: true
  },
  
  rewardValue: {
    type: Number,
    required: [true, 'Reward value is required'],
    min: [0, 'Reward value cannot be negative']
  },
  
  // Availability settings
  isActive: {
    type: Boolean,
    default: true
  },
  
  maxRedemptionsPerCustomer: {
    type: Number,
    default: null, // null means unlimited
    min: [1, 'Max redemptions per customer must be at least 1']
  },
  
  maxTotalRedemptions: {
    type: Number,
    default: null, // null means unlimited
    min: [1, 'Max total redemptions must be at least 1']
  },
  
  // Time restrictions
  validFrom: {
    type: Date,
    default: Date.now
  },
  
  validUntil: {
    type: Date,
    default: null // null means no expiration
  },
  
  // Day/time restrictions
  availableDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  }],
  
  availableTimeStart: String, // Format: "HH:MM"
  availableTimeEnd: String,   // Format: "HH:MM"
  
  // Usage tracking
  totalRedemptions: {
    type: Number,
    default: 0
  },
  
  // Terms and conditions
  terms: {
    type: String,
    maxlength: [1000, 'Terms cannot exceed 1000 characters']
  },
  
  // Minimum purchase requirement
  minimumPurchase: {
    type: Number,
    default: 0,
    min: [0, 'Minimum purchase cannot be negative']
  }
  
}, {
  timestamps: true
});

// Indexes for efficient queries
rewardSchema.index({ business: 1, isActive: 1 });
rewardSchema.index({ business: 1, pointsRequired: 1 });

// Virtual to check if reward is currently valid
rewardSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  
  // Check if reward is active
  if (!this.isActive) return false;
  
  // Check date validity
  if (this.validFrom && now < this.validFrom) return false;
  if (this.validUntil && now > this.validUntil) return false;
  
  // Check if max total redemptions reached
  if (this.maxTotalRedemptions && this.totalRedemptions >= this.maxTotalRedemptions) {
    return false;
  }
  
  return true;
});

// Method to check if reward is available for a specific customer
rewardSchema.methods.isAvailableForCustomer = async function(customerId) {
  if (!this.isCurrentlyValid) return false;
  
  // Check customer-specific redemption limit
  if (this.maxRedemptionsPerCustomer) {
    const Redemption = mongoose.model('Redemption');
    const customerRedemptions = await Redemption.countDocuments({
      customer: customerId,
      reward: this._id
    });
    
    if (customerRedemptions >= this.maxRedemptionsPerCustomer) {
      return false;
    }
  }
  
  // Check day restrictions
  if (this.availableDays && this.availableDays.length > 0) {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
    if (!this.availableDays.includes(today)) {
      return false;
    }
  }
  
  // Check time restrictions
  if (this.availableTimeStart && this.availableTimeEnd) {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
    
    if (currentTime < this.availableTimeStart || currentTime > this.availableTimeEnd) {
      return false;
    }
  }
  
  return true;
};

// Static method to get available rewards for a customer
rewardSchema.statics.getAvailableRewards = async function(businessId, customerId, customerPoints) {
  const rewards = await this.find({
    business: businessId,
    isActive: true,
    pointsRequired: { $lte: customerPoints }
  }).sort({ pointsRequired: 1 });
  
  const availableRewards = [];
  
  for (const reward of rewards) {
    const isAvailable = await reward.isAvailableForCustomer(customerId);
    if (isAvailable) {
      availableRewards.push(reward);
    }
  }
  
  return availableRewards;
};

// Method to get formatted reward value
rewardSchema.methods.getFormattedValue = function() {
  switch (this.rewardType) {
    case 'discount_percentage':
      return `${this.rewardValue}% off`;
    case 'discount_fixed':
      return `$${this.rewardValue} off`;
    case 'free_service':
    case 'free_item':
      return 'Free';
    default:
      return this.description;
  }
};

// Pre-save middleware to validate time format
rewardSchema.pre('save', function(next) {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  if (this.availableTimeStart && !timeRegex.test(this.availableTimeStart)) {
    return next(new Error('Invalid time format for availableTimeStart. Use HH:MM format.'));
  }
  
  if (this.availableTimeEnd && !timeRegex.test(this.availableTimeEnd)) {
    return next(new Error('Invalid time format for availableTimeEnd. Use HH:MM format.'));
  }
  
  if (this.availableTimeStart && this.availableTimeEnd && 
      this.availableTimeStart >= this.availableTimeEnd) {
    return next(new Error('availableTimeStart must be before availableTimeEnd'));
  }
  
  next();
});

module.exports = mongoose.model('Reward', rewardSchema);

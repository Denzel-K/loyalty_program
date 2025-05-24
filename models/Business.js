const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const businessSchema = new mongoose.Schema({
  // Basic Information
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true,
    maxlength: [100, 'Business name cannot exceed 100 characters']
  },
  
  businessType: {
    type: String,
    required: [true, 'Business type is required'],
    enum: ['salon', 'barbershop', 'eatery', 'other'],
    lowercase: true
  },
  
  // Contact Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number']
  },
  
  // Authentication
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  
  // Address Information
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: 'USA' }
  },
  
  // Business Settings
  isVerified: {
    type: Boolean,
    default: false
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Loyalty Program Settings
  loyaltySettings: {
    pointsPerVisit: {
      type: Number,
      default: 10,
      min: [1, 'Points per visit must be at least 1']
    },
    redemptionThreshold: {
      type: Number,
      default: 100,
      min: [10, 'Redemption threshold must be at least 10']
    },
    rewardValue: {
      type: Number,
      default: 10, // $10 reward for 100 points
      min: [1, 'Reward value must be at least 1']
    },
    maxRedemptionsPerDay: {
      type: Number,
      default: 5,
      min: [1, 'Max redemptions per day must be at least 1']
    }
  },
  
  // Business Hours
  businessHours: {
    monday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    friday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, isClosed: { type: Boolean, default: true } }
  },
  
  // Statistics
  totalCustomers: {
    type: Number,
    default: 0
  },
  
  totalVisits: {
    type: Number,
    default: 0
  },
  
  totalPointsIssued: {
    type: Number,
    default: 0
  },
  
  totalRedemptions: {
    type: Number,
    default: 0
  }
  
}, {
  timestamps: true
});

// Hash password before saving
businessSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
businessSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get business public info (without sensitive data)
businessSchema.methods.getPublicInfo = function() {
  const businessObject = this.toObject();
  delete businessObject.password;
  return businessObject;
};

module.exports = mongoose.model('Business', businessSchema);

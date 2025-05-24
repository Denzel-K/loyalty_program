const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  // Primary identifier - phone number
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number']
  },
  
  // Optional personal information
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  
  email: {
    type: String,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  // Verification status
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  
  // OTP for phone verification
  otp: {
    code: String,
    expiresAt: Date,
    attempts: {
      type: Number,
      default: 0
    }
  },
  
  // Customer preferences
  preferences: {
    receivePromotions: {
      type: Boolean,
      default: true
    },
    preferredContactMethod: {
      type: String,
      enum: ['sms', 'email', 'none'],
      default: 'sms'
    }
  },
  
  // Customer status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Aggregated statistics across all businesses
  totalVisits: {
    type: Number,
    default: 0
  },
  
  totalPointsEarned: {
    type: Number,
    default: 0
  },
  
  totalRedemptions: {
    type: Number,
    default: 0
  },
  
  // Last activity tracking
  lastVisitDate: Date,
  lastBusinessVisited: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business'
  }
  
}, {
  timestamps: true
});

// Virtual for full name
customerSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || 'Customer';
});

// Method to generate OTP
customerSchema.methods.generateOTP = function() {
  const otpLength = parseInt(process.env.OTP_LENGTH) || 6;
  const otp = Math.floor(Math.random() * Math.pow(10, otpLength)).toString().padStart(otpLength, '0');
  const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRE_MINUTES) || 5) * 60 * 1000);
  
  this.otp = {
    code: otp,
    expiresAt: expiresAt,
    attempts: 0
  };
  
  return otp;
};

// Method to verify OTP
customerSchema.methods.verifyOTP = function(inputOTP) {
  if (!this.otp || !this.otp.code) {
    return { success: false, message: 'No OTP found' };
  }
  
  if (this.otp.expiresAt < new Date()) {
    return { success: false, message: 'OTP has expired' };
  }
  
  if (this.otp.attempts >= 3) {
    return { success: false, message: 'Too many attempts. Please request a new OTP' };
  }
  
  if (this.otp.code !== inputOTP) {
    this.otp.attempts += 1;
    return { success: false, message: 'Invalid OTP' };
  }
  
  // OTP is valid
  this.isPhoneVerified = true;
  this.otp = undefined; // Clear OTP after successful verification
  
  return { success: true, message: 'Phone number verified successfully' };
};

// Method to clear expired OTP
customerSchema.methods.clearExpiredOTP = function() {
  if (this.otp && this.otp.expiresAt < new Date()) {
    this.otp = undefined;
  }
};

// Get customer points for a specific business
customerSchema.methods.getPointsForBusiness = async function(businessId) {
  const Visit = mongoose.model('Visit');
  const visits = await Visit.find({
    customer: this._id,
    business: businessId
  });
  
  return visits.reduce((total, visit) => total + visit.pointsEarned, 0);
};

// Get customer public info
customerSchema.methods.getPublicInfo = function() {
  return {
    _id: this._id,
    phoneNumber: this.phoneNumber,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: this.fullName,
    isPhoneVerified: this.isPhoneVerified,
    totalVisits: this.totalVisits,
    totalPointsEarned: this.totalPointsEarned,
    totalRedemptions: this.totalRedemptions,
    lastVisitDate: this.lastVisitDate,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('Customer', customerSchema);

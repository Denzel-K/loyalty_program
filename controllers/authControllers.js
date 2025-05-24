const jwt = require('jsonwebtoken');
const Business = require('../models/Business');
const Customer = require('../models/Customer');
const otpService = require('../utils/otpService');
const phoneValidator = require('../utils/phoneValidator');

// Generate JWT token
const generateToken = (id, type) => {
  return jwt.sign(
    { id, type },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Set token cookie
const setTokenCookie = (res, token, type) => {
  const cookieName = type === 'business' ? 'businessToken' : 'customerToken';

  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

// Business Registration
const registerBusiness = async (req, res) => {
  try {
    const {
      businessName,
      businessType,
      email,
      phoneNumber,
      password,
      address
    } = req.body;

    // Validate and normalize phone number
    const phoneValidation = phoneValidator.validateAndNormalize(phoneNumber);
    if (!phoneValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: phoneValidation.error
      });
    }

    // Check if business already exists
    const existingBusiness = await Business.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phoneNumber: phoneValidation.normalized }
      ]
    });

    if (existingBusiness) {
      return res.status(400).json({
        success: false,
        message: 'Business with this email or phone number already exists'
      });
    }

    // Create new business
    const business = new Business({
      businessName,
      businessType,
      email: email.toLowerCase(),
      phoneNumber: phoneValidation.normalized,
      password,
      address
    });

    await business.save();

    // Generate token
    const token = generateToken(business._id, 'business');
    setTokenCookie(res, token, 'business');

    res.status(201).json({
      success: true,
      message: 'Business registered successfully',
      data: {
        business: business.getPublicInfo(),
        token
      }
    });

  } catch (error) {
    console.error('Business registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering business',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Business Login
const loginBusiness = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find business by email
    const business = await Business.findOne({ email: email.toLowerCase() });

    if (!business) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await business.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if business is active
    if (!business.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Business account is deactivated'
      });
    }

    // Generate token
    const token = generateToken(business._id, 'business');
    setTokenCookie(res, token, 'business');

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        business: business.getPublicInfo(),
        token
      }
    });

  } catch (error) {
    console.error('Business login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Customer Registration/Login (Phone-based)
const registerCustomer = async (req, res) => {
  try {
    const { phoneNumber, firstName, lastName, email } = req.body;
    console.log(req.body);

    // Validate and normalize phone number
    const phoneValidation = phoneValidator.validateAndNormalize(phoneNumber);
    if (!phoneValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: phoneValidation.error
      });
    }

    // Check if customer already exists
    let customer = await Customer.findOne({
      phoneNumber: phoneValidation.normalized
    });

    if (customer) {
      // Customer exists, generate OTP for login
      const otp = customer.generateOTP();
      await customer.save();

      // Send OTP
      const otpResult = await otpService.sendOTPSMS(phoneValidation.normalized, otp);

      return res.json({
        success: true,
        message: 'OTP sent to your phone number',
        data: {
          customerId: customer._id,
          phoneNumber: phoneValidation.formatted,
          isExistingCustomer: true,
          otpSent: otpResult.success
        }
      });
    }

    // Create new customer
    customer = new Customer({
      phoneNumber: phoneValidation.normalized,
      firstName,
      lastName,
      email: email ? email.toLowerCase() : undefined
    });

    // Generate OTP
    const otp = customer.generateOTP();
    await customer.save();

    // Send OTP
    const otpResult = await otpService.sendOTPSMS(phoneValidation.normalized, otp);

    res.status(201).json({
      success: true,
      message: 'Customer registered. OTP sent to your phone number',
      data: {
        customerId: customer._id,
        phoneNumber: phoneValidation.formatted,
        isExistingCustomer: false,
        otpSent: otpResult.success
      }
    });

  } catch (error) {
    console.error('Customer registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering customer',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Verify OTP and Login Customer
const verifyOTP = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    // Validate and normalize phone number
    const phoneValidation = phoneValidator.validateAndNormalize(phoneNumber);
    if (!phoneValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: phoneValidation.error
      });
    }

    // Find customer
    const customer = await Customer.findOne({
      phoneNumber: phoneValidation.normalized
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Verify OTP
    const verificationResult = customer.verifyOTP(otp);

    if (!verificationResult.success) {
      await customer.save(); // Save updated attempt count
      return res.status(400).json({
        success: false,
        message: verificationResult.message
      });
    }

    // OTP verified successfully
    await customer.save();

    // Generate token
    const token = generateToken(customer._id, 'customer');
    setTokenCookie(res, token, 'customer');

    res.json({
      success: true,
      message: 'Phone number verified successfully',
      data: {
        customer: customer.getPublicInfo(),
        token
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Validate and normalize phone number
    const phoneValidation = phoneValidator.validateAndNormalize(phoneNumber);
    if (!phoneValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: phoneValidation.error
      });
    }

    // Find customer
    const customer = await Customer.findOne({
      phoneNumber: phoneValidation.normalized
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check rate limiting (prevent spam)
    if (customer.otp && customer.otp.expiresAt) {
      const timeSinceLastOTP = Date.now() - (customer.otp.expiresAt.getTime() - 5 * 60 * 1000);
      if (timeSinceLastOTP < 60 * 1000) { // 1 minute cooldown
        return res.status(429).json({
          success: false,
          message: 'Please wait before requesting another OTP',
          retryAfter: Math.ceil((60 * 1000 - timeSinceLastOTP) / 1000)
        });
      }
    }

    // Generate new OTP
    const otp = customer.generateOTP();
    await customer.save();

    // Send OTP
    const otpResult = await otpService.sendOTPSMS(phoneValidation.normalized, otp);

    res.json({
      success: true,
      message: 'New OTP sent to your phone number',
      data: {
        phoneNumber: phoneValidation.formatted,
        otpSent: otpResult.success
      }
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resending OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    // Clear cookies
    res.clearCookie('businessToken');
    res.clearCookie('customerToken');

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    if (req.userType === 'business') {
      res.json({
        success: true,
        data: {
          type: 'business',
          profile: req.business.getPublicInfo()
        }
      });
    } else if (req.userType === 'customer') {
      res.json({
        success: true,
        data: {
          type: 'customer',
          profile: req.customer.getPublicInfo()
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  registerBusiness,
  loginBusiness,
  registerCustomer,
  verifyOTP,
  resendOTP,
  logout,
  getProfile
};
const jwt = require('jsonwebtoken');
const Business = require('../models/Business');
const Customer = require('../models/Customer');

// Middleware to authenticate business owners
const authenticateBusiness = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.businessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'business') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type. Business token required.'
      });
    }

    const business = await Business.findById(decoded.id).select('-password');
    
    if (!business) {
      return res.status(401).json({
        success: false,
        message: 'Business not found.'
      });
    }

    if (!business.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Business account is deactivated.'
      });
    }

    req.business = business;
    req.user = business; // For compatibility
    req.userType = 'business';
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

// Middleware to authenticate customers
const authenticateCustomer = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.customerToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'customer') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type. Customer token required.'
      });
    }

    const customer = await Customer.findById(decoded.id);
    
    if (!customer) {
      return res.status(401).json({
        success: false,
        message: 'Customer not found.'
      });
    }

    if (!customer.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Customer account is deactivated.'
      });
    }

    if (!customer.isPhoneVerified) {
      return res.status(401).json({
        success: false,
        message: 'Phone number not verified.'
      });
    }

    req.customer = customer;
    req.user = customer; // For compatibility
    req.userType = 'customer';
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

// Middleware to authenticate either business or customer
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.businessToken || 
                  req.cookies?.customerToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type === 'business') {
      const business = await Business.findById(decoded.id).select('-password');
      if (!business || !business.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Business not found or inactive.'
        });
      }
      req.business = business;
      req.user = business;
      req.userType = 'business';
    } else if (decoded.type === 'customer') {
      const customer = await Customer.findById(decoded.id);
      if (!customer || !customer.isActive || !customer.isPhoneVerified) {
        return res.status(401).json({
          success: false,
          message: 'Customer not found, inactive, or phone not verified.'
        });
      }
      req.customer = customer;
      req.user = customer;
      req.userType = 'customer';
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type.'
      });
    }
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

// Middleware to check if business is verified
const requireVerifiedBusiness = (req, res, next) => {
  if (!req.business) {
    return res.status(401).json({
      success: false,
      message: 'Business authentication required.'
    });
  }

  if (!req.business.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Business verification required to access this resource.'
    });
  }

  next();
};

// Middleware to check if customer phone is verified
const requireVerifiedCustomer = (req, res, next) => {
  if (!req.customer) {
    return res.status(401).json({
      success: false,
      message: 'Customer authentication required.'
    });
  }

  if (!req.customer.isPhoneVerified) {
    return res.status(403).json({
      success: false,
      message: 'Phone verification required to access this resource.'
    });
  }

  next();
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.businessToken || 
                  req.cookies?.customerToken;

    if (!token) {
      return next(); // Continue without authentication
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type === 'business') {
      const business = await Business.findById(decoded.id).select('-password');
      if (business && business.isActive) {
        req.business = business;
        req.user = business;
        req.userType = 'business';
      }
    } else if (decoded.type === 'customer') {
      const customer = await Customer.findById(decoded.id);
      if (customer && customer.isActive && customer.isPhoneVerified) {
        req.customer = customer;
        req.user = customer;
        req.userType = 'customer';
      }
    }
    
    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

module.exports = {
  authenticateBusiness,
  authenticateCustomer,
  authenticateUser,
  requireVerifiedBusiness,
  requireVerifiedCustomer,
  optionalAuth
};

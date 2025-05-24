const { body, param, query, validationResult } = require('express-validator');
const phoneValidator = require('../utils/phoneValidator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// Business validation rules
const validateBusinessRegistration = [
  body('businessName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  
  body('businessType')
    .isIn(['salon', 'barbershop', 'eatery', 'other'])
    .withMessage('Business type must be salon, barbershop, eatery, or other'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phoneNumber')
    .custom((value) => {
      const validation = phoneValidator.validateAndNormalize(value);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      return true;
    }),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('address.street')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Street address must be between 5 and 200 characters'),
  
  body('address.city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  
  body('address.state')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters'),
  
  body('address.zipCode')
    .matches(/^\d{5}(-\d{4})?$/)
    .withMessage('Please provide a valid ZIP code'),
  
  handleValidationErrors
];

const validateBusinessLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Customer validation rules
const validateCustomerRegistration = [
  body('phoneNumber')
    .custom((value) => {
      const validation = phoneValidator.validateAndNormalize(value);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      return true;
    }),
  
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  handleValidationErrors
];

const validateOTP = [
  body('phoneNumber')
    .custom((value) => {
      const validation = phoneValidator.validateAndNormalize(value);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      return true;
    }),
  
  body('otp')
    .isLength({ min: 4, max: 8 })
    .isNumeric()
    .withMessage('OTP must be a 4-8 digit number'),
  
  handleValidationErrors
];

// Visit validation rules
const validateVisit = [
  body('customerId')
    .optional()
    .isMongoId()
    .withMessage('Invalid customer ID'),
  
  body('customerPhone')
    .optional()
    .custom((value) => {
      if (value) {
        const validation = phoneValidator.validateAndNormalize(value);
        if (!validation.isValid) {
          throw new Error(validation.error);
        }
      }
      return true;
    }),
  
  body('serviceType')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Service type cannot exceed 100 characters'),
  
  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  
  body('pointsMultiplier')
    .optional()
    .isFloat({ min: 0.1, max: 10 })
    .withMessage('Points multiplier must be between 0.1 and 10'),
  
  handleValidationErrors
];

// Reward validation rules
const validateReward = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Reward title must be between 3 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reward description must be between 10 and 500 characters'),
  
  body('pointsRequired')
    .isInt({ min: 1 })
    .withMessage('Points required must be at least 1'),
  
  body('rewardType')
    .isIn(['discount_percentage', 'discount_fixed', 'free_service', 'free_item', 'other'])
    .withMessage('Invalid reward type'),
  
  body('rewardValue')
    .isFloat({ min: 0 })
    .withMessage('Reward value must be a positive number'),
  
  body('maxRedemptionsPerCustomer')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max redemptions per customer must be at least 1'),
  
  body('maxTotalRedemptions')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max total redemptions must be at least 1'),
  
  body('validUntil')
    .optional()
    .isISO8601()
    .withMessage('Valid until must be a valid date'),
  
  body('availableDays')
    .optional()
    .isArray()
    .withMessage('Available days must be an array'),
  
  body('availableDays.*')
    .optional()
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Invalid day of week'),
  
  body('availableTimeStart')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Available time start must be in HH:MM format'),
  
  body('availableTimeEnd')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Available time end must be in HH:MM format'),
  
  body('minimumPurchase')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum purchase must be a positive number'),
  
  handleValidationErrors
];

// Redemption validation rules
const validateRedemption = [
  body('rewardId')
    .isMongoId()
    .withMessage('Invalid reward ID'),
  
  body('transactionAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Transaction amount must be a positive number'),
  
  handleValidationErrors
];

// Parameter validation
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
  
  handleValidationErrors
];

// Query validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateBusinessRegistration,
  validateBusinessLogin,
  validateCustomerRegistration,
  validateOTP,
  validateVisit,
  validateReward,
  validateRedemption,
  validateObjectId,
  validatePagination,
  validateDateRange
};

const validator = require('validator');

class PhoneValidator {
  constructor() {
    // Common phone number patterns for different regions
    this.patterns = {
      US: /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
      INTERNATIONAL: /^\+?[\d\s\-\(\)]{10,}$/,
      SIMPLE: /^[\d\s\-\(\)\+]{10,}$/
    };
  }

  // Clean phone number by removing all non-digit characters except +
  cleanPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';

    // Remove all characters except digits and +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');

    // If it already starts with +, keep it as is
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // If it starts with 1 and has 11 digits, add + (US number)
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      return '+' + cleaned;
    }

    // If it has 10 digits and no country code, assume US
    if (cleaned.length === 10) {
      return '+1' + cleaned;
    }

    // For other international numbers, add + if missing
    if (cleaned.length > 10 && !cleaned.startsWith('+')) {
      return '+' + cleaned;
    }

    return cleaned;
  }

  // Validate phone number format
  isValidPhoneNumber(phoneNumber) {
    if (!phoneNumber) return false;

    const cleaned = this.cleanPhoneNumber(phoneNumber);

    // Check if it matches international pattern
    return this.patterns.INTERNATIONAL.test(cleaned) && cleaned.length >= 10;
  }

  // Validate US phone number specifically
  isValidUSPhoneNumber(phoneNumber) {
    if (!phoneNumber) return false;

    const cleaned = this.cleanPhoneNumber(phoneNumber);
    return this.patterns.US.test(phoneNumber) ||
           (cleaned.startsWith('+1') && cleaned.length === 12);
  }

  // Format phone number for display
  formatPhoneNumber(phoneNumber, format = 'international') {
    if (!phoneNumber) return '';

    const cleaned = this.cleanPhoneNumber(phoneNumber);

    if (format === 'international') {
      return cleaned;
    }

    if (format === 'us' && (cleaned.startsWith('+1') || cleaned.startsWith('1'))) {
      const digits = cleaned.replace(/^\+?1/, '');
      if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      }
    }

    return cleaned;
  }

  // Normalize phone number for storage
  normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;

    const cleaned = this.cleanPhoneNumber(phoneNumber);

    if (!this.isValidPhoneNumber(cleaned)) {
      throw new Error('Invalid phone number format');
    }

    return cleaned;
  }

  // Get country code from phone number
  getCountryCode(phoneNumber) {
    if (!phoneNumber) return null;

    const cleaned = this.cleanPhoneNumber(phoneNumber);

    if (cleaned.startsWith('+1')) return 'US';
    if (cleaned.startsWith('+44')) return 'UK';
    if (cleaned.startsWith('+91')) return 'IN';
    if (cleaned.startsWith('+86')) return 'CN';
    if (cleaned.startsWith('+33')) return 'FR';
    if (cleaned.startsWith('+49')) return 'DE';
    if (cleaned.startsWith('+81')) return 'JP';
    if (cleaned.startsWith('+82')) return 'KR';
    if (cleaned.startsWith('+61')) return 'AU';
    if (cleaned.startsWith('+55')) return 'BR';
    if (cleaned.startsWith('+254')) return 'KE'; // Kenya
    if (cleaned.startsWith('+234')) return 'NG'; // Nigeria
    if (cleaned.startsWith('+27')) return 'ZA'; // South Africa

    return 'UNKNOWN';
  }

  // Validate and normalize phone number with detailed response
  validateAndNormalize(phoneNumber) {
    try {
      if (!phoneNumber) {
        return {
          isValid: false,
          error: 'Phone number is required',
          normalized: null,
          formatted: null,
          countryCode: null
        };
      }

      const normalized = this.normalizePhoneNumber(phoneNumber);
      const formatted = this.formatPhoneNumber(normalized, 'us');
      const countryCode = this.getCountryCode(normalized);

      return {
        isValid: true,
        error: null,
        normalized: normalized,
        formatted: formatted,
        countryCode: countryCode,
        original: phoneNumber
      };

    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        normalized: null,
        formatted: null,
        countryCode: null,
        original: phoneNumber
      };
    }
  }

  // Check if two phone numbers are the same
  arePhoneNumbersEqual(phone1, phone2) {
    try {
      const normalized1 = this.normalizePhoneNumber(phone1);
      const normalized2 = this.normalizePhoneNumber(phone2);
      return normalized1 === normalized2;
    } catch (error) {
      return false;
    }
  }

  // Generate a masked phone number for display
  maskPhoneNumber(phoneNumber, maskChar = '*') {
    if (!phoneNumber) return '';

    const formatted = this.formatPhoneNumber(phoneNumber, 'us');

    if (formatted.includes('(') && formatted.includes(')')) {
      // US format: (123) 456-7890 -> (***) ***-7890
      return formatted.replace(/\d(?=.*\d{4})/g, maskChar);
    } else {
      // International format: +1234567890 -> +*******890
      const cleaned = this.cleanPhoneNumber(phoneNumber);
      if (cleaned.length > 4) {
        return cleaned.slice(0, -4).replace(/\d/g, maskChar) + cleaned.slice(-4);
      }
    }

    return phoneNumber;
  }

  // Validate phone number with custom rules
  validateWithRules(phoneNumber, rules = {}) {
    const result = this.validateAndNormalize(phoneNumber);

    if (!result.isValid) {
      return result;
    }

    // Apply custom rules
    if (rules.allowedCountries && rules.allowedCountries.length > 0) {
      if (!rules.allowedCountries.includes(result.countryCode)) {
        return {
          ...result,
          isValid: false,
          error: `Phone number from ${result.countryCode} is not allowed`
        };
      }
    }

    if (rules.blockedCountries && rules.blockedCountries.length > 0) {
      if (rules.blockedCountries.includes(result.countryCode)) {
        return {
          ...result,
          isValid: false,
          error: `Phone number from ${result.countryCode} is blocked`
        };
      }
    }

    if (rules.minLength && result.normalized.length < rules.minLength) {
      return {
        ...result,
        isValid: false,
        error: `Phone number must be at least ${rules.minLength} characters`
      };
    }

    if (rules.maxLength && result.normalized.length > rules.maxLength) {
      return {
        ...result,
        isValid: false,
        error: `Phone number cannot exceed ${rules.maxLength} characters`
      };
    }

    return result;
  }
}

module.exports = new PhoneValidator();

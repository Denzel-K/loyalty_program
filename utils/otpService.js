const crypto = require('crypto');

class OTPService {
  constructor() {
    this.otpLength = parseInt(process.env.OTP_LENGTH) || 6;
    this.otpExpireMinutes = parseInt(process.env.OTP_EXPIRE_MINUTES) || 5;
  }

  // Generate a random OTP
  generateOTP() {
    const otp = Math.floor(Math.random() * Math.pow(10, this.otpLength))
      .toString()
      .padStart(this.otpLength, '0');
    return otp;
  }

  // Generate OTP with expiration
  generateOTPWithExpiry() {
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + this.otpExpireMinutes * 60 * 1000);
    
    return {
      code: otp,
      expiresAt: expiresAt
    };
  }

  // Verify OTP
  verifyOTP(storedOTP, inputOTP, expiresAt, attempts = 0) {
    // Check if OTP exists
    if (!storedOTP) {
      return {
        success: false,
        message: 'No OTP found. Please request a new one.',
        code: 'NO_OTP'
      };
    }

    // Check if OTP has expired
    if (new Date() > new Date(expiresAt)) {
      return {
        success: false,
        message: 'OTP has expired. Please request a new one.',
        code: 'EXPIRED'
      };
    }

    // Check attempt limit
    if (attempts >= 3) {
      return {
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.',
        code: 'TOO_MANY_ATTEMPTS'
      };
    }

    // Verify OTP
    if (storedOTP !== inputOTP) {
      return {
        success: false,
        message: 'Invalid OTP. Please try again.',
        code: 'INVALID_OTP',
        attemptsRemaining: 3 - attempts - 1
      };
    }

    // OTP is valid
    return {
      success: true,
      message: 'OTP verified successfully.',
      code: 'VERIFIED'
    };
  }

  // Send OTP via SMS (placeholder - integrate with SMS service)
  async sendOTPSMS(phoneNumber, otp) {
    try {
      // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
      console.log(`Sending OTP ${otp} to ${phoneNumber}`);
      
      // For development, just log the OTP
      if (process.env.NODE_ENV === 'development') {
        console.log(`📱 OTP for ${phoneNumber}: ${otp}`);
        return {
          success: true,
          message: 'OTP sent successfully (development mode)',
          messageId: `dev_${Date.now()}`
        };
      }

      // In production, integrate with actual SMS service
      // Example with Twilio:
      /*
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
      
      const message = await client.messages.create({
        body: `Your verification code is: ${otp}. Valid for ${this.otpExpireMinutes} minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
      
      return {
        success: true,
        message: 'OTP sent successfully',
        messageId: message.sid
      };
      */

      return {
        success: false,
        message: 'SMS service not configured',
        code: 'SMS_NOT_CONFIGURED'
      };

    } catch (error) {
      console.error('Error sending OTP SMS:', error);
      return {
        success: false,
        message: 'Failed to send OTP',
        error: error.message,
        code: 'SMS_ERROR'
      };
    }
  }

  // Send OTP via Email (placeholder - integrate with email service)
  async sendOTPEmail(email, otp) {
    try {
      // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
      console.log(`Sending OTP ${otp} to ${email}`);
      
      // For development, just log the OTP
      if (process.env.NODE_ENV === 'development') {
        console.log(`📧 OTP for ${email}: ${otp}`);
        return {
          success: true,
          message: 'OTP sent successfully (development mode)',
          messageId: `dev_email_${Date.now()}`
        };
      }

      // In production, integrate with actual email service
      return {
        success: false,
        message: 'Email service not configured',
        code: 'EMAIL_NOT_CONFIGURED'
      };

    } catch (error) {
      console.error('Error sending OTP email:', error);
      return {
        success: false,
        message: 'Failed to send OTP',
        error: error.message,
        code: 'EMAIL_ERROR'
      };
    }
  }

  // Generate secure random token for other purposes
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Hash OTP for secure storage (optional)
  hashOTP(otp) {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  // Verify hashed OTP
  verifyHashedOTP(hashedOTP, inputOTP) {
    const inputHash = this.hashOTP(inputOTP);
    return hashedOTP === inputHash;
  }

  // Rate limiting helper
  isRateLimited(lastRequestTime, cooldownMinutes = 1) {
    if (!lastRequestTime) return false;
    
    const cooldownMs = cooldownMinutes * 60 * 1000;
    const timeSinceLastRequest = Date.now() - new Date(lastRequestTime).getTime();
    
    return timeSinceLastRequest < cooldownMs;
  }

  // Get remaining cooldown time
  getRemainingCooldown(lastRequestTime, cooldownMinutes = 1) {
    if (!lastRequestTime) return 0;
    
    const cooldownMs = cooldownMinutes * 60 * 1000;
    const timeSinceLastRequest = Date.now() - new Date(lastRequestTime).getTime();
    const remaining = cooldownMs - timeSinceLastRequest;
    
    return Math.max(0, Math.ceil(remaining / 1000)); // Return seconds
  }
}

module.exports = new OTPService();

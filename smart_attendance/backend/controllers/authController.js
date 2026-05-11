const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendMail } = require('../utils/mailer');

const OTP_LENGTH = Math.min(Math.max(parseInt(process.env.OTP_LENGTH || '6', 10), 4), 8);
const OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES || '10', 10);
const OTP_RESEND_COOLDOWN_SEC = parseInt(process.env.OTP_RESEND_COOLDOWN_SEC || '60', 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function generateOtp(length = OTP_LENGTH) {
  const max = 10 ** length;
  return String(crypto.randomInt(0, max)).padStart(length, '0');
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

// Login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Register
exports.register = async (req, res) => {
  try {
    const { username, email, password, role = 'teacher' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    const user = new User({
      username,
      email,
      password,
      role
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Request password reset OTP
exports.requestPasswordReset = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const user = await User.findOne({ email });

    if (!user || !user.isActive) {
      return res.json({
        success: true,
        message: 'If the account exists, an OTP has been sent to the email address.'
      });
    }

    const now = Date.now();
    if (user.resetOtpLastSentAt) {
      const secondsSinceLastSend = (now - user.resetOtpLastSentAt.getTime()) / 1000;
      if (secondsSinceLastSend < OTP_RESEND_COOLDOWN_SEC) {
        return res.status(429).json({
          success: false,
          error: `Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_SEC - secondsSinceLastSend)} seconds before requesting another OTP.`
        });
      }
    }

    const otp = generateOtp();
    user.resetOtpHash = hashOtp(otp);
    user.resetOtpExpiresAt = new Date(now + OTP_TTL_MINUTES * 60 * 1000);
    user.resetOtpAttempts = 0;
    user.resetOtpLastSentAt = new Date(now);
    await user.save();

    const subject = 'Your HPTU Attendance Admin Password Reset OTP';
    const text = `Your password reset OTP is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`;
    const html = `
      <p>Your password reset OTP is <strong>${otp}</strong>.</p>
      <p>This code expires in ${OTP_TTL_MINUTES} minutes. If you did not request a reset, you can ignore this email.</p>
    `;

    try {
      await sendMail({ to: user.email, subject, text, html });
    } catch (error) {
      console.error('Failed to send reset OTP email:', error.message);
      return res.status(500).json({
        success: false,
        error: error.code === 'MAILER_NOT_CONFIGURED'
          ? 'Email service not configured. Set SMTP settings in backend/.env.'
          : 'Failed to send reset OTP. Try again later.'
      });
    }

    return res.json({
      success: true,
      message: 'If the account exists, an OTP has been sent to the email address.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Reset password with OTP
exports.resetPasswordWithOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || '').trim();
    const newPassword = req.body.newPassword;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, OTP, and new password are required'
      });
    }

    const user = await User.findOne({ email });

    if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP'
      });
    }

    if (user.resetOtpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP'
      });
    }

    if (user.resetOtpAttempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        error: 'Too many invalid attempts. Please request a new OTP.'
      });
    }

    const otpHash = hashOtp(otp);
    if (otpHash !== user.resetOtpHash) {
      user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
      await user.save();

      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP'
      });
    }

    user.password = newPassword;
    user.resetOtpHash = null;
    user.resetOtpExpiresAt = null;
    user.resetOtpAttempts = 0;
    user.resetOtpLastSentAt = null;
    await user.save();

    return res.json({
      success: true,
      message: 'Password updated successfully. You can now sign in.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get current authenticated user
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

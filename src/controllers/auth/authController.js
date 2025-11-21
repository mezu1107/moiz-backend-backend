const User = require('../../models/user/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Generate JWT
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'fallback-secret-dev-2025', {
    expiresIn: '7d',
  });

// Email Transporter (Production + Dev Safe)
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  transporter.verify().then(() => console.log('Email ready')).catch(() => console.warn('Email not configured'));
} else {
  nodemailer.createTestAccount((err, account) => {
    if (err) return console.error('Test email failed');
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: account.user, pass: account.pass },
    });
    console.log('TEST EMAIL MODE → https://ethereal.email');
  });
}

// Register
const register = async (req, res) => {
  const { name, phone, email, password } = req.body;

  try {
    const existingUser = await User.findOne({
      $or: [{ email: email?.toLowerCase() }, { phone }]
    });

    if (existingUser) {
      const field = existingUser.email === email?.toLowerCase() ? 'Email' : 'Phone';
      return res.status(400).json({ success: false, message: `${field} already in use` });
    }

    const user = await User.create({
      name: name.trim(),
      phone,
      email: email ? email.toLowerCase().trim() : undefined,
      password,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

// Login
const login = async (req, res) => {
  const { email, phone, password } = req.body;

  try {
    const user = await User.findOne({
      $or: [{ email: email?.toLowerCase() }, { phone }]
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const token = generateToken(user._id);
    user.lastActiveAt = Date.now();
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// Other Auth Routes
const logout = (req, res) => res.json({ success: true, message: 'Logged out successfully' });

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        riderStatus: user.riderStatus,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
};

const forgotPassword = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });

  try {
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save({ validateBeforeSave: false });

    const resetURL = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    const mailOptions = {
      to: user.email || `${phone}@temp-mail.com`,
      from: `"FoodApp" <${process.env.EMAIL_USER || 'no-reply@foodapp.com'}>`,
      subject: 'Password Reset Request',
      html: `
        <h3>Password Reset</h3>
        <p>Click the link below to reset your password (valid for 10 minutes):</p>
        <a href="${resetURL}" style="padding:10px 20px; background:#007bff; color:white; text-decoration:none;">Reset Password</a>
        <p>Or copy: ${resetURL}</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Reset link sent to email (check spam)' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Failed to send reset link' });
  }
};

const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be 8+ characters' });
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const newToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password reset successful',
      token: newToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Password reset failed' });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  generateToken,
};
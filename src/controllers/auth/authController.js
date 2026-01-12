// src/controllers/auth/authController.js
const User = require('../../models/user/User');
const jwt = require('jsonwebtoken');
const emailRotator = require('../../utils/emailRotator');

// ==================== SECURE JWT ====================
const generateToken = (id) => {
  return jwt.sign(
    { id, iat: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET,
    { expiresIn: '7d', algorithm: 'HS256' }
  );
};

// ==================== INPUT VALIDATION PLACEHOLDERS ====================
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone) => {
  if (!phone) return false;
  // Remove spaces and convert 0092 → +92
  phone = phone.replace(/\s+/g, '').replace(/^0092/, '+92');
  // Match +92, 92, or 0 prefixes
  return /^(?:\+92|92|0)3[0-9]{9}$/.test(phone);
};

// Optional: normalize phone before saving or querying
const normalizePhone = (phone) => {
  if (!phone) return phone;
  phone = phone.replace(/\s+/g, '');       // remove spaces
  phone = phone.replace(/^0092/, '+92');   // 0092 → +92
  phone = phone.replace(/^0/, '+92');      // 0XXXXXXXXX → +92XXXXXXXXX
  return phone;
};

// ==================== OTP HELPERS ====================
const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

const sendOTPEmail = async (user, otp) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:420px;margin:40px auto;padding:35px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:18px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.2)">
      <h2 style="margin:0 0 20px;font-size:28px">FoodApp</h2>
      <p style="font-size:18px;margin:0 0 30px;opacity:.9">Your secure verification code</p>
      <div style="background:white;color:#667eea;padding:25px 45px;border-radius:18px;display:inline-block;font-size:62px;letter-spacing:16px;font-weight:bold">
        ${otp}
      </div>
      <p style="margin:30px 0 0;opacity:.9;font-size:15px">
        Valid for <strong>5 minutes</strong><br>
        Never share this code
      </p>
    </div>
  `;

  await emailRotator.sendMail({
    to: user.email || `${user.phone}@foodapp.pk`,
    subject: `FoodApp OTP: ${otp}`,
    html,
  });
};

// ==================== REGISTER ====================
const register = async (req, res) => {
  try {
    let { name, phone, email, password } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Name, phone, and password are required' });
    }

    phone = phone.trim();
    email = email?.toLowerCase().trim();

    if (email && !isValidEmail(email)) return res.status(400).json({ success: false, message: 'Invalid email format' });
    if (!isValidPhone(phone)) return res.status(400).json({ success: false, message: 'Invalid phone format' });
    if (password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });

    const existingUser = await User.findOne({
      $or: [{ phone }, email && { email }].filter(Boolean)
    });

    if (existingUser) {
      const field = existingUser.phone === phone ? 'Phone' : 'Email';
      return res.status(400).json({ success: false, message: `${field} already registered` });
    }

    const user = await User.create({
      name: name.trim(),
      phone,
      email: email || undefined,
      password,
      role: 'customer',
      city: 'RAWALPINDI' // explicitly set default city
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        city: user.city,
        currentLocation: user.currentLocation
      }
    });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

// ==================== LOGIN ====================
const login = async (req, res) => {
  try {
    let { email, phone, password } = req.body;
    if ((!email && !phone) || !password) {
      return res.status(400).json({ success: false, message: 'Email or phone and password are required' });
    }

    const lookup = email
      ? { email: email.toLowerCase().trim() }
      : { phone: phone.trim() };

    const user = await User.findOne(lookup).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account deactivated' });

    user.lastActiveAt = Date.now();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

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
        city: user.city,
        currentLocation: user.currentLocation
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// ==================== LOGOUT ====================
const logout = (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

// ==================== GET ME ====================
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -otp -otpExpires -otpAttempts');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        city: user.city,
        currentLocation: user.currentLocation,
        isActive: user.isActive,
        riderStatus: user.riderStatus,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('GetMe Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ==================== UPDATE PROFILE ====================
const updateMyProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    const updates = {};
    if (name) updates.name = name.trim();
    if (email) {
      const normalized = email.toLowerCase().trim();
      if (!isValidEmail(normalized)) return res.status(400).json({ success: false, message: 'Invalid email format' });

      if (normalized !== req.user.email) {
        const exists = await User.findOne({ email: normalized, _id: { $ne: userId } });
        if (exists) return res.status(400).json({ success: false, message: 'Email already in use' });
      }
      updates.email = normalized;
    }

    if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: 'No updates provided' });

    const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true }).select('name email phone city currentLocation');

    res.json({ success: true, message: 'Profile updated', user });
  } catch (err) {
    console.error('Update Profile Error:', err);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

// ==================== FORGOT PASSWORD ====================
// src/controllers/auth/authController.js → forgotPassword

const forgotPassword = async (req, res) => {
  try {
    const { email, phone } = req.body; // ← Destructure here

    if (!email && !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email or phone number is required' 
      });
    }

    // Normalize input
    const normalizedEmail = email ? email.toLowerCase().trim() : null;
    const normalizedPhone = phone ? phone.trim() : null;

    const user = normalizedEmail
      ? await User.findOne({ email: normalizedEmail })
      : await User.findOne({ phone: normalizedPhone });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'No account found with that email or phone' 
      });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    user.otpAttempts = 0;
    await user.save({ validateBeforeSave: false });

    await sendOTPEmail(user, otp);

    res.json({
      success: true,
      message: 'OTP sent successfully!',
      debug_otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (err) {
    console.error('Forgot Password Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process request. Please try again.' 
    });
  }
};

// ==================== VERIFY OTP ====================
const verifyOtp = async (req, res) => {
  try {
    let { email, phone, otp } = req.body;
    if (!otp || (!email && !phone)) return res.status(400).json({ success: false, message: 'OTP and email/phone are required' });

    const user = email
      ? await User.findOne({ email: email.toLowerCase().trim() }).select('+otp +otpExpires +otpAttempts')
      : await User.findOne({ phone: phone.trim() }).select('+otp +otpExpires +otpAttempts');

    if (!user) return res.status(404).json({ success: false, message: 'Account not found' });

    if (user.otpAttempts >= 5) return res.status(429).json({ success: false, message: 'Too many attempts. Try again later.' });

    if (user.otp !== otp || !user.otpExpires || user.otpExpires < Date.now()) {
      user.otpAttempts += 1;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
        attemptsLeft: 5 - user.otpAttempts
      });
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'OTP verified!',
      token,
      user: { id: user._id, name: user.name, phone: user.phone, email: user.email, city: user.city, currentLocation: user.currentLocation }
    });
  } catch (err) {
    console.error('Verify OTP Error:', err);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

// ==================== RESET PASSWORD ====================

const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const authHeader = req.headers.authorization;

    if (!password || password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters' 
      });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    user.password = password;
    await user.save();

    // Generate new login token
    const newToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password reset successfully!',
      token: newToken,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        city: user.city,
        currentLocation: user.currentLocation
      }
    });
  } catch (err) {
    console.error('Reset Password Error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Password reset failed' 
    });
  }
};

// ==================== CHANGE PASSWORD ====================
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Current and new password are required' });
    if (newPassword.length < 8) return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    if (await user.comparePassword(newPassword)) return res.status(400).json({ success: false, message: 'New password must be different' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully!' });
  } catch (err) {
    console.error('Change Password Error:', err);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateMyProfile,
  forgotPassword,
  verifyOtp,
  resetPassword,
  generateToken,
  changePassword
};

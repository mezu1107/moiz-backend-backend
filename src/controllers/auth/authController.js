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
  const { name, phone, email, password } = req.body;

  try {
    const trimmedPhone = phone?.trim();
    const trimmedEmail = email?.toLowerCase().trim();

    const existingUser = await User.findOne({
      $or: [
        { phone: trimmedPhone },
        trimmedEmail && { email: trimmedEmail }
      ].filter(Boolean)
    });

    if (existingUser) {
      const field = existingUser.phone === trimmedPhone ? 'Phone' : 'Email';
      return res.status(400).json({ success: false, message: `${field} already registered` });
    }

    const user = await User.create({
      name: name.trim(),
      phone: trimmedPhone,
      email: trimmedEmail || undefined,
      password,
      role: 'customer'
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
        role: user.role
      }
    });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

// ==================== LOGIN ====================
const login = async (req, res) => {
  const { email, phone, password } = req.body;

  try {
    const lookup = email
      ? { email: email.toLowerCase().trim() }
      : { phone: phone.trim() };

    const user = await User.findOne(lookup).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }

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
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// ==================== LOGOUT (Client-side only) ====================
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
        isActive: user.isActive,
        riderStatus: user.riderStatus,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ==================== UPDATE PROFILE (Customer Only) ====================
const updateMyProfile = async (req, res) => {
  const { name, email } = req.body;
  const userId = req.user.id;

  try {
    const updates = {};
    if (name) updates.name = name.trim();
    if (email) {
      const normalized = email.toLowerCase().trim();
      if (normalized !== req.user.email) {
        const exists = await User.findOne({ email: normalized, _id: { $ne: userId } });
        if (exists) return res.status(400).json({ success: false, message: 'Email already in use' });
      }
      updates.email = normalized;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No updates provided' });
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true
    }).select('name email phone');

    res.json({
      success: true,
      message: 'Profile updated',
      user
    });
  } catch (err) {
    console.error('Update Profile Error:', err);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

// ==================== FORGOT PASSWORD ====================
const forgotPassword = async (req, res) => {
  const { email, phone } = req.body;

  try {
    const user = email
      ? await User.findOne({ email: email.toLowerCase().trim() })
      : await User.findOne({ phone: phone.trim() });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    user.otpAttempts = 0;
    await user.save({ validateBeforeSave: false });

    await sendOTPEmail(user, otp);
    console.log(`OTP sent to ${user.phone}: ${otp}`);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      debug_otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (err) {
    console.error('Forgot Password Error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

// ==================== VERIFY OTP ====================
const verifyOtp = async (req, res) => {
  const { email, phone, otp } = req.body;

  try {
    const user = email
      ? await User.findOne({ email: email.toLowerCase().trim() }).select('+otp +otpExpires +otpAttempts')
      : await User.findOne({ phone: phone.trim() }).select('+otp +otpExpires +otpAttempts');

    if (!user) return res.status(404).json({ success: false, message: 'Account not found' });

    if (user.otpAttempts >= 5) {
      return res.status(429).json({ success: false, message: 'Too many attempts. Try again later.' });
    }

    if (user.otp !== otp || !user.otpExpires || user.otpExpires < Date.now()) {
      user.otpAttempts += 1;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
        attemptsLeft: 5 - user.otpAttempts
      });
    }

    // Success
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'OTP verified!',
      token,
      user: { id: user._id, name: user.name, phone: user.phone, email: user.email }
    });
  } catch (err) {
    console.error('Verify OTP Error:', err);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

// ==================== RESET PASSWORD ====================
const resetPassword = async (req, res) => {
  const { password } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = password;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully!',
      token: generateToken(user._id)
    });
  } catch (err) {
    console.error('Reset Password Error:', err);
    res.status(500).json({ success: false, message: 'Password reset failed' });
  }
};
// ==================== CHANGE PASSWORD (While Logged In) ====================
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password and new password are required'
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 8 characters'
    });
  }

  try {
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Prevent reuse of same password
    if (await user.comparePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Optional: Send email notification
    // await sendPasswordChangedEmail(user);

    res.json({
      success: true,
      message: 'Password changed successfully!'
    });
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
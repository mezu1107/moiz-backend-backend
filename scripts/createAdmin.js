// scripts/createAdmin.js
const mongoose = require('mongoose');
const User = require('../src/models/user/User');
const bcrypt = require('bcryptjs');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const hashed = await bcrypt.hash('admin123', 12);
  
  const admin = await User.findOneAndUpdate(
    { phone: '03001234567' },
    {
      name: 'Main Admin',
      phone: '03001234567',
      email: 'admin@amfood.pk',
      password: hashed,
      role: 'admin',
      isActive: true
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('ADMIN CREATED/UPDATED:', admin.name, admin.role);
  process.exit();
})();
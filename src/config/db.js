// src/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI not defined in environment');
    }

    await mongoose.connect(process.env.MONGO_URI, {
      tls: true,             // enable TLS/SSL
      tlsInsecure: false,    // validate server certificate
      serverSelectionTimeoutMS: 10000, // fail fast if cluster unreachable
    });

    console.log('✅ MongoDB Connected Successfully');
  } catch (err) {
    console.error('❌ MongoDB Connection Failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;



// const mongoose = require('mongoose');

// const connectDB = async () => {
//   if (!process.env.MONGO_URI) {
//     throw new Error('MONGO_URI not defined');
//   }

//   mongoose.set('strictQuery', true);

//   const conn = await mongoose.connect(process.env.MONGO_URI, {
//     serverSelectionTimeoutMS: 10000,
//   });

//   console.log('✅ MongoDB Connected Successfully');
//   return conn;
// };

// module.exports = connectDB;

const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Create indexes for better performance
    await createIndexes();

  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // Wait for connection to be established
    if (mongoose.connection.readyState === 1) {
      // Customer indexes
      await mongoose.connection.db.collection('customers').createIndex(
        { phoneNumber: 1 },
        { unique: true }
      );

      // Business indexes
      await mongoose.connection.db.collection('businesses').createIndex(
        { email: 1 },
        { unique: true }
      );

      await mongoose.connection.db.collection('businesses').createIndex(
        { phoneNumber: 1 }
      );

      // Visit indexes
      await mongoose.connection.db.collection('visits').createIndex(
        { customer: 1, business: 1, visitDate: -1 }
      );

      await mongoose.connection.db.collection('visits').createIndex(
        { business: 1, visitDate: -1 }
      );

      // Reward indexes
      await mongoose.connection.db.collection('rewards').createIndex(
        { business: 1, isActive: 1 }
      );

      console.log('Database indexes created successfully');
    }
  } catch (error) {
    console.error('Error creating indexes:', error.message);
  }
};

module.exports = connectDB;
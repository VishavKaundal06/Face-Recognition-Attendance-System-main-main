const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Prefer environment variable, but fall back to the provided remote URI when not set.
    const defaultUri = 'mongodb+srv://vishavkaundal2005_db_user:vishav06@cluster0.rehfle4.mongodb.net/?appName=Cluster0';
    const mongoUri = process.env.MONGO_URI || defaultUri;
    const conn = await mongoose.connect(mongoUri);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    const canStartWithoutDb =
      process.env.ALLOW_START_WITHOUT_DB === 'true' ||
      (process.env.ALLOW_START_WITHOUT_DB !== 'false' && process.env.NODE_ENV !== 'production');

    if (canStartWithoutDb) {
      console.warn(`MongoDB connection unavailable: ${error.message}`);
      console.warn('Starting backend in degraded mode (database-dependent APIs may fail).');
      return null;
    }

    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

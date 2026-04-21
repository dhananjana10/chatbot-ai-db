import mongoose from 'mongoose';

/**
 * Connect to MongoDB database
 * @param uri MongoDB connection string
 * @param options Optional mongoose connection options
 * @returns Promise<mongoose.Connection> Mongoose connection instance
 */
export async function connect(uri: string, options: mongoose.ConnectOptions = {}): Promise<mongoose.Connection> {
  try {
    if (!uri) {
      throw new Error('MongoDB connection URI is required');
    }
    
    // Set default options
    const defaultOptions: mongoose.ConnectOptions = {
      autoIndex: true, // Build indexes
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    };
    
    // Merge with user-provided options
    const connectionOptions = { ...defaultOptions, ...options };
    
    // Connect to the MongoDB database
    await mongoose.connect(uri, connectionOptions);
    
    console.log('Connected to MongoDB successfully');
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
    return mongoose.connection;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB database
 */
export async function disconnect(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('MongoDB disconnected successfully');
  }
}

/**
 * Get connection status
 * @returns boolean True if connected, false otherwise
 */
export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer: MongoMemoryServer | null = null;

export async function connectDatabase(): Promise<string> {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    try {
      console.log(`[DB] Attempting connection to MongoDB at ${uri.split('@').pop()}...`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log('[DB] Connected successfully to provided MongoDB URI.');
      return uri;
    } catch (err) {
      console.warn('[DB] Connection to provided MONGODB_URI failed. Falling back to embedded MongoMemoryServer:', err);
    }
  }

  // Use embedded in-memory MongoDB for local dev & testing
  try {
    console.log('[DB] Starting embedded MongoMemoryServer for reliable zero-setup operation...');
    mongoMemoryServer = await MongoMemoryServer.create();
    const memUri = mongoMemoryServer.getUri();
    await mongoose.connect(memUri);
    console.log(`[DB] Connected to embedded MongoMemoryServer at ${memUri}`);
    return memUri;
  } catch (err) {
    console.error('[DB] Failed to start MongoMemoryServer:', err);
    throw err;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
}

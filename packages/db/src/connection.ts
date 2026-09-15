// packages/db/src/connection.ts
import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB(uri: string): Promise<void> {
  if (isConnected) return;
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  isConnected = true;
  console.log('[DB] MongoDB connected');
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log('[DB] MongoDB disconnected');
}

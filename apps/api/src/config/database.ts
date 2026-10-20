import mongoose from 'mongoose';
import { env } from './env.js';
import type { DatabaseStatus } from '@peerspace/shared';

const STATE_MAP: Record<number, DatabaseStatus> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export const getDatabaseStatus = (): DatabaseStatus => {
  const readyState = mongoose.connection.readyState;
  return STATE_MAP[readyState] || 'disconnected';
};

export interface DatabaseHealthInfo {
  status: DatabaseStatus;
  name: string | null;
  host: string | null;
  latencyMs: number | null;
  error?: string;
}

export const checkDatabaseHealth = async (): Promise<DatabaseHealthInfo> => {
  const status = getDatabaseStatus();

  if (status !== 'connected' || !mongoose.connection.db) {
    return {
      status,
      name: mongoose.connection.name || null,
      host: mongoose.connection.host || null,
      latencyMs: null,
      error: status === 'disconnected' ? 'Database is not connected' : undefined,
    };
  }

  const start = Date.now();
  try {
    // Non-destructive ping command
    await mongoose.connection.db.admin().ping();
    const latencyMs = Date.now() - start;

    return {
      status: 'connected',
      name: mongoose.connection.name || null,
      host: mongoose.connection.host || null,
      latencyMs,
    };
  } catch (error) {
    return {
      status: 'disconnected',
      name: mongoose.connection.name || null,
      host: mongoose.connection.host || null,
      latencyMs: null,
      error: error instanceof Error ? error.message : 'Unknown database ping failure',
    };
  }
};

export const connectDatabase = async (): Promise<void> => {
  const uri = env.MONGODB_URI;

  mongoose.connection.on('connected', () => {
    console.log(
      `[Database] Connected to MongoDB at ${mongoose.connection.host}/${mongoose.connection.name}`
    );
  });

  mongoose.connection.on('error', (err) => {
    console.error('[Database] MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[Database] MongoDB disconnected');
  });

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      autoIndex: env.NODE_ENV !== 'production',
    });
  } catch (error) {
    console.error(
      '[Database] Failed to establish initial MongoDB connection:',
      error instanceof Error ? error.message : error
    );
    // In production or test, callers may want to decide whether to throw or continue in degraded mode
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB connection closed gracefully');
  }
};

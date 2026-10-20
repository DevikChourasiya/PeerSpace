import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { notFoundHandler } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';

export interface AppOptions {
  sessionStore?: session.Store;
}

export const createApp = (options: AppOptions = {}) => {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Request logging (skip during test suite)
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session store and middleware
  const store =
    options.sessionStore ||
    MongoStore.create({
      mongoUrl: env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: 14 * 24 * 60 * 60, // 14 days
      autoRemove: 'native',
    });

  app.use(
    session({
      name: 'peerspace.sid',
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store,
      cookie: {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // API Routes
  app.use('/api', apiRouter);

  // 404 handler
  app.use(notFoundHandler);

  // Central error handler
  app.use(errorHandler);

  return app;
};

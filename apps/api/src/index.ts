import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { startRoundScheduler, stopRoundScheduler } from './services/roundScheduler.service.js';

const startServer = async () => {
  const app = createApp();
  const server = http.createServer(app);

  // Attempt database connection
  try {
    await connectDatabase();
    startRoundScheduler();
  } catch (err) {
    console.warn(
      '[Startup] Database connection could not be established immediately. The server will start in degraded mode.',
      err instanceof Error ? err.message : err
    );
  }

  // Start HTTP listener
  server.listen(env.PORT, () => {
    console.log(`🚀 PeerSpace API running on http://localhost:${env.PORT}`);
    console.log(`📡 Health endpoint available at http://localhost:${env.PORT}/api/health`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
  });

  // Graceful shutdown handling
  let isShuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    const forceExitTimeout = setTimeout(() => {
      console.error('⚠️ Shutdown timeout exceeded (10s). Forcing process exit.');
      process.exit(1);
    }, 10000);
    forceExitTimeout.unref();

    try {
      // 0. Stop background scheduler
      stopRoundScheduler();

      // 1. Close HTTP server
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) return reject(err);
          console.log('✅ HTTP server closed');
          resolve();
        });
      });

      // 2. Disconnect database
      await disconnectDatabase();

      console.log('✅ Graceful shutdown completed cleanly');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
  });
};

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

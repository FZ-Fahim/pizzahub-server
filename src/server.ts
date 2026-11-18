import app from './app.js';
import { connectDB, closeDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

let server: ReturnType<typeof app.listen>;

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  server = app.listen(PORT, () => {
    console.log(`[Server] PizzaHub server is running on port ${PORT}`);
    console.log(`[Server] Health check available at http://localhost:${PORT}/health`);
  });
};

const handleGracefulShutdown = async (signal: string) => {
  console.log(`[Server] Received ${signal}. Closing HTTP server and DB connections gracefully...`);
  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await closeDB();
      process.exit(0);
    });
  } else {
    await closeDB();
    process.exit(0);
  }
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

startServer();

export default app;

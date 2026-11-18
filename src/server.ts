import app from './app';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[Server] PizzaHub server is running on port ${PORT}`);
  console.log(`[Server] Health check available at http://localhost:${PORT}/health`);
});

const handleGracefulShutdown = (signal: string) => {
  console.log(`[Server] Received ${signal}. Closing HTTP server gracefully...`);
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

export default server;

require("dotenv").config();
const KingsFormsServer = require("./src/server");
const logger = require("./src/logger");

const server = new KingsFormsServer();

async function startServer() {
  try {
    const port = process.env.PORT || 3000;
    await server.start(port);

    // Graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("Received SIGINT, shutting down gracefully...");
      await server.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM, shutting down gracefully...");
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

startServer();

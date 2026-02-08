const winston = require("winston");
const path = require("path");
const fs = require("fs-extra");

const logDir = path.join(process.cwd(), "logs");

// Ensure log directory exists
fs.ensureDirSync(logDir);

// Custom log format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: customFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
    }),
  ],
});

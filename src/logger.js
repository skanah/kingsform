// @ts-nocheck
const winston = require("winston");
const path = require("path");
const fs = require("fs-extra");

const logDir = path.join(__dirname, "..", "logs");
fs.ensureDirSync(logDir);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "kingsforms-automation" },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
    }),
  ],
});

// If we're not in production then log to the console with a simple format
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

module.exports = logger;

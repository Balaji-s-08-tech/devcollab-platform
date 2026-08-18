const winston = require("winston");
const path = require("path");

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "warn" : "debug"),
  format: combine(timestamp(), errors({ stack: true }), json()),
  defaultMeta: { service: "devcollab-api" },
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === "production"
          ? combine(timestamp(), json())
          : combine(colorize(), simple()),
    }),
  ],
});

if (process.env.NODE_ENV === "production") {
  logger.add(

  );
  logger.add(

  );
}

logger.http = (msg) => logger.log("http", msg);

module.exports = logger;

import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

// Custom format for log messages
const logFormat = printf(({ level, message, timestamp, service, ...metadata }) => {
  let msg = `${timestamp} [${service}] ${level}: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Create a logger instance
export const setupLogger = (service) => {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
    defaultMeta: { service },
    transports: [
      // Write all logs to console
      new winston.transports.Console({
        format: combine(
          colorize(),
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          logFormat
        )
      }),
      // Write all logs with level 'error' and below to error.log
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      // Write all logs to combined.log
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ]
  });

  // Create logs directory if it doesn't exist
  if (process.env.NODE_ENV !== 'test') {
    logger.on('error', (error) => {
      console.error('Logger error:', error);
    });
  }

  return logger;
}; 
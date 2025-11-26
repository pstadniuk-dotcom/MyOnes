/**
 * Centralized logging configuration using Winston
 * 
 * Usage:
 *   import { logger } from './logger';
 *   logger.info('Message');
 *   logger.error('Error message', { error: err });
 *   logger.warn('Warning');
 *   logger.debug('Debug info', { data: someData });
 */

import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom format for development (readable)
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Determine log level based on environment
const getLogLevel = (): string => {
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
};

// Create the logger instance
export const logger = winston.createLogger({
  level: getLogLevel(),
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    process.env.NODE_ENV === 'production' ? json() : devFormat
  ),
  defaultMeta: { service: 'ones-api' },
  transports: [
    // Console transport - always active
    new winston.transports.Console({
      format: combine(
        colorize({ all: process.env.NODE_ENV !== 'production' }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        process.env.NODE_ENV === 'production' ? json() : devFormat
      ),
    }),
  ],
});

// Log startup info
logger.info('Logger initialized', {
  level: getLogLevel(),
  environment: process.env.NODE_ENV || 'development',
});

// Export convenience methods for common log patterns
export const logRequest = (method: string, path: string, userId?: string) => {
  logger.info('API Request', { method, path, userId });
};

export const logError = (message: string, error: unknown, context?: Record<string, unknown>) => {
  const errorDetails = error instanceof Error 
    ? { name: error.name, message: error.message, stack: error.stack }
    : { error: String(error) };
  
  logger.error(message, { ...errorDetails, ...context });
};

export const logAuth = (event: string, userId?: string, success = true) => {
  const level = success ? 'info' : 'warn';
  logger[level](`Auth: ${event}`, { userId, success });
};

export const logDatabase = (operation: string, table: string, duration?: number) => {
  logger.debug('Database operation', { operation, table, duration });
};

export default logger;

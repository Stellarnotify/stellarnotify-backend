import winston from 'winston';

const { combine, timestamp, json, colorize, simple } = winston.format;

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Application-wide Winston logger.
 * - Production: JSON format (structured, machine-readable)
 * - Development/test: colourised simple format (human-readable)
 */
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
  format: isProduction
    ? combine(timestamp(), json())
    : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), simple()),
  transports: [new winston.transports.Console()],
});

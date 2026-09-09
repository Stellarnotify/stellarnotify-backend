import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../../config';

/**
 * Rate limiter middleware using sliding window algorithm.
 * Limits requests per API key (from Authorization header) or IP address.
 * Default: 100 requests per minute per key/IP.
 */
export const apiRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  
  // Use API key from Authorization header as identifier, fallback to IP
  keyGenerator: (req: Request): string => {
    const authHeader = req.headers['authorization'];
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      return `apikey:${token}`;
    }
    
    // Fallback to IP address
    return `ip:${req.ip}`;
  },
  
  // Custom handler for rate limit exceeded
  handler: (req: Request, res: Response): void => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
  
  // Skip rate limiting for health check endpoint
  skip: (req: Request): boolean => {
    return req.path === '/health';
  },
});

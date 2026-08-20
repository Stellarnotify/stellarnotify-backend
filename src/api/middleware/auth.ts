import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that enforces Bearer token authentication.
 * Expects an `Authorization: Bearer <token>` header on every request.
 * Returns 401 if the header is missing or the token does not match API_KEY.
 */
export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (token !== process.env.API_KEY) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  next();
}

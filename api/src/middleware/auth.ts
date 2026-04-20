import { Request, Response, NextFunction } from 'express';

const VALID_ROLES = ['veterinario', 'recepcion', 'administrador'] as const;
type UserRole = typeof VALID_ROLES[number];

// Extend Express Request type to carry decoded auth data
declare global {
  namespace Express {
    interface Request {
      userRole: UserRole;
      vetId: number | null;
    }
  }
}

/**
 * Middleware that decodes a simple base64 Bearer token from the
 * Authorization header and attaches userRole + vetId to the request.
 *
 * Token format: base64(role:vetId)  where vetId is optional (only for veterinario).
 * Example token for vet #2: base64("veterinario:2")
 * Example token for recepcion: base64("recepcion:")
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();

  let decoded: string;
  try {
    decoded = Buffer.from(token, 'base64').toString('utf8');
  } catch {
    res.status(401).json({ error: 'Invalid token encoding' });
    return;
  }

  // Expected format: "role:vetId" — vetId may be empty string for non-vet roles
  const colonIndex = decoded.indexOf(':');
  if (colonIndex === -1) {
    res.status(401).json({ error: 'Invalid token format' });
    return;
  }

  const role = decoded.slice(0, colonIndex) as UserRole;
  const vetIdRaw = decoded.slice(colonIndex + 1);

  if (!VALID_ROLES.includes(role)) {
    res.status(401).json({ error: `Invalid role: ${role}` });
    return;
  }

  if (role === 'veterinario') {
    const vetId = parseInt(vetIdRaw, 10);
    if (!vetIdRaw || isNaN(vetId) || vetId <= 0) {
      res.status(401).json({ error: 'veterinario role requires a valid vet_id in token' });
      return;
    }
    req.userRole = role;
    req.vetId = vetId;
  } else {
    req.userRole = role;
    req.vetId = null;
  }

  next();
}

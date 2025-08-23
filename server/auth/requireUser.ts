import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../env';
import type { SessionPayload } from './session';

export interface AuthenticatedRequest extends Request {
  user: SessionPayload;
}

export function requireUser(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.pp_session;
  
  if (!token) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  try {
    const payload = jwt.verify(token, ENV.SESSION_SECRET, {
      audience: 'passpilot',
      issuer: 'passpilot',
    }) as SessionPayload;
    
    (req as AuthenticatedRequest).user = payload;
    next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireUser(req, res, () => {
    const authReq = req as AuthenticatedRequest;
    if (authReq.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'admin_required' });
      return;
    }
    next();
  });
}
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../env';
import type { SessionPayload } from './session';

export interface AuthenticatedRequest extends Request {
  user: SessionPayload;
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.pp_session;
  
  if (!token) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const payload = jwt.verify(token, ENV.SESSION_SECRET, {
      audience: 'passpilot',
      issuer: 'passpilot',
    }) as SessionPayload;
    
    (req as AuthenticatedRequest).user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireUser(req, res, () => {
    const authReq = req as AuthenticatedRequest;
    if (authReq.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'admin_required' });
    }
    next();
  });
}
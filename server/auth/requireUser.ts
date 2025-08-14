import type { Request, Response, NextFunction } from 'express';
import { getUserFromSession } from './session';

export function requireUser(req: any, res: Response, next: NextFunction) {
  const token = req.cookies?.pp_session;
  if (!token) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const user = getUserFromSession(token);
  if (!user) {
    return res.status(401).json({ error: 'invalid_session' });
  }

  // Attach user info to request
  req.user = user;
  next();
}

export function optionalUser(req: any, res: Response, next: NextFunction) {
  const token = req.cookies?.pp_session;
  if (token) {
    const user = getUserFromSession(token);
    if (user) {
      req.user = user;
    }
  }
  next();
}
import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../env';

export type SessionPayload = {
  userId: string;
  schoolId: string;
  role: 'ADMIN' | 'TEACHER' | 'STAFF' | 'STUDENT';
};

const COOKIE_NAME = 'pp_session';

export function setUserSession(res: Response, payload: SessionPayload) {
  const token = jwt.sign(payload, ENV.SESSION_SECRET, {
    expiresIn: '7d',
    audience: 'passpilot',
    issuer: 'passpilot',
  });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: ENV.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearUserSession(res: Response) {
  res.clearCookie(COOKIE_NAME, { 
    httpOnly: true, 
    sameSite: 'strict', 
    secure: ENV.NODE_ENV === 'production' 
  });
}

export function getSessionToken(req: any): string | null {
  return req.cookies?.pp_session || null;
}
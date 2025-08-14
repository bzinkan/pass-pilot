import type { Response } from 'express';
import jwt from 'jsonwebtoken';

export type SessionPayload = {
  userId: string;
  schoolId: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STAFF';
};

const COOKIE_NAME = 'pp_session';

export function setUserSession(res: Response, payload: SessionPayload) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d',
    audience: 'passpilot',
    issuer: 'passpilot',
  });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearUserSession(res: Response) {
  res.clearCookie(COOKIE_NAME, { 
    httpOnly: true, 
    sameSite: 'strict', 
    secure: process.env.NODE_ENV === 'production' 
  });
}

export function getUserFromSession(token: string): SessionPayload | null {
  if (!process.env.JWT_SECRET) {
    return null;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      audience: 'passpilot',
      issuer: 'passpilot',
    }) as SessionPayload;
    return payload;
  } catch {
    return null;
  }
}
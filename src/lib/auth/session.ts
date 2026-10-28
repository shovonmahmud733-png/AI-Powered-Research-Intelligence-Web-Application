import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { User } from '../db/types';

const JWT_SECRET = process.env.JWT_SECRET || 'research-intelligence-platform-secure-jwt-key-2025';

export interface TokenPayload {
  userId: string;
  email: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signPasswordResetToken(payload: TokenPayload): string {
  return jwt.sign({ ...payload, purpose: 'password_reset' }, JWT_SECRET, { expiresIn: '1h' });
}

export function verifyPasswordResetToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload & { purpose?: string };
    if (decoded.purpose !== 'password_reset') return null;
    return { userId: decoded.userId, email: decoded.email };
  } catch (err) {
    return null;
  }
}

export function getSessionUser(
  req: Request,
  options?: { allowDemoFallback?: boolean }
): User | null {
  const allowDemo = options?.allowDemoFallback ?? true;

  try {
    // 1. Check Authorization header
    const authHeader = req.headers.get('authorization');
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // 2. Check Cookie
    if (!token) {
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(/auth_token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }

    if (!token) {
      // If demo fallback permitted, return demo user
      if (allowDemo) {
        return db.getUserById('usr_demo_researcher_01') || null;
      }
      return null;
    }

    const payload = verifyToken(token);
    if (!payload) {
      return null;
    }

    const user = db.getUserById(payload.userId);
    if (!user) {
      return {
        id: payload.userId,
        name: payload.email.split('@')[0],
        email: payload.email,
        passwordHash: '',
        institution: 'Academic Institution',
        fieldOfStudy: 'Scientific Research',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return user;
  } catch (err) {
    return null;
  }
}

export function getStrictSessionUser(req: Request): User | null {
  return getSessionUser(req, { allowDemoFallback: false });
}

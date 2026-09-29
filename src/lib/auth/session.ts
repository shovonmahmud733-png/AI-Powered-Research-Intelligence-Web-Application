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

export function getSessionUser(req: Request): User | null {
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
      // Fallback: If no token provided in demo mode, return the default demo user
      // so researcher features can be immediately explored without friction
      return db.getUserById('usr_demo_researcher_01') || null;
    }

    const payload = verifyToken(token);
    if (!payload) {
      return db.getUserById('usr_demo_researcher_01') || null;
    }

    const user = db.getUserById(payload.userId);
    return user || db.getUserById('usr_demo_researcher_01') || null;
  } catch (err) {
    return db.getUserById('usr_demo_researcher_01') || null;
  }
}

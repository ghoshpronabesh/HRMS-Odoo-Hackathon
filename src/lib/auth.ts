import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'ice-penguin-hrms-secret-key-2026-hackathon';

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith('$argon2')) {
    try {
      return await argon2.verify(hash, password);
    } catch (err) {
      console.error('Argon2 verification error:', err);
      return false;
    }
  } else {
    // Fallback to bcrypt
    return bcrypt.compare(password, hash);
  }
}

export function signToken(payload: { employee_id: string; email: string; role: 'employee' | 'hr' }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { employee_id: string; email: string; role: 'employee' | 'hr' };
  } catch (error) {
    return null;
  }
}

export function getSessionToken(req: NextRequest): string | null {
  // Check cookie first
  const cookieToken = req.cookies.get('session_token')?.value;
  if (cookieToken) return cookieToken;

  // Check authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

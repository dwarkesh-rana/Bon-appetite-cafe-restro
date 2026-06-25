import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'bonappetite_jwt_super_secret_key_2026';

if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'bonappetite_jwt_super_secret_key_2026')) {
  logger.error('[Security Warning] JWT_SECRET is not configured or using default key in production mode. Set process.env.JWT_SECRET!');
}

const JWT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface UserTokenPayload {
  email: string;
  role: 'admin' | 'staff' | 'customer' | 'owner' | 'manager' | 'kitchen';
  exp: number;
}

// Extend Request type to include auth information
export interface AuthenticatedRequest extends Request {
  user?: UserTokenPayload;
}

/**
 * PBKDF2 Password Hashing
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * PBKDF2 Password Verification
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

/**
 * Native JWT signing using HMAC SHA256
 */
export function generateToken(email: string, role: 'admin' | 'staff' | 'customer' | 'owner' | 'manager' | 'kitchen'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  
  const payload: UserTokenPayload = {
    email,
    role,
    exp: Date.now() + JWT_EXPIRY_MS,
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payloadBase64}`)
    .digest('base64url');
    
  return `${header}.${payloadBase64}.${signature}`;
}

/**
 * Native JWT verification
 */
export function verifyToken(token: string): UserTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, payload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');
      
    if (signature !== expectedSignature) {
      logger.warn('[Auth] Invalid signature detected.');
      return null;
    }
    
    const decodedPayload: UserTokenPayload = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    );
    
    if (Date.now() > decodedPayload.exp) {
      logger.warn(`[Auth] Expired token for ${decodedPayload.email}`);
      return null;
    }
    
    return decodedPayload;
  } catch (err) {
    logger.error('[Auth] Token decode error:', err);
    return null;
  }
}

/**
 * Express Authentication Middleware
 */
export function authenticateAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  
  const allowedRoles = ['admin', 'staff', 'owner', 'manager', 'kitchen'];
  if (!payload || !allowedRoles.includes(payload.role)) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  
  req.user = payload;
  next();
}

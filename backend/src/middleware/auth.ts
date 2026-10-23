import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../types/index.js';
import { Application } from '../models/Application.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'onboardiq-super-secret-production-key-bfsi-2026';

export interface AuthenticatedUser {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId?: string;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // Check cookie or Bearer token header
  const token =
    req.cookies?.onboardiq_token ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.substring(7)
      : null);

  if (!token) {
    res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Please log in.',
      requestId: req.requestId,
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({
      code: 'TOKEN_INVALID',
      message: 'Session has expired or token is invalid. Please log in again.',
      requestId: req.requestId,
    });
  }
}

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
        requestId: req.requestId,
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        code: 'FORBIDDEN',
        message: `Access denied. Role ${req.user.role} is not authorized for this resource.`,
        requestId: req.requestId,
      });
      return;
    }

    next();
  };
}

/**
 * Strict Ownership Guard (Prevents IDOR as required by FR-1 and Security Protocol)
 * Applicants can only access applications matching their own applicantId / userId.
 */
export async function checkApplicationOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required.' });
    return;
  }

  // KYC Officers, Compliance Officers, and Admins can view any case in the workflow
  if (['MAKER', 'CHECKER', 'ADMIN'].includes(req.user.role)) {
    return next();
  }

  const applicationId = req.params.applicationId || req.body?.applicationId;
  if (!applicationId) {
    return next();
  }

  const app = await Application.findOne({ applicationId }).lean();
  if (!app) {
    res.status(404).json({ code: 'NOT_FOUND', message: 'Application not found.' });
    return;
  }

  if (app.applicantId !== req.user.userId && app.applicantId !== req.user.username) {
    res.status(403).json({
      code: 'FORBIDDEN',
      message: 'Access denied: You do not have permission to view or modify this application.',
      requestId: req.requestId,
    });
    return;
  }

  next();
}

/**
 * Double Submit CSRF token protection for state-changing requests
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Safe HTTP methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Verify CSRF header or Origin/Referer
  const csrfHeader = req.headers['x-csrf-token'];
  const csrfCookie = req.cookies?.['onboardiq_csrf'];

  // If using cookie-based authentication, enforce CSRF
  if (req.cookies?.onboardiq_token) {
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      res.status(403).json({
        code: 'CSRF_VALIDATION_FAILED',
        message: 'Invalid or missing CSRF token.',
        requestId: req.requestId,
      });
      return;
    }
  }

  next();
}

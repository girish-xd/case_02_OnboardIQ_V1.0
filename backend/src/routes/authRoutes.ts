import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { User } from '../models/User.js';
import { JWT_SECRET, authenticate } from '../middleware/auth.js';
import { auditService } from '../services/auditService.js';

const router = Router();

const RegisterSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(6),
  fullName: z.string().min(2),
  email: z.string().email(),
});

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// POST /api/v1/auth/register
router.post('/register', async (req: Request, res: Response, next) => {
  try {
    const data = RegisterSchema.parse(req.body);
    const existing = await User.findOne({
      $or: [{ username: data.username }, { email: data.email }],
    });

    if (existing) {
      res.status(400).json({ code: 'USER_EXISTS', message: 'Username or email already in use.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await User.create({
      username: data.username,
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      role: 'APPLICANT',
      applicantId: data.username,
    });

    await auditService.log({
      action: 'USER_REGISTERED',
      actorId: user._id.toString(),
      actorRole: 'APPLICANT',
      actorEmail: user.email,
      entityType: 'User',
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Account registered successfully.',
      user: {
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response, next) => {
  try {
    const { username, password } = LoginSchema.parse(req.body);
    const user = await User.findOne({ username });

    if (!user) {
      res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Invalid username or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Invalid username or password.' });
      return;
    }

    const payload = {
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
    const csrfToken = crypto.randomBytes(32).toString('hex');

    // Secure HttpOnly Cookie
    res.cookie('onboardiq_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.cookie('onboardiq_csrf', csrfToken, {
      httpOnly: false, // Accessible to client JS for x-csrf-token header
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    await auditService.log({
      action: 'USER_LOGIN',
      actorId: user._id.toString(),
      actorRole: user.role,
      actorEmail: user.email,
      entityType: 'User',
      ipAddress: req.ip,
    });

    res.json({
      message: 'Login successful.',
      user: payload,
      csrfToken,
      token, // Also return token for headless / mobile / testing environments
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  res.json({
    user: req.user,
    csrfToken: req.cookies?.onboardiq_csrf,
  });
});

// POST /api/v1/auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  if (req.user) {
    await auditService.log({
      action: 'USER_LOGOUT',
      actorId: req.user.userId,
      actorRole: req.user.role,
      actorEmail: req.user.email,
      entityType: 'User',
      ipAddress: req.ip,
    });
  }

  res.clearCookie('onboardiq_token');
  res.clearCookie('onboardiq_csrf');
  res.json({ message: 'Logged out successfully.' });
});

export default router;

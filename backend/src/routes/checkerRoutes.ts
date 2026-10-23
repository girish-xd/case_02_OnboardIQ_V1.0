import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Application } from '../models/Application.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { stateMachine } from '../services/stateMachine.js';
import { auditService } from '../services/auditService.js';
import { maskPan, maskAadhaar, maskMobile, maskEmail } from '../utils/masking.js';

const router = Router();

// Restrict all checker routes to CHECKER and ADMIN
router.use(authenticate, authorizeRoles('CHECKER', 'ADMIN'));

// GET /api/v1/checker/queue - Cases in PENDING_CHECKER (FIFO)
router.get('/queue', async (_req: Request, res: Response, next) => {
  try {
    const cases = await Application.find({ status: 'PENDING_CHECKER' })
      .sort({ createdAt: 1 })
      .lean();

    const maskedCases = cases.map((c) => ({
      ...c,
      panNumber: maskPan(c.panNumber),
      aadhaarLast4: maskAadhaar(c.aadhaarLast4),
      mobile: maskMobile(c.mobile),
      email: maskEmail(c.email),
    }));

    res.json({ queue: maskedCases });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/checker/claim - Claim case
router.post('/claim', async (req: Request, res: Response, next) => {
  try {
    const { applicationId, version } = req.body;
    const app = await Application.findOne({ applicationId });

    if (!app) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Application not found.' });
      return;
    }

    // Maker-Checker violation check
    if (app.makerRecommendation && app.makerRecommendation.recommendedBy === req.user!.userId) {
      res.status(403).json({
        code: 'MAKER_CHECKER_VIOLATION',
        message: 'Forbidden: A user cannot check or approve a case they previously recommended.',
      });
      return;
    }

    if (version !== undefined && app.version !== version) {
      res.status(409).json({ code: 'CONCURRENCY_CONFLICT', message: 'Case was modified by another officer.' });
      return;
    }

    app.assignedCheckerId = req.user!.userId;
    app.version += 1;
    await app.save();

    await auditService.log({
      action: 'CASE_CLAIMED',
      actorId: req.user!.userId,
      actorRole: 'CHECKER',
      actorEmail: req.user!.email,
      applicationId,
      entityType: 'Application',
    });

    res.json({ message: 'Case claimed successfully.', application: app });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/checker/decision - Final decision with Maker-Checker separation
const DecisionSchema = z.object({
  applicationId: z.string(),
  decision: z.enum(['APPROVE', 'REJECT', 'SEND_BACK']),
  comment: z.string().min(5, 'Reason/comment is required.'),
  version: z.number(),
});

router.post('/decision', async (req: Request, res: Response, next) => {
  try {
    const data = DecisionSchema.parse(req.body);

    const updatedApp = await stateMachine.submitCheckerDecision(
      data.applicationId,
      data.decision,
      data.comment,
      req.user!.userId,
      data.version
    );

    res.json({
      message: `Final decision (${data.decision}) recorded successfully.`,
      application: updatedApp,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Application } from '../models/Application.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { stateMachine } from '../services/stateMachine.js';
import { auditService } from '../services/auditService.js';
import { maskPan, maskAadhaar, maskMobile, maskEmail } from '../utils/masking.js';

const router = Router();

// Restrict all maker routes to MAKER and ADMIN
router.use(authenticate, authorizeRoles('MAKER', 'ADMIN'));

// GET /api/v1/maker/queue - Section 5 (FR-6): REVIEW queue ordered by risk (HIGH first) then submission time
router.get('/queue', async (_req: Request, res: Response, next) => {
  try {
    const cases = await Application.find({ status: 'IN_REVIEW' }).lean();

    // Custom sorting: HIGH risk first, then submission time ascending (FIFO)
    const riskPriority: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, '': 0 };

    cases.sort((a, b) => {
      const pA = riskPriority[a.riskCategory || ''] || 0;
      const pB = riskPriority[b.riskCategory || ''] || 0;
      if (pA !== pB) return pB - pA; // Higher priority first

      const tA = new Date(a.createdAt).getTime();
      const tB = new Date(b.createdAt).getTime();
      return tA - tB; // Oldest first
    });

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

// POST /api/v1/maker/claim - Claim case
router.post('/claim', async (req: Request, res: Response, next) => {
  try {
    const { applicationId, version } = req.body;
    const app = await Application.findOne({ applicationId });

    if (!app) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Application not found.' });
      return;
    }

    if (version !== undefined && app.version !== version) {
      res.status(409).json({ code: 'CONCURRENCY_CONFLICT', message: 'Case was modified by another officer.' });
      return;
    }

    app.assignedMakerId = req.user!.userId;
    app.version += 1;
    await app.save();

    await auditService.log({
      action: 'CASE_CLAIMED',
      actorId: req.user!.userId,
      actorRole: 'MAKER',
      actorEmail: req.user!.email,
      applicationId,
      entityType: 'Application',
    });

    res.json({ message: 'Case claimed successfully.', application: app });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/maker/correct-field - Field correction with mandatory reason
const CorrectionSchema = z.object({
  applicationId: z.string(),
  docId: z.string(),
  fieldName: z.string(),
  newValue: z.string(),
  reason: z.string().min(5, 'Reason must be at least 5 characters long.'),
  version: z.number(),
});

router.post('/correct-field', async (req: Request, res: Response, next) => {
  try {
    const data = CorrectionSchema.parse(req.body);
    const updatedApp = await stateMachine.correctField(
      data.applicationId,
      data.docId,
      data.fieldName,
      data.newValue,
      data.reason,
      req.user!.userId,
      data.version
    );

    res.json({
      message: 'Field corrected successfully and rules re-evaluated.',
      application: updatedApp,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/maker/recommend - Submit recommendation with comment >= 10 chars
const RecommendSchema = z.object({
  applicationId: z.string(),
  recommendation: z.enum(['APPROVE', 'REJECT', 'REQUEST_RESUBMISSION']),
  comment: z.string().min(10, 'Comment must be at least 10 characters long as per Section 3.'),
  version: z.number(),
});

router.post('/recommend', async (req: Request, res: Response, next) => {
  try {
    const data = RecommendSchema.parse(req.body);
    const updatedApp = await stateMachine.submitMakerRecommendation(
      data.applicationId,
      data.recommendation,
      data.comment,
      req.user!.userId,
      data.version
    );

    res.json({
      message: 'Recommendation submitted successfully.',
      application: updatedApp,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

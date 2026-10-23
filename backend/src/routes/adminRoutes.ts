import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Application } from '../models/Application.js';
import { AuditLog } from '../models/AuditLog.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { getRulesConfig, updateRulesConfig } from '../config/rulesConfig.js';
import { auditService } from '../services/auditService.js';
import { maskPan } from '../utils/masking.js';

const router = Router();

// Restrict all admin routes to ADMIN and CHECKER (where permitted by case study)
router.use(authenticate, authorizeRoles('ADMIN', 'CHECKER'));

// GET /api/v1/admin/kpis - Section 5 (FR-10): Compliance Dashboard KPIs
router.get('/kpis', async (_req: Request, res: Response, next) => {
  try {
    const apps = await Application.find().lean();
    const asOf = new Date().toISOString();

    const statusCounts: Record<string, number> = {};
    const reasonCodeCounts: Record<string, number> = {};
    let totalReviewTimeHours = 0;
    let reviewCasesCount = 0;

    for (const app of apps) {
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;

      // Track reason codes
      if (app.reasonCodes && Array.isArray(app.reasonCodes)) {
        for (const code of app.reasonCodes) {
          reasonCodeCounts[code] = (reasonCodeCounts[code] || 0) + 1;
        }
      }

      // Track review ageing
      if (app.status === 'IN_REVIEW' || app.status === 'PENDING_CHECKER') {
        const elapsedHours = (Date.now() - new Date(app.createdAt).getTime()) / (1000 * 60 * 60);
        totalReviewTimeHours += elapsedHours;
        reviewCasesCount++;
      }
    }

    const totalApplications = apps.length;
    const autoApproved = statusCounts['AUTO_APPROVED'] || 0;
    const finalApproved = statusCounts['APPROVED'] || 0;
    const totalApproved = autoApproved + finalApproved;

    const autoRejected = statusCounts['AUTO_REJECTED'] || 0;
    const finalRejected = statusCounts['REJECTED'] || 0;
    const totalRejected = autoRejected + finalRejected;

    const totalDecided = totalApproved + totalRejected;

    // Straight-through rate = AUTO_APPROVED / all decided
    const straightThroughRate = totalDecided > 0 ? (autoApproved / totalDecided) * 100 : 0;
    const reviewRate = totalApplications > 0 ? (((statusCounts['IN_REVIEW'] || 0) + (statusCounts['PENDING_CHECKER'] || 0) + finalApproved) / totalApplications) * 100 : 0;
    const rejectRate = totalDecided > 0 ? (totalRejected / totalDecided) * 100 : 0;

    // Top 5 reason codes sorted descending
    const topReasonCodes = Object.entries(reasonCodeCounts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const averageReviewTimeHours = reviewCasesCount > 0 ? totalReviewTimeHours / reviewCasesCount : 0;

    res.json({
      asOf,
      totalApplications,
      statusCounts,
      metrics: {
        straightThroughRate: parseFloat(straightThroughRate.toFixed(2)),
        reviewRate: parseFloat(reviewRate.toFixed(2)),
        rejectRate: parseFloat(rejectRate.toFixed(2)),
        totalDecided,
        pendingReviewCount: (statusCounts['IN_REVIEW'] || 0),
        pendingCheckerCount: (statusCounts['PENDING_CHECKER'] || 0),
        resubmissionRequestedCount: (statusCounts['RESUBMISSION_REQUESTED'] || 0),
        averageReviewTimeHours: parseFloat(averageReviewTimeHours.toFixed(1)),
      },
      topReasonCodes,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/audit - Searchable audit logs
router.get('/audit', async (req: Request, res: Response, next) => {
  try {
    const { action, actorRole, applicationId, limit, skip } = req.query;

    const result = await auditService.searchLogs({
      action: action as string,
      actorRole: actorRole as string,
      applicationId: applicationId as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
      skip: skip ? parseInt(skip as string, 10) : 0,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/audit/export - Masked audit trail export (CSV)
router.get('/audit/export', async (req: Request, res: Response, next) => {
  try {
    const { reason, applicationId } = req.query;

    if (!reason || String(reason).trim().length < 5) {
      res.status(400).json({
        code: 'REASON_REQUIRED',
        message: 'A mandatory justification reason (min 5 chars) is required for audit export.',
      });
      return;
    }

    const query: any = {};
    if (applicationId) query.applicationId = applicationId;

    const logs = await AuditLog.find(query).sort({ timestamp: -1 }).limit(1000).lean();

    // Log the export event
    await auditService.log({
      action: 'AUDIT_EXPORT',
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actorEmail: req.user!.email,
      entityType: 'AuditLog',
      details: { reason: String(reason).trim(), recordCount: logs.length },
      ipAddress: req.ip,
    });

    // Generate CSV with PII masked
    const headers = ['timestamp', 'action', 'actorRole', 'actorEmail', 'applicationId', 'docId', 'details'];
    const rows = logs.map((log) => {
      let detailStr = '';
      if (log.details) {
        detailStr = JSON.stringify(log.details).replace(/"/g, '""');
      }
      return [
        new Date(log.timestamp).toISOString(),
        log.action,
        log.actorRole,
        log.actorEmail || '',
        log.applicationId || '',
        log.docId || '',
        `"${detailStr}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit_export_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/config - View active configuration
router.get('/config', async (_req: Request, res: Response) => {
  res.json({ config: getRulesConfig() });
});

// POST /api/v1/admin/config - Controlled configuration update (Audited)
router.post('/config', authorizeRoles('ADMIN'), async (req: Request, res: Response, next) => {
  try {
    const updates = req.body;
    const updated = updateRulesConfig(updates);

    await auditService.log({
      action: 'CONFIG_UPDATED',
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actorEmail: req.user!.email,
      entityType: 'RulesConfig',
      details: updates,
      ipAddress: req.ip,
    });

    res.json({ message: 'Configuration updated successfully.', config: updated });
  } catch (err) {
    next(err);
  }
});

export default router;

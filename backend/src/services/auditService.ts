import { AuditLog } from '../models/AuditLog.js';
import { UserRole } from '../types/index.js';
import { redactPii } from '../utils/masking.js';

export interface RecordAuditParams {
  action: string;
  actorId: string;
  actorRole: UserRole;
  actorEmail?: string;
  applicationId?: string;
  docId?: string;
  entityType: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

export class AuditService {
  public async log(params: RecordAuditParams): Promise<void> {
    try {
      const sanitizedDetails = params.details ? redactPii(params.details) : undefined;
      await AuditLog.create({
        action: params.action,
        actorId: params.actorId,
        actorRole: params.actorRole,
        actorEmail: params.actorEmail,
        applicationId: params.applicationId,
        docId: params.docId,
        entityType: params.entityType,
        details: sanitizedDetails,
        ipAddress: params.ipAddress,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('[AuditService] Failed to record audit log:', err);
    }
  }

  public async getLogsForApplication(applicationId: string) {
    return AuditLog.find({ applicationId }).sort({ timestamp: 1 }).lean();
  }

  public async searchLogs(filter: {
    action?: string;
    actorRole?: string;
    applicationId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    skip?: number;
  }) {
    const query: any = {};
    if (filter.action) query.action = filter.action;
    if (filter.actorRole) query.actorRole = filter.actorRole;
    if (filter.applicationId) query.applicationId = filter.applicationId;
    if (filter.startDate || filter.endDate) {
      query.timestamp = {};
      if (filter.startDate) query.timestamp.$gte = filter.startDate;
      if (filter.endDate) query.timestamp.$lte = filter.endDate;
    }

    const limit = Math.min(filter.limit || 100, 1000);
    const skip = filter.skip || 0;

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(query),
    ]);

    return { logs, total };
  }
}

export const auditService = new AuditService();

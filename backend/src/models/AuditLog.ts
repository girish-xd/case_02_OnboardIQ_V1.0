import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from '../types/index.js';

export interface IAuditLog extends Document {
  action: string;
  actorId: string;
  actorRole: UserRole;
  actorEmail?: string;
  applicationId?: string;
  docId?: string;
  entityType: string;
  details?: Record<string, any>;
  ipAddress?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    actorId: { type: String, required: true, index: true },
    actorRole: { type: String, required: true, index: true },
    actorEmail: { type: String },
    applicationId: { type: String, index: true },
    docId: { type: String, index: true },
    entityType: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Prevent updating or deleting audit logs at Mongoose schema level
AuditLogSchema.pre('updateOne', function () {
  throw new Error('AuditLog records are append-only and cannot be updated.');
});
AuditLogSchema.pre('updateMany', function () {
  throw new Error('AuditLog records are append-only and cannot be updated.');
});
AuditLogSchema.pre('findOneAndDelete', function () {
  throw new Error('AuditLog records are append-only and cannot be deleted.');
});
AuditLogSchema.pre('deleteOne', function () {
  throw new Error('AuditLog records are append-only and cannot be deleted.');
});
AuditLogSchema.pre('deleteMany', function () {
  throw new Error('AuditLog records are append-only and cannot be deleted.');
});

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

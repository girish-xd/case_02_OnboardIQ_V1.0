import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from '../types/index.js';

export interface INotification extends Document {
  recipientId: string;
  recipientRole: UserRole;
  applicationId: string;
  title: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'READ';
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: String, required: true, index: true },
    recipientRole: { type: String, required: true },
    applicationId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED', 'READ'],
      default: 'SENT',
      index: true,
    },
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

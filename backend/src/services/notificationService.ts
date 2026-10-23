import { Notification } from '../models/Notification.js';
import { UserRole } from '../types/index.js';

export const REASON_CODE_DESCRIPTIONS: Record<string, string> = {
  DOCUMENT_MISSING: 'One or more required identity or address documents were not provided.',
  DOCUMENT_TYPE_MISMATCH: 'Uploaded document does not match the selected document type.',
  LOW_EXTRACTION_CONFIDENCE: 'Certain document details could not be read clearly. Manual verification is in progress.',
  AGE_BELOW_18: 'Applicant must be at least 18 years of age to open a savings account.',
  PAN_INVALID: 'Provided PAN format is invalid for an individual account.',
  PAN_MISMATCH: 'PAN number on the uploaded card does not match the application details.',
  DOB_MISMATCH: 'Date of birth on identity documents does not match declared date of birth.',
  AADHAAR_MISMATCH: 'Aadhaar digits on the document do not match the entered digits.',
  NAME_MISMATCH: 'Name on identity documents does not match the application name.',
  SANCTIONS_MATCH: 'Application cannot be processed due to regulatory screening restrictions.',
  NAME_MISMATCH_MINOR: 'Minor name variation detected across documents under manual review.',
  DOCUMENT_EXPIRED: 'Uploaded address proof document has expired.',
  ADDRESS_PROOF_STALE: 'Address proof document is older than the allowed 90-day validity window.',
  ADDRESS_MISMATCH: 'Pincode on address proof differs from application address.',
  SANCTIONS_POSSIBLE_MATCH: 'Compliance review required for identity verification.',
  PEP_MATCH: 'Enhanced compliance review required in accordance with banking guidelines.',
  DUPLICATE_CUSTOMER: 'An active account is already registered with this PAN.',
};

export class NotificationService {
  public async notifyUser(
    recipientId: string,
    recipientRole: UserRole,
    applicationId: string,
    title: string,
    message: string
  ) {
    try {
      return await Notification.create({
        recipientId,
        recipientRole,
        applicationId,
        title,
        message,
        status: 'SENT',
      });
    } catch (err) {
      console.error('[NotificationService] Failed to create notification:', err);
      return null;
    }
  }

  public async getNotificationsForUser(recipientId: string) {
    return Notification.find({ recipientId }).sort({ createdAt: -1 }).lean();
  }

  public async markAsRead(notificationId: string, recipientId: string) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, recipientId },
      { status: 'READ' },
      { new: true }
    );
  }
}

export const notificationService = new NotificationService();

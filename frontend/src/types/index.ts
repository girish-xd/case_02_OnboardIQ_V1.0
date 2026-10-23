export type UserRole = 'APPLICANT' | 'MAKER' | 'CHECKER' | 'ADMIN';

export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'EXTRACTING'
  | 'AUTO_APPROVED'
  | 'IN_REVIEW'
  | 'RESUBMISSION_REQUESTED'
  | 'PENDING_CHECKER'
  | 'APPROVED'
  | 'REJECTED'
  | 'AUTO_REJECTED'
  | 'CLOSED_EXPIRED';

export type DeclaredDocType =
  | 'PAN_CARD'
  | 'AADHAAR_CARD'
  | 'ELECTRICITY_BILL'
  | 'BANK_STATEMENT'
  | 'DRIVING_LICENCE'
  | 'OTHER';

export interface User {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export interface Application {
  applicationId: string;
  applicantId: string;
  applicationDate: string;
  fullName: string;
  dob: string;
  gender: string;
  panNumber: string;
  aadhaarLast4: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  occupationCode: string;
  annualIncome: number;
  consentKyc: boolean;
  status: ApplicationStatus;
  decision?: 'APPROVE' | 'REVIEW' | 'REJECT';
  reasonCodes?: string[];
  reasons?: Array<{ code: string; message: string }>;
  nameMatchScore?: number | null;
  riskCategory?: 'LOW' | 'MEDIUM' | 'HIGH' | '';
  rekycDueDate?: string;
  version: number;
  assignedMakerId?: string | null;
  assignedCheckerId?: string | null;
  makerRecommendation?: {
    outcome: string;
    comment: string;
    recommendedBy: string;
    recommendedAt: string;
  } | null;
  checkerDecision?: {
    outcome: string;
    comment: string;
    decidedBy: string;
    decidedAt: string;
  } | null;
  coreBankingAccount?: {
    customerId: string;
    accountNumber: string;
    openedAt: string;
  } | null;
  resubmissionDeadline?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecord {
  docId: string;
  applicationId: string;
  fileName: string;
  declaredDocType: DeclaredDocType;
  classifiedDocType: DeclaredDocType;
  docTypeConfidence: number;
  fileHash: string;
  fileSize: number;
  text?: string;
  createdAt: string;
}

export interface ExtractionRecord {
  _id: string;
  docId: string;
  applicationId: string;
  fieldName: string;
  value: string;
  confidence: number;
  source: 'MOCK' | 'AI' | 'OFFICER';
  originalValue?: string;
  correctionReason?: string;
  correctedBy?: string;
}

export interface NotificationItem {
  _id: string;
  recipientId: string;
  title: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'READ';
  createdAt: string;
}

export interface AuditLogItem {
  _id: string;
  action: string;
  actorId: string;
  actorRole: UserRole;
  actorEmail?: string;
  applicationId?: string;
  docId?: string;
  entityType: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface DashboardKPIs {
  asOf: string;
  totalApplications: number;
  statusCounts: Record<string, number>;
  metrics: {
    straightThroughRate: number;
    reviewRate: number;
    rejectRate: number;
    totalDecided: number;
    pendingReviewCount: number;
    pendingCheckerCount: number;
    resubmissionRequestedCount: number;
    averageReviewTimeHours: number;
  };
  topReasonCodes: Array<{ code: string; count: number }>;
}

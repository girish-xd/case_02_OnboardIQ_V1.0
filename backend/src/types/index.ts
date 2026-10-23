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

export type DecisionOutcome = 'APPROVE' | 'REVIEW' | 'REJECT';

export type RiskCategory = 'LOW' | 'MEDIUM' | 'HIGH' | '';

export type DeclaredDocType =
  | 'PAN_CARD'
  | 'AADHAAR_CARD'
  | 'ELECTRICITY_BILL'
  | 'BANK_STATEMENT'
  | 'DRIVING_LICENCE'
  | 'OTHER';

export interface ExtractedField {
  fieldName: string;
  value: string;
  confidence: number;
  source?: 'MOCK' | 'AI' | 'OFFICER';
  originalValue?: string;
  correctionReason?: string;
}

export interface DocumentRecord {
  docId: string;
  applicationId: string;
  fileName: string;
  declaredDocType: DeclaredDocType;
  classifiedDocType?: DeclaredDocType;
  docTypeConfidence?: number;
  fileHash: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  text?: string;
  isDeleted?: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleEvaluationResult {
  ruleId: string;
  reasonCode: string;
  outcome: DecisionOutcome;
  description: string;
  details?: Record<string, any>;
}

export interface EvaluationOutcome {
  decision: DecisionOutcome;
  status: ApplicationStatus;
  reasonCodes: string[];
  nameMatchScore: number | null;
  riskCategory: RiskCategory;
  rekycDueDate: string;
  triggeredRules: RuleEvaluationResult[];
  configVersion: string;
  evaluatedAt: Date;
}

export interface AuditLogEntry {
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

export interface NotificationRecord {
  id: string;
  recipientId: string;
  recipientRole: UserRole;
  applicationId: string;
  title: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'READ';
  createdAt: Date;
}

export interface CoreBankingAccount {
  customerId: string;
  accountNumber: string;
  accountType: string;
  status: 'ACTIVE';
  openedAt: Date;
}

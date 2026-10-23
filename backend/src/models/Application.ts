import mongoose, { Document, Schema } from 'mongoose';
import { ApplicationStatus, DecisionOutcome, RiskCategory } from '../types/index.js';

export interface IApplication extends Document {
  applicationId: string;
  applicantId: string;
  applicationDate: string; // YYYY-MM-DD
  fullName: string;
  dob: string; // YYYY-MM-DD
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
  decision?: DecisionOutcome;
  reasonCodes: string[];
  nameMatchScore?: number | null;
  riskCategory?: RiskCategory;
  rekycDueDate?: string;
  version: number;
  assignedMakerId?: string | null;
  assignedCheckerId?: string | null;
  makerRecommendation?: {
    outcome: string;
    comment: string;
    recommendedBy: string;
    recommendedAt: Date;
  } | null;
  checkerDecision?: {
    outcome: string;
    comment: string;
    decidedBy: string;
    decidedAt: Date;
  } | null;
  coreBankingAccount?: {
    customerId: string;
    accountNumber: string;
    openedAt: Date;
  } | null;
  resubmissionDeadline?: Date | null;
  lastEvaluatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    applicationId: { type: String, required: true, unique: true, index: true },
    applicantId: { type: String, required: true, index: true },
    applicationDate: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    dob: { type: String, required: true },
    gender: { type: String, required: true },
    panNumber: { type: String, required: true, uppercase: true, index: true },
    aadhaarLast4: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    occupationCode: { type: String, required: true },
    annualIncome: { type: Number, required: true, default: 0 },
    consentKyc: { type: Boolean, required: true, default: false },
    status: {
      type: String,
      required: true,
      enum: [
        'DRAFT',
        'SUBMITTED',
        'EXTRACTING',
        'AUTO_APPROVED',
        'IN_REVIEW',
        'RESUBMISSION_REQUESTED',
        'PENDING_CHECKER',
        'APPROVED',
        'REJECTED',
        'AUTO_REJECTED',
        'CLOSED_EXPIRED',
      ],
      default: 'DRAFT',
      index: true,
    },
    decision: {
      type: String,
      enum: ['APPROVE', 'REVIEW', 'REJECT'],
    },
    reasonCodes: [{ type: String }],
    nameMatchScore: { type: Number, default: null },
    riskCategory: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', ''],
      default: '',
    },
    rekycDueDate: { type: String, default: '' },
    version: { type: Number, required: true, default: 1 },
    assignedMakerId: { type: String, default: null, index: true },
    assignedCheckerId: { type: String, default: null, index: true },
    makerRecommendation: {
      outcome: String,
      comment: String,
      recommendedBy: String,
      recommendedAt: Date,
    },
    checkerDecision: {
      outcome: String,
      comment: String,
      decidedBy: String,
      decidedAt: Date,
    },
    coreBankingAccount: {
      customerId: String,
      accountNumber: String,
      openedAt: Date,
    },
    resubmissionDeadline: { type: Date, default: null },
    lastEvaluatedAt: { type: Date },
  },
  { timestamps: true }
);

export const Application = mongoose.model<IApplication>('Application', ApplicationSchema);

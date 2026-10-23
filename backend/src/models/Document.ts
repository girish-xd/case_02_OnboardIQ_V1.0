import mongoose, { Document as MongooseDoc, Schema } from 'mongoose';
import { DeclaredDocType } from '../types/index.js';

export interface IDocumentRecord extends MongooseDoc {
  docId: string;
  applicationId: string;
  fileName: string;
  declaredDocType: DeclaredDocType;
  classifiedDocType: DeclaredDocType;
  docTypeConfidence: number;
  fileHash: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  text?: string;
  isDeleted: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocumentRecord>(
  {
    docId: { type: String, required: true, unique: true, index: true },
    applicationId: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    declaredDocType: {
      type: String,
      required: true,
      enum: [
        'PAN_CARD',
        'AADHAAR_CARD',
        'ELECTRICITY_BILL',
        'BANK_STATEMENT',
        'DRIVING_LICENCE',
        'OTHER',
      ],
    },
    classifiedDocType: {
      type: String,
      required: true,
      enum: [
        'PAN_CARD',
        'AADHAAR_CARD',
        'ELECTRICITY_BILL',
        'BANK_STATEMENT',
        'DRIVING_LICENCE',
        'OTHER',
      ],
      default: 'OTHER',
    },
    docTypeConfidence: { type: Number, required: true, default: 0.0 },
    fileHash: { type: String, required: true, index: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    storagePath: { type: String, required: true },
    text: { type: String, default: '' },
    isDeleted: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const DocumentModel = mongoose.model<IDocumentRecord>('Document', DocumentSchema);

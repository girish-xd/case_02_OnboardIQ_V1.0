import mongoose, { Document, Schema } from 'mongoose';

export interface IExtraction extends Document {
  docId: string;
  applicationId: string;
  fieldName: string;
  value: string;
  confidence: number;
  source: 'MOCK' | 'AI' | 'OFFICER';
  originalValue?: string;
  correctionReason?: string;
  correctedBy?: string;
  correctedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ExtractionSchema = new Schema<IExtraction>(
  {
    docId: { type: String, required: true, index: true },
    applicationId: { type: String, required: true, index: true },
    fieldName: { type: String, required: true },
    value: { type: String, default: '' },
    confidence: { type: Number, required: true, default: 0.0 },
    source: {
      type: String,
      enum: ['MOCK', 'AI', 'OFFICER'],
      default: 'MOCK',
    },
    originalValue: { type: String },
    correctionReason: { type: String },
    correctedBy: { type: String },
    correctedAt: { type: Date },
  },
  { timestamps: true }
);

// Compound index for fast lookup of a field for a docId
ExtractionSchema.index({ docId: 1, fieldName: 1 });

export const Extraction = mongoose.model<IExtraction>('Extraction', ExtractionSchema);

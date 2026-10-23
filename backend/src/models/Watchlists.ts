import mongoose, { Document, Schema } from 'mongoose';

// Sanctions list
export interface ISanctionsEntry extends Document {
  listId: string;
  name: string;
  alias?: string;
  dob?: string;
  nationality?: string;
  program?: string;
}

const SanctionsSchema = new Schema<ISanctionsEntry>({
  listId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  alias: { type: String },
  dob: { type: String },
  nationality: { type: String },
  program: { type: String },
});

export const SanctionsList = mongoose.model<ISanctionsEntry>('SanctionsList', SanctionsSchema);

// PEP list
export interface IPepEntry extends Document {
  pepId: string;
  name: string;
  dob?: string;
  position?: string;
  category?: string;
}

const PepSchema = new Schema<IPepEntry>({
  pepId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  dob: { type: String },
  position: { type: String },
  category: { type: String },
});

export const PepList = mongoose.model<IPepEntry>('PepList', PepSchema);

// Existing customers
export interface IExistingCustomer extends Document {
  customerId: string;
  fullName: string;
  panNumber: string;
  dob?: string;
}

const ExistingCustomerSchema = new Schema<IExistingCustomer>({
  customerId: { type: String, required: true, unique: true, index: true },
  fullName: { type: String, required: true },
  panNumber: { type: String, required: true, index: true },
  dob: { type: String },
});

export const ExistingCustomer = mongoose.model<IExistingCustomer>('ExistingCustomer', ExistingCustomerSchema);

// Occupations
export interface IOccupation extends Document {
  occupationCode: string;
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

const OccupationSchema = new Schema<IOccupation>({
  occupationCode: { type: String, required: true, unique: true, index: true },
  description: { type: String, required: true },
  riskLevel: { type: String, required: true, enum: ['LOW', 'MEDIUM', 'HIGH'] },
});

export const Occupation = mongoose.model<IOccupation>('Occupation', OccupationSchema);

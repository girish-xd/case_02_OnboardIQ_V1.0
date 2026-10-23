import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from '../types/index.js';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  fullName: string;
  applicantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['APPLICANT', 'MAKER', 'CHECKER', 'ADMIN'],
      default: 'APPLICANT',
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    applicantId: { type: String, sparse: true, index: true },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);

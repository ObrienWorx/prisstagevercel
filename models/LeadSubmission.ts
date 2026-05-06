import mongoose, { Schema, Document } from 'mongoose';

export interface ILeadSubmission extends Document {
  name: string;
  email: string;
  phone: string;
  postalCode: string;
  source: string;
  consent: boolean;
}

const LeadSubmissionSchema = new Schema<ILeadSubmission>(
  {
    name:       { type: String, required: true, trim: true },
    email:      { type: String, required: true, trim: true, lowercase: true },
    phone:      { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    source:     { type: String, default: 'general' },
    consent:    { type: Boolean, required: true },
  },
  { timestamps: true }
);

export default (mongoose.models.LeadSubmission as mongoose.Model<ILeadSubmission>) ||
  mongoose.model<ILeadSubmission>('LeadSubmission', LeadSubmissionSchema);

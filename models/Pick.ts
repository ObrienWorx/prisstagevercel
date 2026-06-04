import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPick extends Document {
  ticker: string;
  convictionLevel: 'High' | 'Medium' | 'Low';
  potentialReturn: number;
  capType: string;
  entryPrice: number;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const PickSchema = new Schema<IPick>(
  {
    ticker: { type: String, required: true, trim: true },
    convictionLevel: { type: String, enum: ['High', 'Medium', 'Low'], default: 'High' },
    potentialReturn: { type: Number, required: true },
    capType: { type: String, required: true, trim: true },
    entryPrice: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Pick: Model<IPick> = mongoose.models.Pick || mongoose.model<IPick>('Pick', PickSchema);

export default Pick;

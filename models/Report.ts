import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IReport extends Document {
  title: string;
  slug: string;
  content: string;
  featuredImage: string;
  category: Types.ObjectId | null;
  sector: Types.ObjectId | null;
  product: Types.ObjectId | null;
  upsellTicker: string;
  ticker: string;
  price: number;
  sellPrice: number;
  recommendation: string;
  publishStatus: 'draft' | 'published';
  metaTitle: string;
  metaDescription: string;
  metaImage: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    content: { type: String, default: '' },
    featuredImage: { type: String, default: '' },
    category: { type: Schema.Types.ObjectId, ref: 'ReportCategory', default: null },
    sector: { type: Schema.Types.ObjectId, ref: 'Sector', default: null },
    product: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    upsellTicker: { type: String, default: '' },
    ticker: { type: String, default: '', trim: true },
    price: { type: Number, default: 0 },
    sellPrice: { type: Number, default: 0 },
    recommendation: { type: String, enum: ['', 'BUY', 'HOLD', 'SELL', 'SPECULATIVE BUY', 'REFRAIN', 'Security Under Review'], default: '' },
    publishStatus: { type: String, enum: ['draft', 'published'], default: 'draft' },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    metaImage: { type: String, default: '' },
  },
  { timestamps: true }
);

const Report: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema);

export default Report;

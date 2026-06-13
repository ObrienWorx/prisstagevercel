import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IReport extends Document {
  title: string;
  slug: string;
  content: string;
  featuredImage: string;
  category: Types.ObjectId | null;
  sector: Types.ObjectId | null;
  product: Types.ObjectId | null;
  pastStockRecommendation: Types.ObjectId | null;
  upsellTicker: string;
  ticker: string;
  price: number;
  currentPrice: number;
  currentPriceCurrency: string;
  currentPriceUpdatedAt: Date | null;
  recommendation: string;
  publishStatus: 'draft' | 'published';
  featured: boolean;
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
    pastStockRecommendation: { type: Schema.Types.ObjectId, ref: 'Report', default: null },
    upsellTicker: { type: String, default: '' },
    ticker: { type: String, default: '', trim: true },
    price: { type: Number, default: 0 },
    currentPrice: { type: Number, default: 0 },
    currentPriceCurrency: { type: String, default: '' },
    currentPriceUpdatedAt: { type: Date, default: null },
    recommendation: { type: String, enum: ['', 'BUY', 'HOLD', 'SELL', 'SPECULATIVE BUY', 'REFRAIN', 'Security Under Review'], default: '' },
    publishStatus: { type: String, enum: ['draft', 'published'], default: 'draft' },
    featured: { type: Boolean, default: false },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    metaImage: { type: String, default: '' },
  },
  { timestamps: true }
);

if (mongoose.models.Report) {
  const cachedReportSchema = mongoose.models.Report.schema;
  const missingPaths: Record<string, unknown> = {};

  if (!cachedReportSchema.path('pastStockRecommendation')) {
    missingPaths.pastStockRecommendation = { type: Schema.Types.ObjectId, ref: 'Report', default: null };
  }

  if (!cachedReportSchema.path('upsellTicker')) {
    missingPaths.upsellTicker = { type: String, default: '' };
  }

  if (!cachedReportSchema.path('ticker')) {
    missingPaths.ticker = { type: String, default: '', trim: true };
  }

  if (!cachedReportSchema.path('price')) {
    missingPaths.price = { type: Number, default: 0 };
  }

  if (!cachedReportSchema.path('currentPrice')) {
    missingPaths.currentPrice = { type: Number, default: 0 };
    missingPaths.currentPriceCurrency = { type: String, default: '' };
    missingPaths.currentPriceUpdatedAt = { type: Date, default: null };
  }

  if (!cachedReportSchema.path('featured')) {
    missingPaths.featured = { type: Boolean, default: false };
  }

  if (Object.keys(missingPaths).length) {
    cachedReportSchema.add(missingPaths);
  }
}

const Report: Model<IReport> =
  mongoose.models.Report as Model<IReport> || mongoose.model<IReport>('Report', ReportSchema);

export default Report;

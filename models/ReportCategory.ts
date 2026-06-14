import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReportCategory extends Document {
  name: string;
  slug: string;
  icon: string;
  description: string;
  status: 'active' | 'inactive';
  metaTitle: string;
  metaDescription: string;
  metaImage: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportCategorySchema = new Schema<IReportCategory>(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    icon: { type: String, default: '' },
    description: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    metaImage: { type: String, default: '' },
  },
  { timestamps: true }
);

const ReportCategory: Model<IReportCategory> =
  mongoose.models.ReportCategory || mongoose.model<IReportCategory>('ReportCategory', ReportCategorySchema);

export default ReportCategory;

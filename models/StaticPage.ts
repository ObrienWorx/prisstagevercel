import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStaticPage extends Document {
  title: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  isPublished: boolean;
  showInFooter: boolean;
  footerColumn: 'quick-links' | 'policies' | 'none';
  createdAt: Date;
  updatedAt: Date;
}

const StaticPageSchema = new Schema<IStaticPage>({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  content: { type: String, default: '' },
  metaTitle: { type: String, default: '' },
  metaDescription: { type: String, default: '' },
  isPublished: { type: Boolean, default: true },
  showInFooter: { type: Boolean, default: false },
  footerColumn: { type: String, enum: ['quick-links', 'policies', 'none'], default: 'none' },
}, { timestamps: true });

const StaticPage: Model<IStaticPage> =
  mongoose.models.StaticPage || mongoose.model<IStaticPage>('StaticPage', StaticPageSchema);

export default StaticPage;

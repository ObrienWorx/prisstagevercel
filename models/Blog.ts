import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IBlog extends Document {
  title: string;
  slug: string;
  content: string;
  featuredImage: string;
  category: Types.ObjectId | null;
  publishStatus: 'draft' | 'published';
  blogType: string;
  blogTypeLabel: string;
  metaTitle: string;
  metaDescription: string;
  metaImage: string;
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    content: { type: String, default: '' },
    featuredImage: { type: String, default: '' },
    category: { type: Schema.Types.ObjectId, ref: 'BlogCategory', default: null },
    publishStatus: { type: String, enum: ['draft', 'published'], default: 'draft' },
    blogType: { type: String, default: '', trim: true, lowercase: true },
    blogTypeLabel: { type: String, default: '', trim: true },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    metaImage: { type: String, default: '' },
  },
  { timestamps: true }
);

const Blog: Model<IBlog> =
  mongoose.models.Blog || mongoose.model<IBlog>('Blog', BlogSchema);

export default Blog;

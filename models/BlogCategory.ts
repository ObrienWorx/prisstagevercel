import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBlogCategory extends Document {
  name: string;
  slug: string;
  description: string;
  status: 'active' | 'inactive';
  showInNav: boolean;
  navHighlight: boolean;
  metaTitle: string;
  metaDescription: string;
  metaImage: string;
  createdAt: Date;
  updatedAt: Date;
}

const BlogCategorySchema = new Schema<IBlogCategory>(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    showInNav: { type: Boolean, default: false },
    navHighlight: { type: Boolean, default: false },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    metaImage: { type: String, default: '' },
  },
  { timestamps: true }
);

delete (mongoose.models as any).BlogCategory;
const BlogCategory: Model<IBlogCategory> = mongoose.model<IBlogCategory>('BlogCategory', BlogCategorySchema);

export default BlogCategory;

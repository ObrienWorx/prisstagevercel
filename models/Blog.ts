import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IBlog extends Document {
  title: string;
  slug: string;
  content: string;
  featuredImage: string;
  tags: string[];
  authorName: string;
  category: Types.ObjectId | null;
  categories: Types.ObjectId[];
  publishStatus: 'draft' | 'published';
  publishedAt: Date | null;
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
    tags: [{ type: String, trim: true }],
    authorName: { type: String, default: '', trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'BlogCategory', default: null },
    categories: [{ type: Schema.Types.ObjectId, ref: 'BlogCategory' }],
    publishStatus: { type: String, enum: ['draft', 'published'], default: 'draft' },
    // Manually-settable publish date shown on the site. Falls back to createdAt when null.
    publishedAt: { type: Date, default: null },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    metaImage: { type: String, default: '' },
  },
  { timestamps: true }
);

if (mongoose.models.Blog) {
  const cachedBlogSchema = mongoose.models.Blog.schema;
  if (!cachedBlogSchema.path('publishedAt')) {
    cachedBlogSchema.add({ publishedAt: { type: Date, default: null } });
  }
}

const Blog: Model<IBlog> =
  mongoose.models.Blog || mongoose.model<IBlog>('Blog', BlogSchema);

export default Blog;

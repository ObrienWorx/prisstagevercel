import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  slug: string;
  regularPrice: number;
  salePrice: number | null;
  compareAtPrice: number | null;
  saleStartDate: Date | null;
  saleEndDate: Date | null;
  riskRating: 'Low' | 'Medium' | 'High' | 'Very High' | null;
  durationType: 'days' | 'months' | 'years';
  durationValue: number;
  shortDescription: string;
  fullDescription: string;
  features: string[];
  featuredImage: string;
  gallery: string[];
  status: 'draft' | 'published';
  isActive: boolean;
  metaTitle: string;
  metaDescription: string;
  metaImage: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    regularPrice: { type: Number, required: [true, 'Regular price is required'], min: 0 },
    salePrice: { type: Number, default: null },
    compareAtPrice: { type: Number, default: null },
    saleStartDate: { type: Date, default: null },
    saleEndDate: { type: Date, default: null },
    riskRating: { type: String, enum: ['Low', 'Medium', 'High', 'Very High', null], default: null },
    durationType: { type: String, enum: ['days', 'months', 'years'], default: 'months' },
    durationValue: { type: Number, required: [true, 'Duration is required'], min: 1 },
    shortDescription: { type: String, default: '' },
    fullDescription: { type: String, default: '' },
    features: { type: [String], default: [] },
    featuredImage: { type: String, default: '' },
    gallery: { type: [String], default: [] },
    status: { type: String, enum: ['draft', 'published'], default: 'published' },
    isActive: { type: Boolean, default: true },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    metaImage: { type: String, default: '' },
  },
  { timestamps: true }
);

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;

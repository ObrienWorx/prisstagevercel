import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlan {
  name: string;
  regularPrice: number;
  salePrice: number | null;
  durationValue: number;
  durationType: 'days' | 'months' | 'years';
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  // Legacy top-level price/duration — auto-synced from plans[0] on save for sorting/compat
  regularPrice: number;
  salePrice: number | null;
  saleStartDate: Date | null;
  saleEndDate: Date | null;
  riskRating: 'Low' | 'Medium' | 'High' | 'Very High' | null;
  durationType: 'days' | 'months' | 'years';
  durationValue: number;
  plans: IPlan[];
  shortDescription: string;
  fullDescription: string;
  features: string[];
  featuredImage: string;
  saleBanner: string;
  status: 'draft' | 'published';
  isActive: boolean;
  metaTitle: string;
  metaDescription: string;
  metaImage: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    name: { type: String, default: '' },
    regularPrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, default: null },
    durationValue: { type: Number, required: true, min: 1 },
    durationType: { type: String, enum: ['days', 'months', 'years'], default: 'months' },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    regularPrice: { type: Number, default: 0, min: 0 },
    salePrice: { type: Number, default: null },
    saleStartDate: { type: Date, default: null },
    saleEndDate: { type: Date, default: null },
    riskRating: { type: String, enum: ['Low', 'Medium', 'High', 'Very High', null], default: null },
    durationType: { type: String, enum: ['days', 'months', 'years'], default: 'months' },
    durationValue: { type: Number, default: 1, min: 1 },
    plans: { type: [PlanSchema], default: [] },
    shortDescription: { type: String, default: '' },
    fullDescription: { type: String, default: '' },
    features: { type: [String], default: [] },
    featuredImage: { type: String, default: '' },
    saleBanner: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'published'], default: 'published' },
    isActive: { type: Boolean, default: true },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    metaImage: { type: String, default: '' },
  },
  { timestamps: true }
);

// Sync plans[0] → top-level price/duration so sorting and legacy code keeps working
ProductSchema.pre('save', function () {
  if (this.plans?.length > 0) {
    const p = this.plans[0];
    this.regularPrice = p.regularPrice;
    this.salePrice = p.salePrice ?? null;
    this.durationValue = p.durationValue;
    this.durationType = p.durationType;
  }
});

// Always delete the cached model so schema changes (e.g. new fields like plans/saleBanner)
// are picked up without needing a full server restart. Safe in production because
// Node.js module caching means this file only executes once per process.
delete (mongoose.models as any).Product;
const Product: Model<IProduct> = mongoose.model<IProduct>('Product', ProductSchema);

export default Product;

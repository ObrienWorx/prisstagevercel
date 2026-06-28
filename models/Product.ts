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
  regularPrice: number;
  salePrice: number | null;
  saleOverPrice: number | null;
  saleOverContent: string;
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
  saleOverBanner: string;
  status: 'draft' | 'published';
  isActive: boolean;
  showOnFrontend: boolean;
  isMostPopular: boolean;
  popularBadgeText: string;
  bundledProducts: mongoose.Types.ObjectId[];
  sortOrder: number;
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
    saleOverPrice: { type: Number, default: null },
    saleOverContent: { type: String, default: '' },
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
    saleOverBanner: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'published'], default: 'published' },
    isActive: { type: Boolean, default: true },
    showOnFrontend: { type: Boolean, default: true },
    isMostPopular: { type: Boolean, default: false },
    popularBadgeText: { type: String, default: '' },
    bundledProducts: { type: [{ type: Schema.Types.ObjectId, ref: 'Product' }], default: [] },
    sortOrder: { type: Number, default: 0, index: true },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    metaImage: { type: String, default: '' },
  },
  { timestamps: true }
);

ProductSchema.pre('save', function () {
  if (this.plans?.length > 0) {
    const p = this.plans[0];
    this.regularPrice = p.regularPrice;
    this.salePrice = p.salePrice ?? null;
    this.durationValue = p.durationValue;
    this.durationType = p.durationType;
  }
});

delete (mongoose.models as Record<string, unknown>).Product;
const Product: Model<IProduct> = mongoose.model<IProduct>('Product', ProductSchema);

export default Product;

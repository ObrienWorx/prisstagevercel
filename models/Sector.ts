import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISector extends Document {
  name: string;
  slug: string;
  featuredImage: string;
  icon: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const SectorSchema = new Schema<ISector>(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    featuredImage: { type: String, default: '' },
    icon: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

const Sector: Model<ISector> =
  mongoose.models.Sector || mongoose.model<ISector>('Sector', SectorSchema);

export default Sector;

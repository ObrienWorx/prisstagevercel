import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IUserProduct extends Document {
  subscriber: Types.ObjectId;
  product: Types.ObjectId;
  order: Types.ObjectId | null;
  startDate: Date;
  expiryDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserProductSchema = new Schema<IUserProduct>(
  {
    subscriber: { type: Schema.Types.ObjectId, ref: 'Subscriber', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    startDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserProductSchema.index({ subscriber: 1 });
UserProductSchema.index({ product: 1 });
UserProductSchema.index({ subscriber: 1, product: 1 });
UserProductSchema.index({ expiryDate: 1 });
UserProductSchema.index({ isActive: 1, expiryDate: 1 });

const UserProduct: Model<IUserProduct> =
  mongoose.models.UserProduct || mongoose.model<IUserProduct>('UserProduct', UserProductSchema);

export default UserProduct;

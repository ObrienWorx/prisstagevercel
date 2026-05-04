import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IOrder extends Document {
  orderNumber: string;
  subscriber: Types.ObjectId;
  product: Types.ObjectId;
  pricePaid: number;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  orderStatus: 'pending' | 'completed' | 'cancelled' | 'refunded';
  purchaseDate: Date;
  expiryDate: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, unique: true },
    subscriber: { type: Schema.Types.ObjectId, ref: 'Subscriber', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    pricePaid: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
    orderStatus: { type: String, enum: ['pending', 'completed', 'cancelled', 'refunded'], default: 'pending' },
    purchaseDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

OrderSchema.pre('save', async function () {
  if (!this.orderNumber) {
    const count = await (this.constructor as Model<IOrder>).countDocuments();
    this.orderNumber = `ORD-${String(count + 1).padStart(5, '0')}`;
  }
});

const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;

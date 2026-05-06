import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IOrderItem {
  product: Types.ObjectId;
  pricePaid: number;
  startDate: Date;
  expiryDate: Date;
  durationValue: number;
  durationType: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  subscriber: Types.ObjectId;
  product: Types.ObjectId;       // primary product (first item) — kept for compat
  pricePaid: number;             // total across all items
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  orderStatus: 'pending' | 'completed' | 'cancelled' | 'refunded';
  purchaseDate: Date;
  expiryDate: Date;              // first item expiry — kept for compat
  items: IOrderItem[];           // all line-items (populated on multi-product orders)
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    pricePaid: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    durationValue: { type: Number, default: 1 },
    durationType: { type: String, enum: ['days', 'months', 'years'], default: 'months' },
  },
  { _id: false }
);

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
    items: { type: [OrderItemSchema], default: [] },
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

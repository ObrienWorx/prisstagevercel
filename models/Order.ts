import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IOrderItem {
  product: Types.ObjectId;
  pricePaid: number;
  sellingPrice?: number;
  startDate: Date;
  expiryDate: Date;
  durationValue: number;
  durationType: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  subscriber: Types.ObjectId;
  product: Types.ObjectId;
  pricePaid: number;
  sellingPrice?: number;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  orderStatus: 'pending' | 'completed' | 'cancelled' | 'refunded';
  purchaseDate: Date;
  expiryDate: Date;
  items: IOrderItem[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    pricePaid: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, min: 0 },
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
    sellingPrice: { type: Number, min: 0 },
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
    const Order = this.constructor as Model<IOrder>;
    const last = await Order.findOne({}).sort({ orderNumber: -1 }).select('orderNumber').lean();
    const seq = last?.orderNumber ? parseInt(String(last.orderNumber).replace(/\D/g, ''), 10) || 0 : 0;
    this.orderNumber = `ORD-${String(seq + 1).padStart(5, '0')}`;
  }
});

const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;

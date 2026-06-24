import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ITransaction extends Document {
  transactionNumber: string;
  order: Types.ObjectId;
  subscriber: Types.ObjectId;
  product: Types.ObjectId;
  amount: number;
  paymentGateway: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentDate: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    transactionNumber: { type: String, unique: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    subscriber: { type: Schema.Types.ObjectId, ref: 'Subscriber', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentGateway: { type: String, default: 'Manual' },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
    paymentDate: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

TransactionSchema.pre('save', async function () {
  if (!this.transactionNumber) {
    // Derive from the highest existing transactionNumber, not the document count:
    // historical imports created transactions with explicit (gapped) numbers, so
    // count+1 collides with already-used numbers. Numbers are 6-digit zero-padded,
    // so a descending sort yields the true max.
    const Transaction = this.constructor as Model<ITransaction>;
    const last = await Transaction.findOne({}).sort({ transactionNumber: -1 }).select('transactionNumber').lean();
    const seq = last?.transactionNumber ? parseInt(String(last.transactionNumber).replace(/\D/g, ''), 10) || 0 : 0;
    this.transactionNumber = `TXN-${String(seq + 1).padStart(6, '0')}`;
  }
});

const Transaction: Model<ITransaction> =
  mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;

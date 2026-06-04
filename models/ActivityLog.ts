import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActivityLog extends Document {
  subscriber: mongoose.Types.ObjectId;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  performedBy: 'admin' | 'user';
  performedByEmail: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    subscriber: { type: Schema.Types.ObjectId, ref: 'Subscriber', required: true, index: true },
    action: { type: String, required: true },
    field: { type: String },
    oldValue: { type: String },
    newValue: { type: String },
    performedBy: { type: String, enum: ['admin', 'user'], required: true },
    performedByEmail: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

export default ActivityLog;

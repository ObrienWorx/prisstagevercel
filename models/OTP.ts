import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOTP extends Document {
  email: string;
  code: string;
  purpose: 'email-verify' | 'password-reset' | 'login';
  expiresAt: Date;
  createdAt: Date;
}

const OTPSchema = new Schema<IOTP>({
  email: { type: String, required: true, lowercase: true, trim: true },
  code: { type: String, required: true },
  purpose: { type: String, enum: ['email-verify', 'password-reset', 'login'], required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OTPSchema.index({ email: 1, purpose: 1 });

// In development, always re-register so HMR schema changes take effect without a restart
if (process.env.NODE_ENV !== 'production') delete (mongoose.models as Record<string, unknown>).OTP;
const OTP: Model<IOTP> = mongoose.models.OTP || mongoose.model<IOTP>('OTP', OTPSchema);
export default OTP;

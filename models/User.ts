// models/User.ts
// User model with role-based access control

import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// Define what a User document looks like in TypeScript
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'sub-admin';
  // Array of module names this user can access
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Method to compare passwords
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    role: {
      type: String,
      enum: ['admin', 'sub-admin'],
      default: 'sub-admin',
    },
    // List of modules this user has access to
    // Example: ['reports', 'blogs', 'categories']
    permissions: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Auto-adds createdAt and updatedAt
  }
);

// ✅ IMPORTANT: Hash password BEFORE saving to DB
// This runs automatically whenever a user is saved
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare entered password with hashed password in DB
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Prevent model re-compilation in development (Next.js hot reload issue)
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
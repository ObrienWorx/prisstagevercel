import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChapter {
  title: string;
  slug: string;
  content: string;
  quizQuestions: { q: string; opts: string[]; correct: number; explanation: string }[];
  order: number;
}

export interface ILearnAndEarn extends Document {
  title: string;
  slug: string;
  description: string;
  featuredImage: string;
  publishStatus: 'draft' | 'published';
  chapters: IChapter[];
  createdAt: Date;
  updatedAt: Date;
}

const QuizQuestionSchema = new Schema(
  { q: { type: String, default: '' }, opts: { type: [String], default: [] }, correct: { type: Number, default: 0 }, explanation: { type: String, default: '' } },
  { _id: false }
);

const ChapterSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    content: { type: String, default: '' },
    quizQuestions: { type: [QuizQuestionSchema], default: [] },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const LearnAndEarnSchema = new Schema<ILearnAndEarn>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    featuredImage: { type: String, default: '' },
    publishStatus: { type: String, enum: ['draft', 'published'], default: 'draft' },
    chapters: { type: [ChapterSchema], default: [] },
  },
  { timestamps: true }
);

const LearnAndEarn: Model<ILearnAndEarn> =
  mongoose.models.LearnAndEarn || mongoose.model<ILearnAndEarn>('LearnAndEarn', LearnAndEarnSchema);

export default LearnAndEarn;

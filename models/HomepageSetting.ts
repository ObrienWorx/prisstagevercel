import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHomepageSetting extends Document {
  key: string;
  heroImage: string;
  videoSectionTitle: string;
  videoSectionDescription: string;
  videoSectionButtonText: string;
  videoSectionButtonHref: string;
  videoSectionYoutubeUrl: string;
  tickerLeadPdf: string;    // report emailed to homepage "Ticker" unlock leads
  blogLeadPdf: string;      // report emailed to blog-category "claim your free copy" leads
  createdAt: Date;
  updatedAt: Date;
}

const HomepageSettingSchema = new Schema<IHomepageSetting>(
  {
    key: { type: String, required: true, unique: true, default: 'homepage' },
    heroImage: { type: String, default: '' },
    videoSectionTitle: { type: String, default: 'Watch. Learn. Invest Smarter.' },
    videoSectionDescription: {
      type: String,
      default: 'Don’t miss out on the latest market updates and expert tips! Watch our videos for in-depth ASX stock analysis, daily trends, and strategies to grow your portfolio. Stay informed, stay ahead—click play and take the first step towards smarter investing today!',
    },
    videoSectionButtonText: { type: String, default: 'Show All Videos' },
    videoSectionButtonHref: { type: String, default: '/videos' },
    videoSectionYoutubeUrl: { type: String, default: '' },
    tickerLeadPdf: { type: String, default: '' },
    blogLeadPdf: { type: String, default: '' },
  },
  { timestamps: true }
);

delete (mongoose.models as Record<string, unknown>).HomepageSetting;
const HomepageSetting: Model<IHomepageSetting> =
  mongoose.model<IHomepageSetting>('HomepageSetting', HomepageSettingSchema);

export default HomepageSetting;

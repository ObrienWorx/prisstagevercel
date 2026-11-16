import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHeroSlide {
  image: string;
  title: string;
  link: string;
}

export interface IHomepageSetting extends Document {
  key: string;
  heroImage: string;
  heroSlides: IHeroSlide[];
  videoSectionTitle: string;
  videoSectionDescription: string;
  videoSectionButtonText: string;
  videoSectionButtonHref: string;
  videoSectionYoutubeUrl: string;
  tickerLeadPdf: string;
  blogLeadPdf: string;
  // Blog popup (LeadCapturePopup)
  blogPopupTitle: string;
  blogPopupButtonText: string;
  blogPopupSuccessText: string;
  // Blog sidebar promo (BlogSidebarPromo)
  blogPromoHeading: string;
  blogPromoLead: string;
  blogPromoSubtitle: string;
  blogPromoItems: string[];
  blogPromoButtonText: string;
  blogPromoPopupTitle: string;
  blogPromoPopupButtonText: string;
  blogPromoPopupSuccessText: string;
  createdAt: Date;
  updatedAt: Date;
}

const HeroSlideSchema = new Schema<IHeroSlide>(
  {
    image: { type: String, default: '' },
    title: { type: String, default: '' },
    link: { type: String, default: '' },
  },
  { _id: false }
);

const HomepageSettingSchema = new Schema<IHomepageSetting>(
  {
    key: { type: String, required: true, unique: true, default: 'homepage' },
    // Legacy single hero image — kept in sync with heroSlides[0] for back-compat.
    heroImage: { type: String, default: '' },
    heroSlides: { type: [HeroSlideSchema], default: [] },
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
    blogPopupTitle: { type: String, default: 'Please fill the details to Unlock the Exclusive ASX Stock Report' },
    blogPopupButtonText: { type: String, default: 'Unlock the Ticker' },
    blogPopupSuccessText: { type: String, default: 'You will receive the detailed Stock Report on your submitted email.' },
    blogPromoHeading: { type: String, default: 'Some ASX Opportunities Are Still Flying Under the Radar.' },
    blogPromoLead: { type: String, default: 'Download our Complimentary Research Report featuring 5 ASX-listed companies poised to grow this year.' },
    blogPromoSubtitle: { type: String, default: "What's in the Complimentary Report?" },
    blogPromoItems: { type: [String], default: [
      '5 high-potential ASX stocks selected by our experts',
      'Technical and fundamental analysis explained in a simple format',
      'General research opinions and market outlook on each company',
      'Key business highlights, sector trends, and growth drivers',
      'Insights designed to help investors make more informed decisions',
    ]},
    blogPromoButtonText: { type: String, default: 'Claim your Free Copy' },
    blogPromoPopupTitle: { type: String, default: 'Please fill the details to Unlock the Exclusive ASX Stock Report' },
    blogPromoPopupButtonText: { type: String, default: 'Unlock the Report' },
    blogPromoPopupSuccessText: { type: String, default: 'You will receive the detailed Stock Report on your submitted email.' },
  },
  { timestamps: true }
);

delete (mongoose.models as Record<string, unknown>).HomepageSetting;
const HomepageSetting: Model<IHomepageSetting> =
  mongoose.model<IHomepageSetting>('HomepageSetting', HomepageSettingSchema);

export default HomepageSetting;

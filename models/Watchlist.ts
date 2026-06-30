import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWatchlistStock {
  _id: Types.ObjectId;
  symbol: string;
  companyName: string;
}

export interface IWatchlist extends Document {
  subscriberId: Types.ObjectId;
  name: string;
  stocks: IWatchlistStock[];
}

const WatchlistStockSchema = new Schema<IWatchlistStock>({
  symbol:      { type: String, required: true, uppercase: true, trim: true },
  companyName: { type: String, required: true, trim: true },
});

const WatchlistSchema = new Schema<IWatchlist>({
  subscriberId: { type: Schema.Types.ObjectId, ref: 'Subscriber', required: true, index: true },
  name:         { type: String, required: true, trim: true },
  stocks:       { type: [WatchlistStockSchema], default: [] },
}, { timestamps: true });

export default mongoose.models.Watchlist || mongoose.model<IWatchlist>('Watchlist', WatchlistSchema);

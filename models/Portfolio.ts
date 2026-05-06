import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IStock {
  _id: Types.ObjectId;
  symbol: string;
  companyName: string;
  quantity: number;
  buyPrice: number;
  buyDate: Date;
}

export interface IPortfolio extends Document {
  subscriberId: Types.ObjectId;
  name: string;
  stocks: IStock[];
}

const StockSchema = new Schema<IStock>({
  symbol:      { type: String, required: true, uppercase: true, trim: true },
  companyName: { type: String, required: true, trim: true },
  quantity:    { type: Number, required: true, min: 0 },
  buyPrice:    { type: Number, required: true, min: 0 },
  buyDate:     { type: Date,   required: true },
});

const PortfolioSchema = new Schema<IPortfolio>({
  subscriberId: { type: Schema.Types.ObjectId, ref: 'Subscriber', required: true, index: true },
  name:         { type: String, required: true, trim: true },
  stocks:       { type: [StockSchema], default: [] },
}, { timestamps: true });

export default mongoose.models.Portfolio || mongoose.model<IPortfolio>('Portfolio', PortfolioSchema);

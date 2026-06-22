// Shared sale-aware price resolver — mirrors the logic used across checkout routes & pages.
// Returns the price a buyer actually pays right now, given whether they came via a sale-offer link.

interface PricedProduct {
  regularPrice: number;
  salePrice?: number | null;
  saleOverPrice?: number | null;
  saleStartDate?: Date | string | null;
  saleEndDate?: Date | string | null;
}

export function effectivePrice(product: PricedProduct, saleOffer: boolean, now: Date = new Date()): number {
  const isSaleActive = saleOffer && product.salePrice != null &&
    (!product.saleStartDate || new Date(product.saleStartDate) <= now) &&
    (!product.saleEndDate || new Date(product.saleEndDate) >= now);
  const isSaleEnded = !!(saleOffer && product.saleEndDate && new Date(product.saleEndDate) < now);

  if (isSaleActive) return product.salePrice!;
  if (isSaleEnded && product.saleOverPrice != null) return product.saleOverPrice;
  return product.regularPrice;
}

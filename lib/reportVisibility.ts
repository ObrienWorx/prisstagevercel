// A published report is only publicly visible once its publish date/time has
// passed. This is how scheduling works without a cron: give a report a future
// publishedAt and it stays hidden on the frontend until that moment.
//
// Spread this into any public report query alongside `publishStatus: 'published'`.
// `{ $not: { $gt: now } }` matches past dates AND null/missing publishedAt
// (legacy reports), so nothing existing disappears.
export function notFutureDated() {
  return { publishedAt: { $not: { $gt: new Date() } } } as const;
}

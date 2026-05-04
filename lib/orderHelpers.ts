export function calculateExpiryDate(startDate: Date, durationType: 'days' | 'months' | 'years', durationValue: number): Date {
  const expiry = new Date(startDate);
  if (durationType === 'months') {
    expiry.setMonth(expiry.getMonth() + durationValue);
  } else if (durationType === 'years') {
    expiry.setFullYear(expiry.getFullYear() + durationValue);
  } else {
    expiry.setDate(expiry.getDate() + durationValue);
  }
  return expiry;
}

export function isProductActive(expiryDate: Date): boolean {
  return new Date() < new Date(expiryDate);
}

export function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^?&\s]+)/);
  return match ? match[1] : null;
}

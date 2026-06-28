export function dateRangeFilter(from?: string, to?: string): Record<string, Date> | null {
  const range: Record<string, Date> = {};

  if (from) {
    const start = new Date(from);
    if (!Number.isNaN(start.getTime())) {
      start.setHours(0, 0, 0, 0);
      range.$gte = start;
    }
  }

  if (to) {
    const end = new Date(to);
    if (!Number.isNaN(end.getTime())) {
      end.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 1);
      range.$lt = end;
    }
  }

  return Object.keys(range).length ? range : null;
}

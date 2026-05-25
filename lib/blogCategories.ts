export function normalizeBlogCategories(categories: unknown, fallbackCategory?: unknown) {
  const values = Array.isArray(categories)
    ? categories
    : categories
      ? [categories]
      : fallbackCategory
        ? [fallbackCategory]
        : [];

  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim() !== '').map(value => value.trim()))];
}

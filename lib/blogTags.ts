export function normalizeBlogTags(input: unknown) {
  const rawTags = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(',')
      : [];

  const uniqueTags = new Map<string, string>();

  rawTags.forEach((tag) => {
    if (typeof tag !== 'string') return;

    const cleanTag = tag.replace(/\s+/g, ' ').trim();
    if (!cleanTag) return;

    const key = cleanTag.toLocaleLowerCase();
    if (!uniqueTags.has(key)) uniqueTags.set(key, cleanTag);
  });

  return [...uniqueTags.values()].slice(0, 12);
}

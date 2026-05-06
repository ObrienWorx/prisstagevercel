import { unlink } from 'fs/promises';
import path from 'path';

// Deletes a file that was uploaded to /public/uploads/.
// Silently ignores external URLs, empty values, and missing files.
export async function deleteUploadedFile(url: string | null | undefined): Promise<void> {
  if (!url) return;
  // Only handle local uploads — skip external URLs
  if (!url.startsWith('/uploads/')) return;
  try {
    const filePath = path.join(process.cwd(), 'public', url);
    await unlink(filePath);
  } catch {
    // File already gone or path wrong — not an error worth surfacing
  }
}

// Convenience: delete multiple images at once (skips nullish/external entries)
export async function deleteUploadedFiles(...urls: (string | null | undefined)[]): Promise<void> {
  await Promise.all(urls.map(deleteUploadedFile));
}

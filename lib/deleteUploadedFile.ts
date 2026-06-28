import { unlink } from 'fs/promises';
import path from 'path';

export async function deleteUploadedFile(url: string | null | undefined): Promise<void> {
  if (!url) return;
  if (!url.startsWith('/uploads/')) return;
  try {
    const filePath = path.join(process.cwd(), 'public', url);
    await unlink(filePath);
  } catch {
  }
}

export async function deleteUploadedFiles(...urls: (string | null | undefined)[]): Promise<void> {
  await Promise.all(urls.map(deleteUploadedFile));
}

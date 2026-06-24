import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { put } from '@vercel/blob';
import { authenticate } from '@/middleware/authMiddleware';

export async function POST(req: NextRequest) {
  const { error } = await authenticate(req);
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file || !file.size) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const images = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    const isPdf = file.type === 'application/pdf';
    if (!images.includes(file.type) && !isPdf) {
      return NextResponse.json({ success: false, error: 'Only images (jpg, png, webp, gif, svg) or PDF are allowed' }, { status: 400 });
    }

    const maxSize = isPdf ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: `File size must be under ${isPdf ? 20 : 5}MB` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

    // On Vercel the filesystem is read-only, so files written to public/uploads don't
    // persist. When Blob storage is configured, upload there and return the blob URL.
    // Locally (no token) fall back to writing to public/uploads so dev keeps working.
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`uploads/${filename}`, buffer, {
        access: 'public',
        contentType: file.type,
      });
      return NextResponse.json({ success: true, url: blob.url });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);
    return NextResponse.json({ success: true, url: `/uploads/${filename}` });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}

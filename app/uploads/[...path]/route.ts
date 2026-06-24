import { NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import type { NextRequest } from 'next/server';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

function isSafePath(parts: string[]) {
  return parts.length > 0 && parts.every((part) => part !== '' && !part.includes('..') && !part.includes('/') && !part.includes('\\'));
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await context.params;
  if (!isSafePath(parts)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const fileName = parts.join('/');
  const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return new NextResponse('Not found', { status: 404 });
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return new NextResponse('Not found', { status: 404 });
  }
}

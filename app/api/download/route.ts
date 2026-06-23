import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get('file') || '';
  const m = file.match(/^\/?uploads\/([A-Za-z0-9._-]+\.pdf)$/i);
  if (!m) return new NextResponse('Not found', { status: 404 });
  const filename = m[1];
  try {
    const buf = await readFile(path.join(process.cwd(), 'public', 'uploads', filename));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="PristineGaze-Report.pdf"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}

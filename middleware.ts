// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/** Add any extra origins you use locally or in Vercel */
const ALLOWED_ORIGINS = [
  'http://localhost:19007', // Expo web dev
  'http://localhost:19006', // Expo alt port
  'http://localhost:8081',  // Metro dev server (if used from web)
  'https://ks-mailer-zodm.vercel.app',
  // (Optional) preview deployments wildcard can't be listed directly.
  // If you need a specific preview URL, add it here after first deploy.
];

function withCors(res: NextResponse, origin: string | null) {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
  }
  // Vary so caches don't mix origins
  res.headers.set('Vary', 'Origin');
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  return res;
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin');
  const url = req.nextUrl;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    return withCors(new NextResponse(null, { status: 204 }), origin);
  }

  // Require x-api-key on all /api/* requests
  const serverKey = process.env.MAILER_KEY;
  if (!serverKey) {
    return withCors(
      new NextResponse('Server misconfigured: MAILER_KEY missing', { status: 500 }),
      origin
    );
  }
  const clientKey = req.headers.get('x-api-key');
  if (clientKey !== serverKey) {
    return withCors(new NextResponse('Unauthorized', { status: 401 }), origin);
  }

  // Allow through; append CORS to response
  const res = NextResponse.next();
  return withCors(res, origin);
}

// Only run on API routes — avoids 401s for assets like /next.svg
export const config = {
  matcher: ['/api/:path*'],
};
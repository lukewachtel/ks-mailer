import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.MAILER_KEY; // same key you use in the app

export function middleware(req: NextRequest) {
  // Only check API routes
  const key = req.headers.get('x-api-key');
  if (!API_KEY || key !== API_KEY) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const origin = req.headers.get('origin') || '';
  const res = NextResponse.next();

  // Allow local and deployed origins
  const allowed = [
    'http://localhost:19007',
    'https://ks-mailer-zodm.vercel.app',
  ];
  if (allowed.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
  }

  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  return res;
}

// ✅ Apply only to API routes, not static files like /next.svg
export const config = {
  matcher: ['/api/:path*'],
};
import { NextResponse } from 'next/server';

// Allow your Expo web origins (add/remove as needed)
const ALLOWED_ORIGINS = ['http://localhost:8081', 'http://localhost:19006'];

function corsHeaders(origin?: string) {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowOrigin, // echo exact origin when using auth headers
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// Preflight (browser checks CORS before POST)
export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin') ?? undefined;
  return new NextResponse(null, { status: 200, headers: corsHeaders(origin) });
}

// Actual email endpoint
export async function POST(req: Request) {
  const origin = req.headers.get('origin') ?? undefined;

  try {
    const body = await req.json();
    // TODO: send your email here using server-side secrets
    return NextResponse.json({ ok: true }, { headers: corsHeaders(origin) });
  } catch (err: any) {
    return new NextResponse(err?.message ?? 'Internal Error', {
      status: 500,
      headers: corsHeaders(origin),
    });
  }
}
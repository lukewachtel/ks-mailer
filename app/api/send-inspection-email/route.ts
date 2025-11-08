import { NextResponse } from 'next/server';

const ALLOWED_ORIGINS = ['http://localhost:8081', 'http://localhost:19006'];

function corsHeaders(origin?: string) {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin') ?? undefined;
  return new NextResponse(null, { status: 200, headers: corsHeaders(origin) });
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin') ?? undefined;

  // 🔐 Check client key against your secret key on Vercel
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== process.env.MAILER_KEY) {
    return new NextResponse('Unauthorized', { status: 401, headers: corsHeaders(origin) });
  }

  try {
    const body = await req.json();
    // TODO: send the email here using your email provider
    return NextResponse.json({ ok: true }, { headers: corsHeaders(origin) });
  } catch (err: any) {
    return new NextResponse(err?.message ?? 'Internal Error', {
      status: 500,
      headers: corsHeaders(origin),
    });
  }
}
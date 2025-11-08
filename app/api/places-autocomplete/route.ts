import { NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:19007',
];

function corsHeaders(origin?: string) {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function isAuthorized(req: Request) {
  const configured = process.env.MAILER_KEY;
  if (!configured) return true;
  const provided = req.headers.get('x-api-key') || '';
  return provided === configured;
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin') ?? undefined;
  return new NextResponse(null, { status: 200, headers: corsHeaders(origin) });
}

export async function GET(req: Request) {
  const origin = req.headers.get('origin') ?? undefined;

  if (!isAuthorized(req)) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: corsHeaders(origin),
    });
  }

  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || '';
    const components = url.searchParams.get('components') || 'country:au';

    if (!q) {
      return NextResponse.json(
        { predictions: [], status: 'ZERO_RESULTS', error: 'Missing q param' },
        { headers: corsHeaders(origin) }
      );
    }

    const key = process.env.GOOGLE_PLACES_KEY;
    if (!key) {
      return NextResponse.json(
        { predictions: [], status: 'ERROR', error: 'Server misconfigured: GOOGLE_PLACES_KEY missing' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    const googleUrl =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
      new URLSearchParams({
        input: q,
        key,
        components,
      }).toString();

    const resp = await fetch(googleUrl, { method: 'GET', cache: 'no-store' });
    const data = await resp.json();

    return NextResponse.json(data, { headers: corsHeaders(origin) });
  } catch (err: any) {
    const msg = typeof err?.message === 'string' ? err.message : 'Internal Error';
    return new NextResponse(msg, { status: 500, headers: corsHeaders(origin) });
  }
}
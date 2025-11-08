// app/api/places-autocomplete/route.ts
import { NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:19007', // Expo web on 19007
];

function cors(origin?: string) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin') ?? undefined;
  return new NextResponse(null, { status: 200, headers: cors(origin) });
}

export async function GET(req: Request) {
  const origin = req.headers.get('origin') ?? undefined;

  // 🔑 Read your server-side Google key
  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key) {
    return new NextResponse('Server misconfigured: GOOGLE_PLACES_KEY missing', {
      status: 500,
      headers: cors(origin),
    });
  }

  // Support either ?q= or ?input= on the query string
  const { searchParams } = new URL(req.url);
  const input = searchParams.get('q') || searchParams.get('input') || '';
  if (!input) {
    return NextResponse.json({ suggestions: [] }, { headers: cors(origin) });
  }

  try {
    // Call Google server-to-server to avoid exposing the key in the browser
    const url =
      'https://maps.googleapis.com/maps/api/place/autocomplete/json?' +
      new URLSearchParams({
        input,
        key,
        // tweak types/region/language as you like:
        types: 'geocode',
        components: 'country:au',
      }).toString();

    const resp = await fetch(url, { cache: 'no-store' });
    const data = await resp.json();

    const suggestions = Array.isArray(data?.predictions)
      ? data.predictions.map((p: any, i: number) => ({
          id: p.place_id || String(i),
          label: p.description || '',
          components: {}, // you can add a details-by-place_id route later if needed
        }))
      : [];

    return NextResponse.json({ suggestions }, { headers: cors(origin) });
  } catch (e: any) {
    return new NextResponse(e?.message || 'Upstream error', {
      status: 502,
      headers: cors(origin),
    });
  }
}
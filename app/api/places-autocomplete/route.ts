// app/api/places-autocomplete/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'http://localhost:19007',
  'http://localhost:19006',
  'http://localhost:8081',
  'https://ks-mailer-zodm.vercel.app',
];

function cors(res: NextResponse, origin: string | null) {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
  }
  res.headers.set('Vary', 'Origin');
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  return res;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return cors(new NextResponse(null, { status: 204 }), origin);
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key) {
    return cors(
      new NextResponse('Server misconfigured: GOOGLE_PLACES_KEY missing', { status: 500 }),
      origin
    );
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) {
    return cors(new NextResponse(JSON.stringify({ suggestions: [] }), { status: 200 }), origin);
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', q);
  url.searchParams.set('language', 'en-AU');
  url.searchParams.set('components', 'country:au');
  url.searchParams.set('types', 'geocode');
  url.searchParams.set('key', key);

  try {
    const resp = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
    const data = await resp.json();

    if (data.status !== 'OK') {
      return cors(
        new NextResponse(
          JSON.stringify({ suggestions: [], googleStatus: data.status, googleError: data.error_message || null }),
          { status: 200 }
        ),
        origin
      );
    }

    const suggestions = (data.predictions || []).map((p: any, idx: number) => ({
      id: p.place_id || String(idx),
      label: p.description || '',
      components: {},
    }));

    return cors(
      new NextResponse(JSON.stringify({ suggestions }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
      origin
    );
  } catch (e: any) {
    return cors(
      new NextResponse(JSON.stringify({ suggestions: [], error: e?.message || 'Internal Error' }), { status: 200 }),
      origin
    );
  }
}
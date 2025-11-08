// app/api/place-details/route.ts
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
  const placeId = searchParams.get('id');
  const label = searchParams.get('label') || '';

  if (!placeId) {
    return cors(new NextResponse(JSON.stringify({ error: 'Missing id (place_id)' }), { status: 400 }), origin);
  }

  const fields = ['address_component', 'formatted_address', 'geometry/location', 'name'].join(',');

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', fields);
  url.searchParams.set('language', 'en-AU');
  url.searchParams.set('key', key);

  try {
    const resp = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
    const data = await resp.json();

    if (data.status !== 'OK') {
      return cors(
        new NextResponse(
          JSON.stringify({ error: 'Google Places error', googleStatus: data.status, googleError: data.error_message || null }),
          { status: 502 }
        ),
        origin
      );
    }

    const comps = (data.result?.address_components || []) as Array<{ long_name: string; short_name: string; types: string[] }>;

    const byType = (t: string) => comps.find(c => c.types.includes(t));

    const components = {
      unitNumber: '',
      streetNumber: byType('street_number')?.long_name || '',
      streetName: byType('route')?.long_name || '',
      streetType: '',
      suburb: byType('locality')?.long_name || byType('postal_town')?.long_name || '',
      state: byType('administrative_area_level_1')?.short_name || '',
      postcode: byType('postal_code')?.long_name || '',
      country: byType('country')?.long_name || 'Australia',
    };

    const body = {
      id: placeId,
      label: label || data.result?.formatted_address || '',
      components,
    };

    return cors(
      new NextResponse(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
      origin
    );
  } catch (e: any) {
    return cors(
      new NextResponse(JSON.stringify({ error: e?.message || 'Internal Error' }), { status: 500 }),
      origin
    );
  }
}
// app/api/place-details/route.ts
import { NextResponse } from 'next/server';

function corsHeaders(origin?: string) {
  const ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:19007', // Expo web on 19007
];

export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin') ?? undefined;
  return new NextResponse(null, { status: 200, headers: corsHeaders(origin) });
}

export async function GET(req: Request) {
  const origin = req.headers.get('origin') ?? undefined;
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get('place_id') || searchParams.get('placeId');

  const API_KEY = process.env.GOOGLE_PLACES_KEY;
  if (!API_KEY) {
    return new NextResponse('Server misconfigured: GOOGLE_PLACES_KEY missing', {
      status: 500,
      headers: corsHeaders(origin),
    });
  }
  if (!placeId) {
    return NextResponse.json({ error: 'Missing place_id' }, { status: 400, headers: corsHeaders(origin) });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      placeId
    )}&fields=address_components,formatted_address,name&key=${API_KEY}`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (data.status !== 'OK' || !data.result) {
      return NextResponse.json(
        { error: data.status || 'No result' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const comps: Array<{ long_name: string; short_name: string; types: string[] }> =
      data.result.address_components || [];

    const get = (type: string, useShort = false) =>
      (comps.find((c) => c.types.includes(type)) || ({} as any))[useShort ? 'short_name' : 'long_name'] || '';

    const components = {
      unitNumber: '',
      streetNumber: get('street_number'),
      streetName: get('route'),
      streetType: '',
      suburb: get('locality') || get('postal_town') || get('sublocality') || '',
      state: get('administrative_area_level_1', true),
      postcode: get('postal_code'),
      country: get('country'),
    };

    return NextResponse.json(
      {
        id: placeId,
        label: data.result.formatted_address || data.result.name || '',
        components,
      },
      { headers: corsHeaders(origin) }
    );
  } catch (e: any) {
    return new NextResponse(e?.message || 'Internal Error', {
      status: 500,
      headers: corsHeaders(origin),
    });
  }
}
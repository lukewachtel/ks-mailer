// app/api/places-autocomplete/route.ts
import { NextResponse } from 'next/server';

const ALLOWED_ORIGINS = ['http://localhost:19007', 'http://localhost:8081'];

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
  };
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

function checkAuth(req: Request) {
  const sent = req.headers.get('x-api-key') || '';
  const server = process.env.MAILER_PROXY_KEY || '';
  if (!server) {
    return { ok: false, code: 500, msg: 'Server misconfigured: MAILER_PROXY_KEY missing' };
  }
  if (!sent) {
    return { ok: false, code: 401, msg: 'Unauthorized: x-api-key header missing' };
  }
  if (sent !== server) {
    return { ok: false, code: 401, msg: 'Unauthorized: bad x-api-key' };
  }
  return { ok: true, code: 200, msg: 'ok' };
}

export async function GET(req: Request) {
  const origin = req.headers.get('origin');
  const auth = checkAuth(req);
  if (!auth.ok) {
    return new NextResponse(auth.msg, { status: auth.code, headers: corsHeaders(origin) });
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    if (!q) {
      return NextResponse.json({ suggestions: [] }, { headers: corsHeaders(origin) });
    }

    const key = process.env.GOOGLE_PLACES_KEY || '';
    if (!key) {
      return new NextResponse('Server misconfigured: GOOGLE_PLACES_KEY missing', {
        status: 500,
        headers: corsHeaders(origin),
      });
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&components=country:au&key=${key}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return new NextResponse(`Upstream error: ${resp.status} ${text}`, {
        status: 502,
        headers: corsHeaders(origin),
      });
    }
    const data = await resp.json();

    const suggestions = (data?.predictions || []).map((p: any) => ({
      id: p.place_id,
      label: p.description,
      components: {},
    }));

    return NextResponse.json({ suggestions }, { headers: corsHeaders(origin) });
  } catch (e: any) {
    return new NextResponse(e?.message || 'Internal Error', {
      status: 500,
      headers: corsHeaders(origin),
    });
  }
}
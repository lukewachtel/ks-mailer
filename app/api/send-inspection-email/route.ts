import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Force Node runtime and disable static optimization for this route
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allow local Expo web origins (add ports you use)
const ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:19007',
];

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

  // Shared-secret check with your Expo app
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== process.env.MAILER_KEY) {
    return new NextResponse('Unauthorized', { status: 401, headers: corsHeaders(origin) });
  }

  // Lazily create the Resend client at request time (prevents build-time errors)
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return new NextResponse('Server misconfigured: RESEND_API_KEY missing', {
      status: 500,
      headers: corsHeaders(origin),
    });
  }
  const resend = new Resend(RESEND_API_KEY);

  try {
    const { to, subject, html } = await req.json();
    if (!to || !subject || !html) {
      return new NextResponse('Missing to/subject/html', { status: 400, headers: corsHeaders(origin) });
    }

    const result = await resend.emails.send({
      from: 'Key & Stone <onboarding@resend.dev>',
      to,
      subject,
      html,
    });

    if (result.error) {
      return new NextResponse(result.error.message ?? 'Email send failed', {
        status: 500,
        headers: corsHeaders(origin),
      });
    }

    return NextResponse.json(
      { ok: true, id: result.data?.id ?? null },
      { headers: corsHeaders(origin) }
    );
  } catch (err: any) {
    const msg = typeof err?.message === 'string' ? err.message : 'Internal Error';
    return new NextResponse(msg, { status: 500, headers: corsHeaders(origin) });
  }
}
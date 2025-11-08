import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Force Node runtime & disable static optimizations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allow your local Expo web origins
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

  // 1) Shared-secret check
  const clientKey = req.headers.get('x-api-key');
  if (clientKey !== process.env.MAILER_KEY) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: MAILER_KEY mismatch' },
      { status: 401, headers: corsHeaders(origin) }
    );
  }

  // 2) Ensure Resend key is present at runtime (not build-time)
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return NextResponse.json(
      { ok: false, error: 'Server misconfigured: RESEND_API_KEY missing' },
      { status: 500, headers: corsHeaders(origin) }
    );
  }

  let parsed: any = {};
  try {
    parsed = await req.json();
  } catch {
    // ignore
  }

  const { to, subject, html } = parsed || {};
  if (!to || !subject || !html) {
    return NextResponse.json(
      { ok: false, error: 'Missing to/subject/html' },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  // 3) Create client lazily
  const resend = new Resend(RESEND_API_KEY);

  try {
    const result = await resend.emails.send({
      from: 'Key & Stone <onboarding@resend.dev>',
      to,
      subject,
      html,
    });

    // If Resend returns an error structure, surface it
    if (result?.error) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error.message || 'Resend error',
          details: result.error, // extra context for debugging
        },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json(
      { ok: true, id: result?.data?.id ?? null },
      { headers: corsHeaders(origin) }
    );
  } catch (err: any) {
    // Return error details to the client so you can see the cause
    return NextResponse.json(
      {
        ok: false,
        error: String(err?.message || err || 'Internal Error'),
      },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
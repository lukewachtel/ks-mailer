import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const ALLOWED_ORIGINS = ['http://localhost:8081', 'http://localhost:19006'];

// Resend client with server-side key
const resend = new Resend(process.env.RESEND_API_KEY);

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

  // shared-secret check from client
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== process.env.MAILER_KEY) {
    return new NextResponse('Unauthorized', { status: 401, headers: corsHeaders(origin) });
  }

  try {
    const { to, subject, html } = await req.json();
    if (!to || !subject || !html) {
      return new NextResponse('Missing to/subject/html', { status: 400, headers: corsHeaders(origin) });
    }

    // Quick start "from" – works without domain setup
    const result = await resend.emails.send({
      from: 'Key & Stone <onboarding@resend.dev>',
      to,
      subject,
      html,
    });

    return NextResponse.json({ ok: true, id: result?.id ?? null }, { headers: corsHeaders(origin) });
  } catch (err: any) {
    const msg = typeof err?.message === 'string' ? err.message : 'Internal Error';
    return new NextResponse(msg, { status: 500, headers: corsHeaders(origin) });
  }
}
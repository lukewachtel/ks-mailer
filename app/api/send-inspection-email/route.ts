import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// ✅ Force Node.js runtime (required for sending emails)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ✅ Allow your local Expo ports
const ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:19007',
  'https://ks-mailer-zodm.vercel.app', // your deployed origin
];

// ✅ Setup Resend client with your server key
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

// ✅ Handle browser preflight requests
export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin') ?? undefined;
  return new NextResponse(null, { status: 200, headers: corsHeaders(origin) });
}

// ✅ Handle actual email send
export async function POST(req: Request) {
  const origin = req.headers.get('origin') ?? undefined;

  try {
    // Check API key from Expo frontend
    const apiKey = req.headers.get('x-api-key');
    if (apiKey !== process.env.MAILER_KEY) {
      return new NextResponse('Unauthorized', { status: 401, headers: corsHeaders(origin) });
    }

    const { to, subject, html } = await req.json();
    if (!to || !subject || !html) {
      return new NextResponse('Missing to/subject/html', { status: 400, headers: corsHeaders(origin) });
    }

    // ✅ Send email via Resend
    const result = await resend.emails.send({
      from: 'Key & Stone <onboarding@resend.dev>',
      to,
      subject,
      html,
    });

    // ✅ Handle response safely (fix for type error)
    if (result.error) {
      console.error('Resend error:', result.error);
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
    console.error('Mailer error:', err);
    return new NextResponse(err?.message ?? 'Internal Error', {
      status: 500,
      headers: corsHeaders(origin),
    });
  }
}
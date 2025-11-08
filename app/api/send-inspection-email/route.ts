import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Make sure this route always runs on Node (not Edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allowed local origins (Expo web)
const ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:19007',
];

// Reusable CORS headers
function corsHeaders(origin?: string) {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// Handle preflight requests
export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin') ?? undefined;
  return new NextResponse(null, { status: 200, headers: corsHeaders(origin) });
}

// Handle POST requests (email sending)
export async function POST(req: Request) {
  const origin = req.headers.get('origin') ?? undefined;

  // 🔐 Step 1: Check the shared secret key
  const clientKey = req.headers.get('x-api-key');
  if (clientKey !== process.env.MAILER_KEY) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: MAILER_KEY mismatch' },
      { status: 401, headers: corsHeaders(origin) }
    );
  }

  // ⚙️ Step 2: Load Resend API key
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return NextResponse.json(
      { ok: false, error: 'Server misconfigured: RESEND_API_KEY missing' },
      { status: 500, headers: corsHeaders(origin) }
    );
  }

  // 📨 Step 3: Parse request body
  let parsed: any = {};
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  const { to, subject, html } = parsed || {};
  if (!to || !subject || !html) {
    return NextResponse.json(
      { ok: false, error: 'Missing to/subject/html' },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  // ✉️ Step 4: Initialize Resend client
  const resend = new Resend(RESEND_API_KEY);

  try {
    // ✅ Step 5: Send email — use your verified domain below
   const result = await resend.emails.send({
  from: 'Key & Stone <noreply@keyandstone.com.au>', // your verified domain
  to,
  subject,
  html,
  replyTo: 'hello@keyandstone.com.au',              // ✅ camelCase
});

    if (result?.error) {
      return NextResponse.json(
        { ok: false, error: result.error.message || 'Resend error' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json(
      { ok: true, id: result?.data?.id ?? null },
      { headers: corsHeaders(origin) }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Internal error' },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
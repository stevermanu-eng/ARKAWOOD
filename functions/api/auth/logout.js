import { SESSION_COOKIE, clearCookie, json } from '../../_lib/auth.js';

export async function onRequestPost(context) {
  return json({ ok: true }, {
    headers: { 'Set-Cookie': clearCookie(SESSION_COOKIE, context.request.url) }
  });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const target = new URL('/acceso-moderacion.html', url.origin);
  const headers = new Headers({ Location: target.toString(), 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', clearCookie(SESSION_COOKIE, context.request.url));
  return new Response(null, { status: 302, headers });
}

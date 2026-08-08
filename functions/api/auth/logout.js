import { SESSION_COOKIE, clearCookie, csrfTokenValid, isSameOriginRequest, json, sessionFromRequest } from '../../_lib/auth.js';

export async function onRequestPost(context) {
  if (!isSameOriginRequest(context.request)) {
    return json({ ok: false, code: 'cross_site_request' }, { status: 403 });
  }

  const session = await sessionFromRequest(context.request, context.env);
  if (session?.csrf && !csrfTokenValid(context.request, session)) {
    return json({ ok: false, code: 'csrf_invalid' }, { status: 403 });
  }

  return json({ ok: true }, {
    headers: { 'Set-Cookie': clearCookie(SESSION_COOKIE, context.request.url) }
  });
}

export function onRequestGet() {
  return json({ ok: false, code: 'method_not_allowed' }, { status: 405, headers: { Allow: 'POST' } });
}

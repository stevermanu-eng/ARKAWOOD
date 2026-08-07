import { sessionFromRequest, safeReturnPath } from './_lib/auth.js';

const PROTECTED_BRANCHES = [
  { access: '/acceso-moderacion.html', paths: new Set(['/postulacion-moderacion','/postulacion-moderacion/','/postulacion-moderacion.html','/moderation-form.js']) },
  { access: '/acceso-builders.html', paths: new Set(['/postulacion-builders','/postulacion-builders/','/postulacion-builders.html','/builders-form.js']) },
  { access: '/acceso-marketing.html', paths: new Set(['/postulacion-marketing','/postulacion-marketing/','/postulacion-marketing.html','/marketing-form.js']) }
];

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const branch = PROTECTED_BRANCHES.find((item) => item.paths.has(url.pathname));
  if (!branch) return context.next();

  const session = await sessionFromRequest(context.request, context.env);
  if (!session?.member) {
    const next = safeReturnPath(`${url.pathname}${url.search}`);
    const login = new URL(branch.access, url.origin);
    login.searchParams.set('next', next);
    login.searchParams.set('reason', session ? 'server-required' : 'login-required');
    return Response.redirect(login.toString(), 302);
  }

  const response = await context.next();
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  headers.set('Vary', 'Cookie');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

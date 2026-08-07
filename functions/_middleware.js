import { sessionFromRequest, safeReturnPath } from './_lib/auth.js';

const PROTECTED_BRANCHES = [
  { access: '/acceso-moderacion.html', paths: new Set(['/postulacion-moderacion','/postulacion-moderacion/','/postulacion-moderacion.html','/moderation-form.js']) },
  { access: '/acceso-builders.html', paths: new Set(['/postulacion-builders','/postulacion-builders/','/postulacion-builders.html','/builders-form.js']) },
  { access: '/acceso-marketing.html', paths: new Set(['/postulacion-marketing','/postulacion-marketing/','/postulacion-marketing.html','/marketing-form.js']) }
];

const AUDIT_PATHS = new Set([
  '/wiki/auditoria-staff',
  '/wiki/auditoria-staff/',
  '/wiki/auditoria-staff.html'
]);
const AUDIT_ROLE_FRESH_MS = 10 * 60 * 1000;

function privateResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  headers.set('Vary', 'Cookie');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (AUDIT_PATHS.has(url.pathname)) {
    const session = await sessionFromRequest(context.request, context.env);
    const next = safeReturnPath('/wiki/auditoria-staff.html');

    if (!session?.member) {
      const access = new URL('/wiki/auditoria-staff-acceso.html', url.origin);
      access.searchParams.set('reason', session ? 'server-required' : 'login-required');
      return Response.redirect(access.toString(), 302);
    }

    const checkedAt = session.roleCheckedAt ? Date.parse(session.roleCheckedAt) : NaN;
    const roleCheckFresh = Number.isFinite(checkedAt) && (Date.now() - checkedAt) <= AUDIT_ROLE_FRESH_MS;
    if (!roleCheckFresh) {
      const refresh = new URL('/api/auth/discord', url.origin);
      refresh.searchParams.set('return', next);
      return Response.redirect(refresh.toString(), 302);
    }

    if (!session.auditStaff) {
      const denied = new URL('/wiki/auditoria-staff-acceso.html', url.origin);
      denied.searchParams.set('reason', 'role-required');
      return Response.redirect(denied.toString(), 302);
    }

    return privateResponse(await context.next());
  }

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

  return privateResponse(await context.next());
}

import {
  AUDIT_ROLE_CHECK_FRESH_MS,
  MEMBER_CHECK_FRESH_MS,
  safeReturnPath,
  sessionCheckFresh,
  sessionFromRequest
} from './_lib/auth.js';

const PROTECTED_BRANCHES = [
  { access: '/acceso-moderacion.html', paths: new Set(['/postulacion-moderacion', '/postulacion-moderacion/', '/postulacion-moderacion.html']) },
  { access: '/acceso-builders.html', paths: new Set(['/postulacion-builders', '/postulacion-builders/', '/postulacion-builders.html']) },
  { access: '/acceso-marketing.html', paths: new Set(['/postulacion-marketing', '/postulacion-marketing/', '/postulacion-marketing.html']) }
];

const AUDIT_PATHS = new Set([
  '/wiki/auditoria-staff',
  '/wiki/auditoria-staff/',
  '/wiki/auditoria-staff.html'
]);

const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.discordapp.com; connect-src 'self'; font-src 'self'; media-src 'none'; frame-src 'none'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-Permitted-Cross-Domain-Policies': 'none'
});

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function appendVary(headers, value) {
  const existing = headers.get('Vary');
  const values = new Set((existing || '').split(',').map((item) => item.trim()).filter(Boolean));
  values.add(value);
  headers.set('Vary', [...values].join(', '));
}

function privateResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  appendVary(headers, 'Cookie');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  return withSecurityHeaders(new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  }));
}

function secureRedirect(target, status = 302) {
  return withSecurityHeaders(Response.redirect(target, status));
}

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (AUDIT_PATHS.has(url.pathname)) {
    const session = await sessionFromRequest(context.request, context.env);
    const next = safeReturnPath('/wiki/auditoria-staff.html');

    if (!session?.member) {
      const access = new URL('/wiki/auditoria-staff-acceso.html', url.origin);
      access.searchParams.set('reason', session ? 'server-required' : 'login-required');
      return secureRedirect(access.toString());
    }

    if (!sessionCheckFresh(session, AUDIT_ROLE_CHECK_FRESH_MS)) {
      const refresh = new URL('/api/auth/discord', url.origin);
      refresh.searchParams.set('return', next);
      return secureRedirect(refresh.toString());
    }

    if (!session.auditStaff) {
      const denied = new URL('/wiki/auditoria-staff-acceso.html', url.origin);
      denied.searchParams.set('reason', 'role-required');
      return secureRedirect(denied.toString());
    }

    return privateResponse(await context.next());
  }

  const branch = PROTECTED_BRANCHES.find((item) => item.paths.has(url.pathname));
  if (branch) {
    const session = await sessionFromRequest(context.request, context.env);
    const next = safeReturnPath(`${url.pathname}${url.search}`);

    if (!session?.member) {
      const login = new URL(branch.access, url.origin);
      login.searchParams.set('next', next);
      login.searchParams.set('reason', session ? 'server-required' : 'login-required');
      return secureRedirect(login.toString());
    }

    // La pertenencia al servidor no queda confiada durante los siete días de la cookie.
    // Para abrir un formulario se exige una comprobación reciente de Discord.
    if (!sessionCheckFresh(session, MEMBER_CHECK_FRESH_MS)) {
      const refresh = new URL('/api/auth/discord', url.origin);
      refresh.searchParams.set('return', next);
      return secureRedirect(refresh.toString());
    }

    return privateResponse(await context.next());
  }

  return withSecurityHeaders(await context.next());
}

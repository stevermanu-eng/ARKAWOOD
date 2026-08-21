import {
  OAUTH_RETURN_COOKIE,
  authConfig,
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  clearCookie,
  cookieString,
  createSessionToken,
  discordRedirectUri,
  filterRelevantDiscordRoles,
  parseCookies,
  requiredAuthConfig,
  safeReturnPath,
  sessionFromRequest
} from '../../_lib/auth.js';

const API = 'https://discord.com/api/v10';
const DISCORD_TIMEOUT_MS = 10000;

async function discordFetch(input, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('discord_timeout'), DISCORD_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function redirectWithCookies(target, requestUrl, cookies = []) {
  const headers = new Headers({ Location: target, 'Cache-Control': 'no-store' });
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(null, { status: 302, headers });
}

function accessPathFromReturn(returnPath) {
  const safe = safeReturnPath(returnPath);
  if (safe.includes('/wiki/auditoria-staff')) return '/wiki/auditoria-staff-acceso.html';
  if (safe.includes('builders')) return '/acceso-builders.html';
  if (safe.includes('marketing')) return '/acceso-marketing.html';
  return '/acceso-moderacion.html';
}

function errorRedirect(origin, code, requestUrl, returnPath = '/') {
  const safe = safeReturnPath(returnPath);
  // Los errores de una sincronización de perfil/foro deben volver al lugar donde
  // se inició el flujo. Nunca deben terminar en una página de postulaciones.
  const directReturn = safe.startsWith('/perfil') || safe.startsWith('/foro');
  const target = new URL(directReturn ? safe : accessPathFromReturn(safe), origin);
  target.searchParams.set(directReturn ? 'oauth_error' : 'error', code);
  return redirectWithCookies(target.toString(), requestUrl, [
    clearCookie(OAUTH_STATE_COOKIE, requestUrl),
    clearCookie(OAUTH_RETURN_COOKIE, requestUrl)
  ]);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const returnPath = safeReturnPath(cookies[OAUTH_RETURN_COOKIE]);
  if (!requiredAuthConfig(env)) return errorRedirect(url.origin, 'configuration', request.url, returnPath);

  const oauthError = url.searchParams.get('error');
  if (oauthError) return errorRedirect(url.origin, oauthError === 'access_denied' ? 'cancelled' : 'discord_authorization', request.url, returnPath);

  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const storedState = cookies[OAUTH_STATE_COOKIE];
  if (!code || !returnedState || !storedState || returnedState !== storedState) {
    return errorRedirect(url.origin, 'invalid_state', request.url, returnPath);
  }

  const config = authConfig(env);
  const redirectUri = discordRedirectUri(request, env);
  const tokenBody = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  });

  let token;
  try {
    const tokenResponse = await discordFetch(`${API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody
    });
    if (!tokenResponse.ok) return errorRedirect(url.origin, 'token_exchange', request.url, returnPath);
    token = await tokenResponse.json();
  } catch {
    return errorRedirect(url.origin, 'discord_unavailable', request.url, returnPath);
  }

  if (!token?.access_token) return errorRedirect(url.origin, 'token_exchange', request.url, returnPath);
  const authHeaders = { Authorization: `${token.token_type || 'Bearer'} ${token.access_token}` };

  let user;
  let isMember = false;
  let auditStaff = false;
  let guildRoles = [];
  try {
    const [userResponse, memberResponse] = await Promise.all([
      discordFetch(`${API}/users/@me`, { headers: authHeaders }),
      discordFetch(`${API}/users/@me/guilds/${encodeURIComponent(config.guildId)}/member`, { headers: authHeaders })
    ]);

    if (!userResponse.ok) return errorRedirect(url.origin, 'profile_read', request.url, returnPath);
    user = await userResponse.json();

    if (memberResponse.ok) {
      isMember = true;
      const guildMember = await memberResponse.json();
      const roles = filterRelevantDiscordRoles(env, guildMember?.roles);
      guildRoles = roles;
      auditStaff = roles.includes(String(config.staffAuditRoleId));
    } else if (memberResponse.status === 404) {
      isMember = false;
    } else {
      return errorRedirect(url.origin, 'membership_check', request.url, returnPath);
    }
  } catch {
    return errorRedirect(url.origin, 'discord_unavailable', request.url, returnPath);
  }

  if (!user?.id || !user?.username) return errorRedirect(url.origin, 'profile_read', request.url, returnPath);

  const previousSession = await sessionFromRequest(request, env);
  const startedAt = isMember
    ? (previousSession?.sub === user.id && previousSession?.startedAt ? previousSession.startedAt : new Date().toISOString())
    : null;

  const sessionToken = await createSessionToken({
    id: user.id,
    username: user.username,
    displayName: user.global_name || user.username,
    avatar: user.avatar || null,
    member: isMember,
    auditStaff,
    roles: guildRoles,
    roleCheckedAt: isMember ? new Date().toISOString() : null,
    startedAt,
    oauth: {
      accessToken: String(token.access_token),
      refreshToken: String(token.refresh_token || ''),
      tokenType: String(token.token_type || 'Bearer'),
      scope: String(token.scope || ''),
      expiresAt: Date.now() + Math.max(60, Number(token.expires_in) || 604800) * 1000
    }
  }, env.SESSION_SECRET);

  const sessionCookie = cookieString(SESSION_COOKIE, sessionToken, request.url, { maxAge: SESSION_TTL_SECONDS });
  const cleanup = [
    sessionCookie,
    clearCookie(OAUTH_STATE_COOKIE, request.url),
    clearCookie(OAUTH_RETURN_COOKIE, request.url)
  ];

  if (!isMember) {
    const safe = safeReturnPath(returnPath);
    const directReturn = safe.startsWith('/perfil') || safe.startsWith('/foro');
    const target = new URL(directReturn ? safe : accessPathFromReturn(safe), url.origin);
    target.searchParams.set(directReturn ? 'oauth_error' : 'reason', 'server-required');
    return redirectWithCookies(target.toString(), request.url, cleanup);
  }

  return redirectWithCookies(new URL(returnPath, url.origin).toString(), request.url, cleanup);
}

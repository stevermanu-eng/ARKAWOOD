import { knownRoleIds } from './arkawoodRoles.js';
const encoder = new TextEncoder();

export const DEFAULT_DISCORD_CLIENT_ID = '1532912146604621924';
export const DEFAULT_DISCORD_GUILD_ID = '1526622720123736295';
export const DEFAULT_STAFF_AUDIT_ROLE_ID = '1531538149967396964';
export const SESSION_COOKIE = 'arka_session';
export const OAUTH_STATE_COOKIE = 'arka_oauth_state';
export const OAUTH_RETURN_COOKIE = 'arka_oauth_return';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const MEMBER_CHECK_FRESH_MS = 30 * 60 * 1000;
export const AUDIT_ROLE_CHECK_FRESH_MS = 10 * 60 * 1000;
export const MIN_SESSION_SECRET_BYTES = 32;
const DISCORD_API = 'https://discord.com/api/v10';
const DISCORD_LIVE_TIMEOUT_MS = 6000;
const OAUTH_REFRESH_SKEW_MS = 90 * 1000;

export function parseCookies(header = '') {
  const out = Object.create(null);
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) continue;
    try { out[key] = decodeURIComponent(value); } catch { out[key] = value; }
  }
  return out;
}

export function cookieString(name, value, requestUrl, options = {}) {
  const url = new URL(requestUrl);
  const sameSite = ['Lax', 'Strict', 'None'].includes(options.sameSite) ? options.sameSite : 'Lax';
  const path = typeof options.path === 'string' && options.path.startsWith('/') ? options.path : '/';
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  if (options.httpOnly !== false) parts.push('HttpOnly');
  parts.push(`SameSite=${sameSite}`);
  if (url.protocol === 'https:' || options.secure === true) parts.push('Secure');
  return parts.join('; ');
}

export function clearCookie(name, requestUrl) {
  return cookieString(name, '', requestUrl, { maxAge: 0 });
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encodeJson(value) {
  return bytesToBase64Url(encoder.encode(JSON.stringify(value)));
}

async function privateKey(secret) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`arkawood:discord-oauth:${secret}`));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function sealPrivate(value, secret) {
  if (!value || !sessionSecretValid(secret)) return null;
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const key = await privateKey(secret);
  const clear = encoder.encode(JSON.stringify(value));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, clear));
  return `${bytesToBase64Url(iv)}.${bytesToBase64Url(encrypted)}`;
}

async function openPrivate(value, secret) {
  if (!value || !sessionSecretValid(secret)) return null;
  try {
    const [ivPart, dataPart, extra] = String(value).split('.');
    if (!ivPart || !dataPart || extra) return null;
    const key = await privateKey(secret);
    const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64UrlToBytes(ivPart) }, key, base64UrlToBytes(dataPart));
    return JSON.parse(new TextDecoder().decode(clear));
  } catch {
    return null;
  }
}

function decodeJson(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function sessionSecretValid(secret) {
  return typeof secret === 'string' && encoder.encode(secret).byteLength >= MIN_SESSION_SECRET_BYTES;
}

export async function createSessionToken(session, secret) {
  if (!sessionSecretValid(secret)) throw new Error(`SESSION_SECRET must be at least ${MIN_SESSION_SECRET_BYTES} bytes`);
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    v: 1,
    sub: String(session.id),
    username: String(session.username || ''),
    displayName: String(session.displayName || session.username || ''),
    avatar: session.avatar || null,
    member: Boolean(session.member),
    auditStaff: Boolean(session.auditStaff),
    roles: Array.isArray(session.roles) ? session.roles.map(String).slice(0, 256) : [],
    roleCheckedAt: session.roleCheckedAt || null,
    startedAt: session.startedAt || null,
    csrf: typeof session.csrf === 'string' && session.csrf.length >= 24 ? session.csrf : randomState(),
    oauth: session.oauth ? await sealPrivate(session.oauth, secret) : null,
    iat: now,
    exp: now + SESSION_TTL_SECONDS
  };
  const encoded = encodeJson(payload);
  const signature = bytesToBase64Url(await hmac(secret, encoded));
  return `${encoded}.${signature}`;
}

export async function verifySessionToken(token, secret) {
  if (!token || !sessionSecretValid(secret)) return null;
  const [payload, signature, extra] = String(token).split('.');
  if (!payload || !signature || extra || payload.length > 4096 || signature.length > 128) return null;

  let expected;
  try { expected = bytesToBase64Url(await hmac(secret, payload)); }
  catch { return null; }
  if (!constantTimeEqual(signature, expected)) return null;

  try {
    const decoded = decodeJson(payload);
    const now = Math.floor(Date.now() / 1000);
    if (decoded?.v !== 1 || !decoded?.sub || !decoded?.exp || decoded.exp <= now) return null;
    if (!Number.isFinite(Number(decoded.iat)) || Number(decoded.iat) > now + 60) return null;
    if (Number(decoded.exp) - Number(decoded.iat) > SESSION_TTL_SECONDS + 60) return null;
    decoded.oauth = decoded.oauth ? await openPrivate(decoded.oauth, secret) : null;
    return decoded;
  } catch {
    return null;
  }
}

export async function sessionFromRequest(request, env) {
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  return verifySessionToken(cookies[SESSION_COOKIE], env?.SESSION_SECRET);
}

export function sessionCheckFresh(session, maxAgeMs = MEMBER_CHECK_FRESH_MS) {
  if (!session?.roleCheckedAt) return false;
  const checkedAt = Date.parse(session.roleCheckedAt);
  if (!Number.isFinite(checkedAt)) return false;
  const age = Date.now() - checkedAt;
  return age >= 0 && age <= maxAgeMs;
}

export function randomState() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export function safeReturnPath(value, fallback = '/postulacion-moderacion.html') {
  if (!value || typeof value !== 'string') return fallback;
  if (value.length > 2048 || /[\u0000-\u001F\u007F]/.test(value)) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  try {
    const url = new URL(value, 'https://arka.invalid');
    if (url.origin !== 'https://arka.invalid') return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function isSameOriginRequest(request) {
  const target = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && origin !== target.origin) return false;

  const fetchSite = (request.headers.get('Sec-Fetch-Site') || '').toLowerCase();
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return false;
  return true;
}

export function csrfTokenValid(request, session) {
  const expected = typeof session?.csrf === 'string' ? session.csrf : '';
  const supplied = request.headers.get('X-CSRF-Token') || '';
  if (expected.length < 24 || supplied.length < 24 || supplied.length > 256) return false;
  return constantTimeEqual(expected, supplied);
}

export function discordRedirectUri(request, env) {
  if (env.DISCORD_REDIRECT_URI) return env.DISCORD_REDIRECT_URI;
  return `${new URL(request.url).origin}/api/auth/callback`;
}

export function filterRelevantDiscordRoles(env, roleIds) {
  const allowed = knownRoleIds();
  const config = authConfig(env || {});
  if (config.staffAuditRoleId) allowed.add(String(config.staffAuditRoleId));
  const custom = String(env?.DISCORD_ROLE_RANKS || '').trim();
  if (custom) {
    try {
      const parsed = JSON.parse(custom);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const id of Object.keys(parsed)) allowed.add(String(id));
      }
    } catch {
      for (const entry of custom.split(',')) {
        const id = String(entry.split('=')[0] || '').trim();
        if (id) allowed.add(id);
      }
    }
  }
  return [...new Set((Array.isArray(roleIds) ? roleIds : []).map(String).filter((id) => allowed.has(id)))].slice(0, 128);
}

export function authConfig(env) {
  return {
    clientId: env.DISCORD_CLIENT_ID || DEFAULT_DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET || '',
    guildId: env.DISCORD_GUILD_ID || DEFAULT_DISCORD_GUILD_ID,
    staffAuditRoleId: env.DISCORD_STAFF_AUDIT_ROLE_ID || DEFAULT_STAFF_AUDIT_ROLE_ID,
    sessionSecret: env.SESSION_SECRET || ''
  };
}

export function requiredAuthConfig(env) {
  const config = authConfig(env);
  return Boolean(config.clientId && config.clientSecret && config.guildId && sessionSecretValid(config.sessionSecret));
}




const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function discordUserFetch(url, accessToken) {
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('discord_oauth_timeout'), DISCORD_LIVE_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal
      });
      if (attempt === 0 && response.status === 429) {
        const header = Number(response.headers.get('Retry-After') || 0);
        let bodyDelay = 0;
        try { bodyDelay = Number((await response.clone().json())?.retry_after || 0); } catch {}
        const delayMs = Math.min(4000, Math.max(450, Math.ceil(Math.max(header, bodyDelay) * 1000)));
        await wait(delayMs);
        continue;
      }
      if (attempt === 0 && response.status >= 500) {
        await wait(350);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await wait(350);
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error('discord_oauth_unavailable');
}

async function refreshDiscordOAuthToken(env, oauth) {
  const refreshToken = String(oauth?.refreshToken || '').trim();
  const config = authConfig(env || {});
  if (!refreshToken || !config.clientId || !config.clientSecret) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('discord_oauth_refresh_timeout'), DISCORD_LIVE_TIMEOUT_MS);
  try {
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });
    const response = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal
    });
    if (!response.ok) return null;
    const token = await response.json();
    if (!token?.access_token) return null;
    return {
      accessToken: String(token.access_token),
      refreshToken: String(token.refresh_token || refreshToken),
      tokenType: String(token.token_type || 'Bearer'),
      scope: String(token.scope || oauth?.scope || ''),
      expiresAt: Date.now() + Math.max(60, Number(token.expires_in) || 604800) * 1000
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Refreshes Discord identity/roles with the user's own OAuth grant. This requires
 * no bot in the guild. When allowTokenRefresh=true it can rotate an expired OAuth
 * access token and should be followed by re-issuing the signed session cookie.
 */
export async function oauthDiscordSession(env, session, { allowTokenRefresh = false } = {}) {
  if (!session?.sub || !session?.oauth?.accessToken) return { session, oauthChanged: false, live: false };
  const config = authConfig(env || {});
  if (!config.guildId) return { session, oauthChanged: false, live: false };

  let oauth = { ...session.oauth };
  let oauthChanged = false;
  const expiresAt = Number(oauth.expiresAt || 0);
  if (expiresAt && Date.now() >= expiresAt - OAUTH_REFRESH_SKEW_MS) {
    if (!allowTokenRefresh) return { session, oauthChanged: false, live: false };
    const refreshed = await refreshDiscordOAuthToken(env, oauth);
    if (!refreshed) return { session, oauthChanged: false, live: false, reauthRequired: true };
    oauth = refreshed;
    oauthChanged = true;
  }

  try {
    // Guild membership/roles are authoritative. Identity refresh is best-effort:
    // a temporary /users/@me failure must never discard a valid member response.
    const [memberResult, userResult] = await Promise.allSettled([
      discordUserFetch(`${DISCORD_API}/users/@me/guilds/${encodeURIComponent(config.guildId)}/member`, oauth.accessToken),
      discordUserFetch(`${DISCORD_API}/users/@me`, oauth.accessToken)
    ]);
    const memberResponse = memberResult.status === 'fulfilled' ? memberResult.value : null;
    const userResponse = userResult.status === 'fulfilled' ? userResult.value : null;

    if (memberResponse?.ok) {
      const member = await memberResponse.json();
      let user = member?.user || null;
      if (userResponse?.ok) {
        try { user = await userResponse.json(); } catch {}
      }
      const roles = filterRelevantDiscordRoles(env, member?.roles);
      return {
        session: {
          ...session,
          username: user?.username || session.username,
          displayName: member?.nick || user?.global_name || user?.username || session.displayName || session.username,
          avatar: user?.avatar ?? session.avatar ?? null,
          member: true,
          roles,
          auditStaff: roles.includes(String(config.staffAuditRoleId)),
          roleCheckedAt: new Date().toISOString(),
          oauth
        },
        oauthChanged,
        live: true
      };
    }

    if (memberResponse?.status === 404) {
      let user = null;
      if (userResponse?.ok) {
        try { user = await userResponse.json(); } catch {}
      }
      return {
        session: {
          ...session,
          username: user?.username || session.username,
          displayName: user?.global_name || user?.username || session.displayName || session.username,
          avatar: user?.avatar ?? session.avatar ?? null,
          member: false,
          roles: [],
          auditStaff: false,
          roleCheckedAt: new Date().toISOString(),
          oauth
        },
        oauthChanged,
        live: true
      };
    }

    const memberStatus = Number(memberResponse?.status || 0);
    const userStatus = Number(userResponse?.status || 0);
    if (allowTokenRefresh && !oauthChanged && (memberStatus === 401 || userStatus === 401)) {
      const refreshed = await refreshDiscordOAuthToken(env, oauth);
      if (refreshed) {
        const retry = await oauthDiscordSession(env, { ...session, oauth: refreshed }, { allowTokenRefresh: false });
        return { ...retry, oauthChanged: true };
      }
      return { session, oauthChanged: false, live: false, reauthRequired: true, memberStatus, userStatus };
    }

    return {
      session: oauthChanged ? { ...session, oauth } : session,
      oauthChanged,
      live: false,
      reauthRequired: memberStatus === 401 || memberStatus === 403,
      memberStatus,
      userStatus
    };
  } catch {
    return { session: oauthChanged ? { ...session, oauth } : session, oauthChanged, live: false };
  }
}

async function discordBotFetch(url, botToken) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('discord_live_timeout'), DISCORD_LIVE_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { Authorization: `Bot ${botToken}` },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Best-effort live Discord refresh. When DISCORD_BOT_TOKEN exists as a Cloudflare
 * secret, every session/profile read can reflect username, avatar and guild roles
 * without forcing the user through OAuth again. Without the secret, the signed
 * OAuth session remains the safe fallback.
 */
export async function liveDiscordSession(env, session) {
  if (!session?.sub) return session;

  // Prefer the user's OAuth grant. This lets the forum verify current roles
  // without requiring a bot to be present in the Discord server.
  const oauthResult = await oauthDiscordSession(env, session, { allowTokenRefresh: false });
  if (oauthResult.live) return oauthResult.session;

  const botToken = String(env?.DISCORD_BOT_TOKEN || '').trim();
  if (!botToken) return session;
  const config = authConfig(env || {});
  if (!config.guildId) return session;

  try {
    const response = await discordBotFetch(
      `${DISCORD_API}/guilds/${encodeURIComponent(config.guildId)}/members/${encodeURIComponent(session.sub)}`,
      botToken
    );
    if (response.status === 404) {
      return {
        ...session,
        member: false,
        roles: [],
        auditStaff: false,
        roleCheckedAt: new Date().toISOString()
      };
    }
    if (!response.ok) return session;
    const member = await response.json();
    const user = member?.user || {};
    const roles = filterRelevantDiscordRoles(env, member?.roles);
    return {
      ...session,
      username: user.username || session.username,
      displayName: member?.nick || user.global_name || user.username || session.displayName || session.username,
      avatar: user.avatar ?? session.avatar ?? null,
      member: true,
      roles,
      auditStaff: roles.includes(String(config.staffAuditRoleId)),
      roleCheckedAt: new Date().toISOString()
    };
  } catch {
    return session;
  }
}

export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json; charset=utf-8');
  if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(data), { ...init, headers });
}

const encoder = new TextEncoder();

export const DEFAULT_DISCORD_CLIENT_ID = '1532912146604621924';
export const DEFAULT_DISCORD_GUILD_ID = '1526622720123736295';
export const SESSION_COOKIE = 'arka_session';
export const OAUTH_STATE_COOKIE = 'arka_oauth_state';
export const OAUTH_RETURN_COOKIE = 'arka_oauth_return';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
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
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path || '/'}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  if (options.httpOnly !== false) parts.push('HttpOnly');
  parts.push(`SameSite=${options.sameSite || 'Lax'}`);
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

export async function createSessionToken(session, secret) {
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    v: 1,
    sub: String(session.id),
    username: String(session.username || ''),
    displayName: String(session.displayName || session.username || ''),
    avatar: session.avatar || null,
    member: Boolean(session.member),
    startedAt: session.startedAt || null,
    iat: now,
    exp: now + SESSION_TTL_SECONDS
  };
  const encoded = encodeJson(payload);
  const signature = bytesToBase64Url(await hmac(secret, encoded));
  return `${encoded}.${signature}`;
}

export async function verifySessionToken(token, secret) {
  if (!token || !secret) return null;
  const [payload, signature, extra] = String(token).split('.');
  if (!payload || !signature || extra) return null;
  const expected = bytesToBase64Url(await hmac(secret, payload));
  if (!constantTimeEqual(signature, expected)) return null;
  try {
    const decoded = decodeJson(payload);
    const now = Math.floor(Date.now() / 1000);
    if (decoded?.v !== 1 || !decoded?.sub || !decoded?.exp || decoded.exp <= now) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function sessionFromRequest(request, env) {
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  return verifySessionToken(cookies[SESSION_COOKIE], env.SESSION_SECRET);
}

export function randomState() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export function safeReturnPath(value, fallback = '/postulacion-moderacion.html') {
  if (!value || typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  try {
    const url = new URL(value, 'https://arka.invalid');
    if (url.origin !== 'https://arka.invalid') return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function discordRedirectUri(request, env) {
  if (env.DISCORD_REDIRECT_URI) return env.DISCORD_REDIRECT_URI;
  return `${new URL(request.url).origin}/api/auth/callback`;
}


export function authConfig(env) {
  return {
    clientId: env.DISCORD_CLIENT_ID || DEFAULT_DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET || '',
    guildId: env.DISCORD_GUILD_ID || DEFAULT_DISCORD_GUILD_ID,
    sessionSecret: env.SESSION_SECRET || ''
  };
}
export function requiredAuthConfig(env) {
  const config = authConfig(env);
  return Boolean(config.clientId && config.clientSecret && config.guildId && config.sessionSecret);
}


export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(data), { ...init, headers });
}

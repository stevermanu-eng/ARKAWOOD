import {
  OAUTH_RETURN_COOKIE,
  authConfig,
  OAUTH_STATE_COOKIE,
  cookieString,
  discordRedirectUri,
  randomState,
  requiredAuthConfig,
  safeReturnPath
} from '../../_lib/auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const current = new URL(request.url);

  if (!requiredAuthConfig(env)) {
    return Response.redirect(new URL('/acceso-moderacion.html?error=configuration', current.origin).toString(), 302);
  }

  const config = authConfig(env);
  const state = randomState();
  const returnPath = safeReturnPath(current.searchParams.get('return'));
  const redirectUri = discordRedirectUri(request, env);
  const authorize = new URL('https://discord.com/oauth2/authorize');
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('client_id', config.clientId);
  authorize.searchParams.set('scope', 'identify guilds.members.read');
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('redirect_uri', redirectUri);

  const headers = new Headers({ Location: authorize.toString(), 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', cookieString(OAUTH_STATE_COOKIE, state, request.url, { maxAge: 600 }));
  headers.append('Set-Cookie', cookieString(OAUTH_RETURN_COOKIE, returnPath, request.url, { maxAge: 600 }));
  return new Response(null, { status: 302, headers });
}

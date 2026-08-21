import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  cookieString,
  createSessionToken,
  csrfTokenValid,
  isSameOriginRequest,
  json,
  liveDiscordSession,
  oauthDiscordSession,
  sessionFromRequest
} from '../../_lib/auth.js';
import { ensureProfile, prepareCommunityDb, profilePermissions } from '../../_lib/communityStore.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const stored = await sessionFromRequest(request, env);
  if (!stored?.sub) return json({ ok:false, error:'login_required' }, { status:401 });
  if (!isSameOriginRequest(request) || !csrfTokenValid(request, stored)) return json({ ok:false, error:'csrf' }, { status:403 });

  const scopes = String(stored.oauth?.scope || '').split(/\s+/).filter(Boolean);
  if (!stored.oauth?.accessToken || !scopes.includes('guilds.members.read')) {
    return json({
      ok:false,
      error:'oauth_reconnect_required',
      reconnect:`/api/auth/discord?return=${encodeURIComponent('/perfil/editar')}`
    }, { status:409 });
  }

  // oauthDiscordSession already performs bounded retry handling for Discord
  // 429/5xx/network failures. Do not repeat the whole OAuth round a second time;
  // that was the main cause of very long sync waits after Discord hiccups.
  const result = await oauthDiscordSession(env, stored, { allowTokenRefresh:true });
  let session = result.session || stored;
  let source = result.live ? 'oauth' : '';

  if (!result.live && String(env?.DISCORD_BOT_TOKEN || '').trim()) {
    const botResult = await liveDiscordSession(env, { ...session, oauth:null });
    if (botResult?.roleCheckedAt && botResult.roleCheckedAt !== session.roleCheckedAt) {
      session = { ...botResult, oauth:session.oauth };
      source = 'bot';
    }
  }

  if (!source) {
    if (result?.reauthRequired) {
      return json({
        ok:false,
        error:'oauth_reconnect_required',
        reconnect:`/api/auth/discord?return=${encodeURIComponent('/perfil/editar')}`
      }, { status:409 });
    }
    return json({ ok:false, error:'discord_temporarily_unavailable', retryable:true }, { status:503 });
  }
  if (!session.member) return json({ ok:false, error:'guild_membership_required', member:false }, { status:403 });

  // Persist the new identity/complete relevant role set once. Avoid fetching
  // profile posts/stats here; the editor can refresh those locally afterwards.
  if (await prepareCommunityDb(env)) await ensureProfile(env, session);

  const renewed = await createSessionToken({
    ...session,
    id:session.sub,
    csrf:stored.csrf,
    startedAt:stored.startedAt
  }, env.SESSION_SECRET);
  const headers = new Headers();
  headers.append('Set-Cookie', cookieString(SESSION_COOKIE, renewed, request.url, { maxAge:SESSION_TTL_SECONDS }));

  return json({
    ok:true,
    member:true,
    source,
    checkedAt:session.roleCheckedAt || new Date().toISOString(),
    permissions:profilePermissions(env, session)
  }, { headers });
}

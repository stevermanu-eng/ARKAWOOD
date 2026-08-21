import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  cookieString,
  createSessionToken,
  json,
  liveDiscordSession,
  oauthDiscordSession,
  sessionFromRequest
} from '../../_lib/auth.js';
import {
  ensureProfile,
  findProfile,
  prepareCommunityDb,
  profilePermissions,
  publicProfile,
  profileStats,
  roleBadgesForSession
} from '../../_lib/communityStore.js';

function sessionIsNewerThanProfile(session, profile) {
  const sessionTime = Date.parse(String(session?.roleCheckedAt || ''));
  const profileTime = Date.parse(String(profile?.roles_synced_at || ''));
  return Number.isFinite(sessionTime) && (!Number.isFinite(profileTime) || sessionTime > profileTime + 500);
}

export async function onRequestGet(context) {
  const storedSession = await sessionFromRequest(context.request, context.env);
  if (!storedSession) return json({ authenticated: false, member: false, user: null });

  const url = new URL(context.request.url);
  const liveRequested = url.searchParams.get('live') === '1';
  let session = storedSession;
  let oauthLive = false;

  // Live role synchronization is opt-in. The forum requests it on page entry;
  // other pages use the signed session immediately, avoiding duplicate Discord
  // calls and cookie races with the explicit Sync button in profile editing.
  if (liveRequested) {
    try {
      const refreshed = await oauthDiscordSession(context.env, storedSession, { allowTokenRefresh: true });
      if (refreshed.live) {
        session = refreshed.session;
        oauthLive = true;
      } else if (String(context.env?.DISCORD_BOT_TOKEN || '').trim()) {
        session = await liveDiscordSession(context.env, { ...refreshed.session, oauth: null });
      }
    } catch { session = storedSession; }
  }

  let siteProfile = null;
  try {
    if (await prepareCommunityDb(context.env)) {
      let profile = await findProfile(context.env, session.sub);
      if (!profile || sessionIsNewerThanProfile(session, profile)) profile = await ensureProfile(context.env, session);
      siteProfile = profile ? publicProfile(profile, await profileStats(context.env, session.sub), []) : null;
    }
  } catch { siteProfile = null; }

  const permissions = profilePermissions(context.env, session);
  const headers = new Headers();
  if (oauthLive) {
    try {
      const renewed = await createSessionToken({
        ...session,
        id: session.sub,
        csrf: storedSession.csrf,
        startedAt: storedSession.startedAt
      }, context.env.SESSION_SECRET);
      headers.append('Set-Cookie', cookieString(SESSION_COOKIE, renewed, context.request.url, { maxAge: SESSION_TTL_SECONDS }));
    } catch {}
  }

  return json({
    authenticated: true,
    member: Boolean(session.member),
    staffAuditAccess: Boolean(session.auditStaff),
    csrfToken: storedSession.csrf || null,
    roleSync: {
      live: oauthLive,
      checkedAt: session.roleCheckedAt || null,
      requiresReconnect: !Boolean(storedSession.oauth?.accessToken) || !String(storedSession.oauth?.scope || '').split(/\s+/).includes('guilds.members.read')
    },
    permissions,
    user: {
      id: session.sub,
      username: session.username,
      displayName: session.displayName,
      avatar: session.avatar,
      startedAt: storedSession.startedAt,
      rank: siteProfile?.rank || null,
      roles: siteProfile?.roles || roleBadgesForSession(context.env, session),
      profilePhoto: siteProfile?.profilePhoto || ''
    }
  }, { headers });
}

import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  cookieString,
  createSessionToken,
  csrfTokenValid,
  isSameOriginRequest,
  json,
  oauthDiscordSession,
  sessionFromRequest
} from '../../_lib/auth.js';
import {
  availableProfileRoles,
  cleanText,
  prepareCommunityDb,
  ensureProfile,
  findProfile,
  listProfilePosts,
  normalizeSocialUrl,
  profilePermissions,
  profileStats,
  publicProfile,
  selectVisibleProfileRoles,
  validBirthDate,
  validImageData,
  validMinecraftUsername
} from '../../_lib/communityStore.js';
import { readJsonBody } from '../../_lib/requestBody.js';

function unauthenticated() {
  return json({ ok: false, error: 'login_required', login: '/api/auth/discord?return=%2Fperfil%2F' }, { status: 401 });
}

function sessionIsNewerThanProfile(session, profile) {
  const sessionTime = Date.parse(String(session?.roleCheckedAt || ''));
  const profileTime = Date.parse(String(profile?.roles_synced_at || ''));
  return Number.isFinite(sessionTime) && (!Number.isFinite(profileTime) || sessionTime > profileTime + 500);
}

async function currentProfile(env, session) {
  let profile = await findProfile(env, session.sub);
  // Fast path: profile reads no longer make an external Discord request. If the
  // signed session contains newer roles (for example after OAuth/sync), mirror
  // them into D1 locally; otherwise use the existing row as-is.
  if (!profile || sessionIsNewerThanProfile(session, profile)) profile = await ensureProfile(env, session);
  const [stats, posts] = await Promise.all([
    profileStats(env, session.sub),
    listProfilePosts(env, session.sub)
  ]);
  const output = publicProfile(profile, stats, posts);
  output.availableRoles = availableProfileRoles(profile);
  return { rawProfile: profile, profile: output };
}

export async function onRequestGet(context) {
  const storedSession = await sessionFromRequest(context.request, context.env);
  if (!storedSession?.sub) return unauthenticated();
  if (!await prepareCommunityDb(context.env)) return json({ ok: false, error: 'community_db_not_configured' }, { status: 503 });

  const result = await currentProfile(context.env, storedSession);
  return json({
    ok: true,
    profile: result.profile,
    permissions: profilePermissions(context.env, storedSession),
    csrfToken: storedSession.csrf || null
  });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const storedSession = await sessionFromRequest(request, env);
  if (!storedSession?.sub) return unauthenticated();
  if (!isSameOriginRequest(request) || !csrfTokenValid(request, storedSession)) return json({ ok: false, error: 'csrf' }, { status: 403 });
  const db = await prepareCommunityDb(env);
  if (!db) return json({ ok: false, error: 'community_db_not_configured' }, { status: 503 });

  const parsed = await readJsonBody(request, { maxBytes: 3_100_000 });
  if (!parsed.ok) return json({ ok:false, error:parsed.error }, { status:parsed.status });
  const payload = parsed.value;
  const minecraftUsername = cleanText(payload?.minecraftUsername, 16);
  const rawBio = String(payload?.bio ?? '').replace(/\r\n?/g, '\n').trim();
  if (rawBio.length > 700) return json({ ok:false, error:'bio_too_long', maxLength:700 }, { status:400 });
  const bio = cleanText(rawBio, 700);
  const birthDate = cleanText(payload?.birthDate, 10);
  const hasProfilePhoto = Object.prototype.hasOwnProperty.call(payload || {}, 'profilePhoto');
  const hasBanner = Object.prototype.hasOwnProperty.call(payload || {}, 'banner');
  const profilePhoto = hasProfilePhoto ? String(payload?.profilePhoto || '') : '';
  const banner = hasBanner ? String(payload?.banner || '') : '';
  const visibleRoleIds = Array.isArray(payload?.visibleRoleIds) ? payload.visibleRoleIds.map(String).filter(Boolean) : null;
  const hasSocialLinks = Boolean(payload?.socialLinks && typeof payload.socialLinks === 'object' && !Array.isArray(payload.socialLinks));
  const socialLinks = hasSocialLinks ? {
    instagram: normalizeSocialUrl('instagram', payload.socialLinks.instagram),
    facebook: normalizeSocialUrl('facebook', payload.socialLinks.facebook),
    youtube: normalizeSocialUrl('youtube', payload.socialLinks.youtube),
    twitter: normalizeSocialUrl('twitter', payload.socialLinks.twitter)
  } : null;

  if (!validMinecraftUsername(minecraftUsername)) return json({ ok: false, error: 'invalid_minecraft_username' }, { status: 400 });
  if (!validBirthDate(birthDate)) return json({ ok: false, error: 'invalid_birth_date' }, { status: 400 });
  if (hasProfilePhoto && !validImageData(profilePhoto, 900000)) return json({ ok: false, error: 'invalid_profile_photo' }, { status: 400 });
  if (hasBanner && !validImageData(banner, 1800000)) return json({ ok: false, error: 'invalid_banner' }, { status: 400 });
  if (hasSocialLinks) {
    for (const [platform, value] of Object.entries(socialLinks)) {
      if (value === null) return json({ ok: false, error: 'invalid_social_link', platform }, { status: 400 });
    }
  }

  let current = await findProfile(env, storedSession.sub);
  if (!current) current = await ensureProfile(env, storedSession);
  let effectiveSession = storedSession;
  let responseHeaders = new Headers();

  // Banner/social changes are privilege-sensitive. Verify those roles live,
  // while ordinary text/rank saves remain local and fast.
  const bannerChanged = hasBanner && banner !== String(current?.banner || '');
  const socialChanged = hasSocialLinks && (
    String(socialLinks.instagram || '') !== String(current?.social_instagram || '') ||
    String(socialLinks.facebook || '') !== String(current?.social_facebook || '') ||
    String(socialLinks.youtube || '') !== String(current?.social_youtube || '') ||
    String(socialLinks.twitter || '') !== String(current?.social_twitter || '')
  );
  const premiumFeatureChanged = bannerChanged || socialChanged;
  if (premiumFeatureChanged) {
    const live = await oauthDiscordSession(env, storedSession, { allowTokenRefresh: true });
    if (!live.live) {
      if (live.reauthRequired) {
        return json({ ok:false, error:'oauth_reconnect_required', reconnect:`/api/auth/discord?return=${encodeURIComponent('/perfil/editar')}` }, { status:409 });
      }
      return json({ ok:false, error:'discord_verification_unavailable', retryable:true }, { status:503 });
    }
    effectiveSession = live.session;
    current = await ensureProfile(env, effectiveSession);
    try {
      const renewed = await createSessionToken({
        ...effectiveSession,
        id: effectiveSession.sub,
        csrf: storedSession.csrf,
        startedAt: storedSession.startedAt
      }, env.SESSION_SECRET);
      responseHeaders.append('Set-Cookie', cookieString(SESSION_COOKIE, renewed, request.url, { maxAge: SESSION_TTL_SECONDS }));
    } catch {}
  }

  const permissions = profilePermissions(env, effectiveSession);
  if (bannerChanged && !permissions.bannerUpload) {
    return json({ ok: false, error: 'banner_permission_required' }, { status: 403, headers: responseHeaders });
  }
  if (socialChanged && !permissions.socialLinks) {
    return json({ ok: false, error: 'social_links_permission_required' }, { status: 403, headers: responseHeaders });
  }

  const selectedRoles = visibleRoleIds === null ? null : selectVisibleProfileRoles(current, visibleRoleIds);
  if (visibleRoleIds !== null && !selectedRoles) {
    return json({
      ok: false,
      error: 'invalid_visible_roles',
      resolution: 'sync_discord'
    }, { status: 409, headers: responseHeaders });
  }

  // Large image fields are only written when they actually changed. This keeps
  // normal profile saves lightweight instead of resending megabytes of Base64.
  await db.prepare(`
    UPDATE user_profiles
    SET minecraft_username = ?,
        profile_photo = CASE WHEN ? = 1 THEN ? ELSE profile_photo END,
        banner = CASE WHEN ? = 1 THEN ? ELSE banner END,
        social_instagram = CASE WHEN ? = 1 THEN ? ELSE social_instagram END,
        social_facebook = CASE WHEN ? = 1 THEN ? ELSE social_facebook END,
        social_youtube = CASE WHEN ? = 1 THEN ? ELSE social_youtube END,
        social_twitter = CASE WHEN ? = 1 THEN ? ELSE social_twitter END,
        bio = ?, birth_date = ?,
        visible_roles = COALESCE(?, visible_roles),
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE discord_user_id = ?
  `).bind(
    minecraftUsername || null,
    hasProfilePhoto ? 1 : 0,
    hasProfilePhoto ? (profilePhoto || null) : null,
    hasBanner ? 1 : 0,
    hasBanner ? (banner || null) : null,
    hasSocialLinks ? 1 : 0,
    hasSocialLinks ? (socialLinks.instagram || null) : null,
    hasSocialLinks ? 1 : 0,
    hasSocialLinks ? (socialLinks.facebook || null) : null,
    hasSocialLinks ? 1 : 0,
    hasSocialLinks ? (socialLinks.youtube || null) : null,
    hasSocialLinks ? 1 : 0,
    hasSocialLinks ? (socialLinks.twitter || null) : null,
    bio,
    birthDate || null,
    selectedRoles ? JSON.stringify(selectedRoles) : null,
    String(effectiveSession.sub)
  ).run();

  return json({
    ok: true,
    permissions,
    visibleRoles: selectedRoles || undefined,
    mediaChanged: { profilePhoto: hasProfilePhoto, banner: hasBanner },
    socialLinksChanged: Boolean(socialChanged)
  }, { headers: responseHeaders });
}

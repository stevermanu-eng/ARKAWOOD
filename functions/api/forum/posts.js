import { csrfTokenValid, isSameOriginRequest, json, liveDiscordSession, sessionFromRequest } from '../../_lib/auth.js';
import {
  canCreateInCategory,
  cleanText,
  communityDbBindingName,
  createForumNotifications,
  discordAvatarUrl,
  ensureProfile,
  forumExcerpt,
  normalizeForumCategory,
  normalizeForumType,
  normalizeForumTypeForCategory,
  prepareCommunityDb,
  profilePermissions,
  randomPublicId,
  validForumContent
} from '../../_lib/communityStore.js';
import { readJsonBody } from '../../_lib/requestBody.js';

function listOrder(sort) {
  if (sort === 'oldest') return 'p.created_at ASC';
  if (sort === 'replies') return 'reply_count DESC, p.created_at DESC';
  return 'p.created_at DESC';
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const rawCategory = String(url.searchParams.get('category') || '').trim();
  const category = rawCategory ? normalizeForumCategory(rawCategory) : null;
  const allCategories = url.searchParams.get('all') === '1' || !rawCategory;
  if (rawCategory && !category) return json({ ok: false, error: 'invalid_category' }, { status: 400 });

  const db = await prepareCommunityDb(context.env);
  if (!db) return json({ ok: true, configured: false, posts: [], binding: null });

  const rawType = String(url.searchParams.get('type') || '').trim();
  const type = category && rawType
    ? normalizeForumTypeForCategory(category, rawType, true)
    : normalizeForumType(rawType, true);
  if (type === null) return json({ ok: false, error: category ? 'invalid_type_for_category' : 'invalid_type' }, { status: 400 });
  const search = cleanText(url.searchParams.get('search'), 100);
  const sort = String(url.searchParams.get('sort') || 'latest').toLowerCase();
  const pinnedOnly = url.searchParams.get('pinned') === '1';
  const where = [];
  const binds = [];
  if (!allCategories && category) {
    where.push('p.category = ?');
    binds.push(category);
  }
  if (type) {
    where.push('p.post_type = ?');
    binds.push(type);
  }
  if (pinnedOnly) where.push('p.is_pinned = 1');
  if (search) {
    where.push('(p.title LIKE ? ESCAPE \'\\\' OR p.excerpt LIKE ? ESCAPE \'\\\' OR p.content LIKE ? ESCAPE \'\\\')');
    const escaped = search.replace(/[\\%_]/g, '\\$&');
    binds.push(`%${escaped}%`, `%${escaped}%`, `%${escaped}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 60, 1), 80);

  const result = await db.prepare(`
    SELECT p.post_id, p.category, p.discord_user_id,
           COALESCE(up.display_name, p.author_name) AS author_name,
           p.author_avatar, CASE WHEN up.profile_photo IS NOT NULL AND up.profile_photo <> '' THEN 1 ELSE 0 END AS has_profile_photo, up.discord_avatar, up.discord_username, up.user_rank, up.user_roles, up.visible_roles, up.minecraft_username, CASE WHEN up.banner IS NOT NULL AND up.banner <> '' THEN 1 ELSE 0 END AS has_banner,
           p.title, p.excerpt, p.post_type, p.is_pinned, p.is_locked, p.created_at, p.updated_at,
           COUNT(r.reply_id) AS reply_count,
           (SELECT r2.created_at FROM forum_replies r2 WHERE r2.post_id = p.post_id ORDER BY r2.created_at DESC LIMIT 1) AS last_reply_at,
           (SELECT r2.discord_user_id FROM forum_replies r2 WHERE r2.post_id = p.post_id ORDER BY r2.created_at DESC LIMIT 1) AS last_reply_author_id,
           (SELECT COALESCE(up2.display_name, r2.author_name)
              FROM forum_replies r2 LEFT JOIN user_profiles up2 ON up2.discord_user_id = r2.discord_user_id
             WHERE r2.post_id = p.post_id ORDER BY r2.created_at DESC LIMIT 1) AS last_reply_author_name,
           (SELECT r2.author_avatar
              FROM forum_replies r2
             WHERE r2.post_id = p.post_id ORDER BY r2.created_at DESC LIMIT 1) AS last_reply_author_avatar,
           (SELECT CASE WHEN up2.profile_photo IS NOT NULL AND up2.profile_photo <> '' THEN 1 ELSE 0 END
              FROM forum_replies r2 LEFT JOIN user_profiles up2 ON up2.discord_user_id = r2.discord_user_id
             WHERE r2.post_id = p.post_id ORDER BY r2.created_at DESC LIMIT 1) AS last_reply_has_profile_photo
    FROM forum_posts p
    LEFT JOIN forum_replies r ON r.post_id = p.post_id
    LEFT JOIN user_profiles up ON up.discord_user_id = p.discord_user_id
    ${whereSql}
    GROUP BY p.post_id
    ORDER BY p.is_pinned DESC, ${listOrder(sort)}
    LIMIT ${limit}
  `).bind(...binds).all();
  const posts = (result?.results || []).map((post) => ({
    ...post,
    profile_photo: post.has_profile_photo ? `/api/profile/photo/${encodeURIComponent(String(post.discord_user_id))}` : '',
    last_reply_author_avatar: post.last_reply_has_profile_photo && post.last_reply_author_id
      ? `/api/profile/photo/${encodeURIComponent(String(post.last_reply_author_id))}`
      : post.last_reply_author_avatar,
    has_profile_photo: undefined,
    last_reply_has_profile_photo: undefined
  }));
  return json({ ok: true, configured: true, binding: communityDbBindingName(context.env), posts });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const storedSession = await sessionFromRequest(request, env);
  if (!storedSession?.sub) return json({ ok: false, error: 'login_required' }, { status: 401 });
  if (!isSameOriginRequest(request) || !csrfTokenValid(request, storedSession)) return json({ ok: false, error: 'csrf' }, { status: 403 });
  const db = await prepareCommunityDb(env);
  if (!db) return json({ ok: false, error: 'community_db_not_configured' }, { status: 503 });

  const parsed = await readJsonBody(request, { maxBytes: 2_300_000 });
  if (!parsed.ok) return json({ ok:false, error:parsed.error }, { status:parsed.status });
  const payload = parsed.value;
  const category = normalizeForumCategory(payload?.category);
  const postType = normalizeForumTypeForCategory(category, payload?.type || '');
  const title = cleanText(payload?.title, 120);
  const content = String(payload?.content || '').replace(/\r\n?/g, '\n').trim();
  if (!category) return json({ ok: false, error: 'invalid_category' }, { status: 400 });
  const session = await liveDiscordSession(env, storedSession);
  const permissions = profilePermissions(env, session);
  if (!canCreateInCategory(category, permissions)) {
    const membershipOnly = (category === 'modalidades' || category === 'comunidad') && !permissions.forumPublishAll && !permissions.forumPublishCommunity;
    return json({ ok: false, error: membershipOnly ? 'guild_membership_required' : 'forum_role_required' }, { status: 403 });
  }
  if (!postType) return json({ ok: false, error: 'invalid_type_for_category' }, { status: 400 });
  if (title.length < 4) return json({ ok: false, error: 'title_too_short' }, { status: 400 });
  if (content.length < 10) return json({ ok: false, error: 'content_too_short' }, { status: 400 });
  if (!validForumContent(content)) return json({ ok: false, error: 'invalid_forum_content' }, { status: 400 });

  const profile = await ensureProfile(env, session);
  const postId = randomPublicId();
  await db.prepare(`
    INSERT INTO forum_posts (
      post_id, category, discord_user_id, author_name, author_avatar,
      title, content, excerpt, post_type, accent, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'gold', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  `).bind(
    postId,
    category,
    String(session.sub),
    String(profile?.display_name || session.displayName || session.username || 'Usuario'),
    discordAvatarUrl({ id: session.sub, avatar: session.avatar }),
    title,
    content,
    forumExcerpt(content),
    postType
  ).run();
  await createForumNotifications(db, { actorId: session.sub, postId, content });
  return json({ ok: true, postId, category, url: category === 'home' ? `/foro/${postId}` : `/foro/${category}/${postId}` }, { status: 201 });
}

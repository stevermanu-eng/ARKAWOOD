import { csrfTokenValid, isSameOriginRequest, json, liveDiscordSession, sessionFromRequest } from '../../../_lib/auth.js';
import {
  canDeleteForumPost,
  canManageForumPost,
  cleanText,
  createForumNotifications,
  discordAvatarUrl,
  ensureProfile,
  forumExcerpt,
  normalizeForumType,
  normalizeForumTypeForCategory,
  normalizeReplyTone,
  prepareCommunityDb,
  profilePermissions,
  publicSocialLinks,
  randomPublicId,
  validForumContent,
  validForumId
} from '../../../_lib/communityStore.js';
import { readJsonBody } from '../../../_lib/requestBody.js';

async function postRecord(db, postId) {
  return db.prepare('SELECT post_id, discord_user_id, category, is_locked, is_pinned FROM forum_posts WHERE post_id = ? LIMIT 1').bind(postId).first();
}

async function authenticatedMutation(context) {
  const storedSession = await sessionFromRequest(context.request, context.env);
  if (!storedSession?.sub) return { response: json({ ok: false, error: 'login_required' }, { status: 401 }) };
  if (!isSameOriginRequest(context.request) || !csrfTokenValid(context.request, storedSession)) {
    return { response: json({ ok: false, error: 'csrf' }, { status: 403 }) };
  }
  const db = await prepareCommunityDb(context.env);
  if (!db) return { response: json({ ok: false, error: 'community_db_not_configured' }, { status: 503 }) };
  const session = await liveDiscordSession(context.env, storedSession);
  return { storedSession, session, db };
}

export async function onRequestGet(context) {
  const postId = String(context.params?.id || '').trim();
  if (!validForumId(postId)) return json({ ok: false, error: 'invalid_post_id' }, { status: 400 });
  const db = await prepareCommunityDb(context.env);
  if (!db) return json({ ok: false, error: 'community_db_not_configured' }, { status: 503 });

  const post = await db.prepare(`
    SELECT p.post_id, p.category, p.discord_user_id,
           COALESCE(up.display_name, p.author_name) AS author_name,
           p.author_avatar, CASE WHEN up.profile_photo IS NOT NULL AND up.profile_photo <> '' THEN 1 ELSE 0 END AS has_profile_photo, up.discord_avatar, up.discord_username, up.user_rank, up.user_roles, up.visible_roles, up.minecraft_username, CASE WHEN up.banner IS NOT NULL AND up.banner <> '' THEN 1 ELSE 0 END AS has_banner, up.social_instagram, up.social_facebook, up.social_youtube, up.social_twitter, up.bio,
           p.title, p.content, p.post_type, p.is_pinned, p.is_locked, p.created_at, p.updated_at,
           COUNT(r.reply_id) AS reply_count
    FROM forum_posts p
    LEFT JOIN forum_replies r ON r.post_id = p.post_id
    LEFT JOIN user_profiles up ON up.discord_user_id = p.discord_user_id
    WHERE p.post_id = ?
    GROUP BY p.post_id
    LIMIT 1
  `).bind(postId).first();
  if (!post) return json({ ok: false, error: 'post_not_found' }, { status: 404 });

  const replies = await db.prepare(`
    SELECT r.reply_id, r.post_id, r.discord_user_id,
           COALESCE(up.display_name, r.author_name) AS author_name,
           r.author_avatar, CASE WHEN up.profile_photo IS NOT NULL AND up.profile_photo <> '' THEN 1 ELSE 0 END AS has_profile_photo, up.discord_avatar, up.discord_username, up.user_rank, up.user_roles, up.visible_roles, up.minecraft_username, CASE WHEN up.banner IS NOT NULL AND up.banner <> '' THEN 1 ELSE 0 END AS has_banner, up.social_instagram, up.social_facebook, up.social_youtube, up.social_twitter, up.bio,
           r.content, r.parent_reply_id, r.quoted_reply_id, r.tone, r.created_at, r.updated_at,
           pr.discord_user_id AS parent_author_id, COALESCE(pup.display_name, pr.author_name) AS parent_author_name,
           qr.discord_user_id AS quoted_author_id, COALESCE(qup.display_name, qr.author_name) AS quoted_author_name,
           qr.content AS quoted_content
    FROM forum_replies r
    LEFT JOIN user_profiles up ON up.discord_user_id = r.discord_user_id
    LEFT JOIN forum_replies pr ON pr.reply_id = r.parent_reply_id
    LEFT JOIN user_profiles pup ON pup.discord_user_id = pr.discord_user_id
    LEFT JOIN forum_replies qr ON qr.reply_id = r.quoted_reply_id
    LEFT JOIN user_profiles qup ON qup.discord_user_id = qr.discord_user_id
    WHERE r.post_id = ?
    ORDER BY r.created_at ASC
    LIMIT 250
  `).bind(postId).all();

  const decorateProfileMedia = (item) => item ? ({
    ...item,
    profile_photo: item.has_profile_photo ? `/api/profile/photo/${encodeURIComponent(String(item.discord_user_id))}` : '',
    banner: item.has_banner ? `/api/profile/banner/${encodeURIComponent(String(item.discord_user_id))}` : '',
    social_links: publicSocialLinks(item),
    social_instagram: undefined,
    social_facebook: undefined,
    social_youtube: undefined,
    social_twitter: undefined,
    has_profile_photo: undefined,
    has_banner: undefined
  }) : item;
  const safePost = decorateProfileMedia(post);
  const safeReplies = (replies?.results || []).map(decorateProfileMedia);

  const storedSession = await sessionFromRequest(context.request, context.env);
  const session = storedSession ? await liveDiscordSession(context.env, storedSession) : null;
  const perms = profilePermissions(context.env, session);
  return json({
    ok: true,
    post: safePost,
    replies: safeReplies,
    viewer: { id: session?.sub || null, forumModeration: Boolean(perms.forumModerateReplies) },
    permissions: {
      canManage: canManageForumPost(context.env, session, post.discord_user_id),
      canDelete: Boolean(perms.forumDeleteThread),
      canPin: Boolean(perms.forumPin),
      canClose: Boolean(perms.forumClose),
      canModerate: Boolean(perms.forumModeration),
      canReply: Boolean(session?.sub) && !Boolean(post.is_locked)
    }
  });
}

export async function onRequestPost(context) {
  const postId = String(context.params?.id || '').trim();
  if (!validForumId(postId)) return json({ ok: false, error: 'invalid_post_id' }, { status: 400 });
  const auth = await authenticatedMutation(context);
  if (auth.response) return auth.response;
  const { db, session } = auth;
  const post = await postRecord(db, postId);
  if (!post) return json({ ok: false, error: 'post_not_found' }, { status: 404 });
  if (Number(post.is_locked)) return json({ ok: false, error: 'thread_locked' }, { status: 423 });

  const parsed = await readJsonBody(context.request, { maxBytes: 1_200_000 });
  if (!parsed.ok) return json({ ok:false, error:parsed.error }, { status:parsed.status });
  const payload = parsed.value;
  const content = String(payload?.content || '').replace(/\r\n?/g, '\n').trim();
  const tone = normalizeReplyTone(payload?.tone);
  const parentReplyId = payload?.parentReplyId ? String(payload.parentReplyId).trim() : '';
  if (content.length < 2) return json({ ok: false, error: 'reply_too_short' }, { status: 400 });
  if (!validForumContent(content, { maxChars: 900000, maxImages: 3, maxImageChars: 350000 })) return json({ ok: false, error: 'invalid_forum_content' }, { status: 400 });
  if (parentReplyId && !validForumId(parentReplyId)) return json({ ok: false, error: 'invalid_parent_reply' }, { status: 400 });

  let parent = null;
  if (parentReplyId) {
    parent = await db.prepare('SELECT reply_id, discord_user_id, author_name FROM forum_replies WHERE reply_id = ? AND post_id = ? LIMIT 1').bind(parentReplyId, postId).first();
    if (!parent) return json({ ok: false, error: 'parent_reply_not_found' }, { status: 404 });
  }

  const profile = await ensureProfile(context.env, session);
  const replyId = randomPublicId('r');
  await db.prepare(`
    INSERT INTO forum_replies (reply_id, post_id, discord_user_id, author_name, author_avatar, content, parent_reply_id, quoted_reply_id, tone, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  `).bind(
    replyId,
    postId,
    String(session.sub),
    String(profile?.display_name || session.displayName || session.username || 'Usuario'),
    discordAvatarUrl({ id: session.sub, avatar: session.avatar }),
    content,
    parent?.reply_id || null,
    null,
    tone
  ).run();

  const direct = [{ id: post.discord_user_id, type: 'reply', message: 'Respondieron a tu publicación.' }];
  if (parent) direct.push({ id: parent.discord_user_id, type: 'reply_to', message: 'Respondieron a uno de tus comentarios.' });
  await createForumNotifications(db, { actorId: session.sub, postId, replyId, content, direct });
  const replyUrl = post.category === 'home' ? `/foro/${postId}#respuesta-${replyId}` : `/foro/${post.category}/${postId}#respuesta-${replyId}`;
  return json({ ok: true, replyId, url: replyUrl }, { status: 201 });
}

export async function onRequestPut(context) {
  const postId = String(context.params?.id || '').trim();
  if (!validForumId(postId)) return json({ ok: false, error: 'invalid_post_id' }, { status: 400 });
  const auth = await authenticatedMutation(context);
  if (auth.response) return auth.response;
  const { db, session } = auth;
  const owner = await postRecord(db, postId);
  if (!owner) return json({ ok: false, error: 'post_not_found' }, { status: 404 });
  if (!canManageForumPost(context.env, session, owner.discord_user_id)) return json({ ok: false, error: 'forbidden' }, { status: 403 });

  const parsed = await readJsonBody(context.request, { maxBytes: 2_300_000 });
  if (!parsed.ok) return json({ ok:false, error:parsed.error }, { status:parsed.status });
  const payload = parsed.value;
  const postType = normalizeForumTypeForCategory(owner.category, payload?.type || '');
  const title = cleanText(payload?.title, 120);
  const content = String(payload?.content || '').replace(/\r\n?/g, '\n').trim();
  if (!postType) return json({ ok: false, error: 'invalid_type_for_category' }, { status: 400 });
  if (title.length < 4) return json({ ok: false, error: 'title_too_short' }, { status: 400 });
  if (content.length < 10) return json({ ok: false, error: 'content_too_short' }, { status: 400 });
  if (!validForumContent(content)) return json({ ok: false, error: 'invalid_forum_content' }, { status: 400 });

  await db.prepare(`
    UPDATE forum_posts
    SET title = ?, content = ?, excerpt = ?, post_type = ?, accent = 'gold',
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE post_id = ?
  `).bind(title, content, forumExcerpt(content), postType, postId).run();
  await createForumNotifications(db, { actorId: session.sub, postId, content });
  return json({ ok: true, postId });
}

export async function onRequestPatch(context) {
  const postId = String(context.params?.id || '').trim();
  if (!validForumId(postId)) return json({ ok: false, error: 'invalid_post_id' }, { status: 400 });
  const auth = await authenticatedMutation(context);
  if (auth.response) return auth.response;
  const { db, session } = auth;
  const post = await postRecord(db, postId);
  if (!post) return json({ ok: false, error: 'post_not_found' }, { status: 404 });
  const permissions = profilePermissions(context.env, session);
  const parsed = await readJsonBody(context.request, { maxBytes: 16 * 1024 });
  if (!parsed.ok) return json({ ok:false, error:parsed.error }, { status:parsed.status });
  const payload = parsed.value;
  const action = String(payload?.action || '').toLowerCase();
  if (action === 'pin' || action === 'unpin') {
    if (!permissions.forumPin) return json({ ok: false, error: 'forbidden' }, { status: 403 });
    await db.prepare(`UPDATE forum_posts SET is_pinned = ? WHERE post_id = ?`).bind(action === 'pin' ? 1 : 0, postId).run();
  } else if (action === 'lock' || action === 'unlock') {
    if (!permissions.forumClose) return json({ ok: false, error: 'forbidden' }, { status: 403 });
    await db.prepare(`UPDATE forum_posts SET is_locked = ? WHERE post_id = ?`).bind(action === 'lock' ? 1 : 0, postId).run();
  } else return json({ ok: false, error: 'invalid_action' }, { status: 400 });
  return json({ ok: true, action });
}

export async function onRequestDelete(context) {
  const postId = String(context.params?.id || '').trim();
  if (!validForumId(postId)) return json({ ok: false, error: 'invalid_post_id' }, { status: 400 });
  const auth = await authenticatedMutation(context);
  if (auth.response) return auth.response;
  const { db, session } = auth;
  const owner = await postRecord(db, postId);
  if (!owner) return json({ ok: false, error: 'post_not_found' }, { status: 404 });
  if (!canDeleteForumPost(context.env, session)) return json({ ok: false, error: 'forbidden' }, { status: 403 });
  await db.prepare('DELETE FROM forum_replies WHERE post_id = ?').bind(postId).run();
  await db.prepare('DELETE FROM forum_notifications WHERE post_id = ?').bind(postId).run();
  await db.prepare('DELETE FROM forum_posts WHERE post_id = ?').bind(postId).run();
  return json({ ok: true });
}

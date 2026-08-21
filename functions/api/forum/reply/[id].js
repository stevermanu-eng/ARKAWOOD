import { csrfTokenValid, isSameOriginRequest, json, liveDiscordSession, sessionFromRequest } from '../../../_lib/auth.js';
import { canManageForumPost, createForumNotifications, normalizeReplyTone, prepareCommunityDb, validForumContent, validForumId } from '../../../_lib/communityStore.js';
import { readJsonBody } from '../../../_lib/requestBody.js';

async function auth(context) {
  const storedSession = await sessionFromRequest(context.request, context.env);
  if (!storedSession?.sub) return { response: json({ ok: false, error: 'login_required' }, { status: 401 }) };
  if (!isSameOriginRequest(context.request) || !csrfTokenValid(context.request, storedSession)) return { response: json({ ok: false, error: 'csrf' }, { status: 403 }) };
  const db = await prepareCommunityDb(context.env);
  if (!db) return { response: json({ ok: false, error: 'community_db_not_configured' }, { status: 503 }) };
  const session = await liveDiscordSession(context.env, storedSession);
  return { db, session };
}

async function replyRecord(db, id) {
  return db.prepare('SELECT reply_id, post_id, discord_user_id FROM forum_replies WHERE reply_id = ? LIMIT 1').bind(id).first();
}

export async function onRequestPut(context) {
  const id = String(context.params?.id || '').trim();
  if (!validForumId(id)) return json({ ok: false, error: 'invalid_reply_id' }, { status: 400 });
  const state = await auth(context);
  if (state.response) return state.response;
  const reply = await replyRecord(state.db, id);
  if (!reply) return json({ ok: false, error: 'reply_not_found' }, { status: 404 });
  if (!canManageForumPost(context.env, state.session, reply.discord_user_id)) return json({ ok: false, error: 'forbidden' }, { status: 403 });
  const parsed = await readJsonBody(context.request, { maxBytes: 1_200_000 });
  if (!parsed.ok) return json({ ok:false, error:parsed.error }, { status:parsed.status });
  const payload = parsed.value;
  const content = String(payload?.content || '').replace(/\r\n?/g, '\n').trim();
  const tone = normalizeReplyTone(payload?.tone);
  if (content.length < 2) return json({ ok: false, error: 'reply_too_short' }, { status: 400 });
  if (!validForumContent(content, { maxChars: 900000, maxImages: 3, maxImageChars: 350000 })) return json({ ok: false, error: 'invalid_forum_content' }, { status: 400 });
  await state.db.prepare(`UPDATE forum_replies SET content = ?, tone = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE reply_id = ?`).bind(content, tone, id).run();
  await createForumNotifications(state.db, { actorId: state.session.sub, postId: reply.post_id, replyId: id, content });
  return json({ ok: true, replyId: id, postId: reply.post_id });
}

export async function onRequestDelete(context) {
  const id = String(context.params?.id || '').trim();
  if (!validForumId(id)) return json({ ok: false, error: 'invalid_reply_id' }, { status: 400 });
  const state = await auth(context);
  if (state.response) return state.response;
  const reply = await replyRecord(state.db, id);
  if (!reply) return json({ ok: false, error: 'reply_not_found' }, { status: 404 });
  if (!canManageForumPost(context.env, state.session, reply.discord_user_id)) return json({ ok: false, error: 'forbidden' }, { status: 403 });
  await state.db.prepare('UPDATE forum_replies SET parent_reply_id = NULL WHERE parent_reply_id = ?').bind(id).run();
  await state.db.prepare('UPDATE forum_replies SET quoted_reply_id = NULL WHERE quoted_reply_id = ?').bind(id).run();
  await state.db.prepare('DELETE FROM forum_notifications WHERE reply_id = ?').bind(id).run();
  await state.db.prepare('DELETE FROM forum_replies WHERE reply_id = ?').bind(id).run();
  return json({ ok: true, postId: reply.post_id });
}

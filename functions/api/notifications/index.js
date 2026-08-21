import { csrfTokenValid, isSameOriginRequest, json, sessionFromRequest } from '../../_lib/auth.js';
import { prepareCommunityDb } from '../../_lib/communityStore.js';
import { readJsonBody } from '../../_lib/requestBody.js';

export async function onRequestGet(context) {
  const session = await sessionFromRequest(context.request, context.env);
  if (!session?.sub) return json({ ok: false, error: 'login_required' }, { status: 401 });
  const db = await prepareCommunityDb(context.env);
  if (!db) return json({ ok: true, configured: false, unread: 0, notifications: [] });
  const result = await db.prepare(`
    SELECT n.notification_id, n.notification_type, n.post_id, n.reply_id, n.message, n.read_at, n.created_at,
           n.actor_discord_id, COALESCE(up.display_name, up.discord_username, 'Usuario') AS actor_name,
           CASE WHEN up.profile_photo IS NOT NULL AND up.profile_photo <> '' THEN 1 ELSE 0 END AS has_profile_photo,
           up.discord_avatar, p.category, p.title
    FROM forum_notifications n
    LEFT JOIN user_profiles up ON up.discord_user_id = n.actor_discord_id
    LEFT JOIN forum_posts p ON p.post_id = n.post_id
    WHERE n.recipient_discord_id = ?
    ORDER BY n.created_at DESC
    LIMIT 40
  `).bind(String(session.sub)).all();
  const notifications = (result?.results || []).map((item) => ({
    ...item,
    profile_photo: item.has_profile_photo ? `/api/profile/photo/${encodeURIComponent(String(item.actor_discord_id))}` : '',
    has_profile_photo: undefined
  }));
  const unread = notifications.reduce((count, item) => count + (item.read_at ? 0 : 1), 0);
  return json({ ok: true, configured: true, unread, notifications });
}

export async function onRequestPut(context) {
  const session = await sessionFromRequest(context.request, context.env);
  if (!session?.sub) return json({ ok: false, error: 'login_required' }, { status: 401 });
  if (!isSameOriginRequest(context.request) || !csrfTokenValid(context.request, session)) return json({ ok: false, error: 'csrf' }, { status: 403 });
  const db = await prepareCommunityDb(context.env);
  if (!db) return json({ ok: false, error: 'community_db_not_configured' }, { status: 503 });
  const parsed = await readJsonBody(context.request, { maxBytes: 4096, allowEmpty: true });
  if (!parsed.ok) return json({ ok:false, error:parsed.error }, { status:parsed.status });
  const id = String(parsed.value?.id || '').trim();
  if (id && !/^[A-Za-z0-9_-]{8,120}$/.test(id)) return json({ ok:false, error:'invalid_notification_id' }, { status:400 });
  if (id) {
    await db.prepare("UPDATE forum_notifications SET read_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE notification_id = ? AND recipient_discord_id = ?").bind(id, String(session.sub)).run();
  } else {
    await db.prepare("UPDATE forum_notifications SET read_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE recipient_discord_id = ? AND read_at IS NULL").bind(String(session.sub)).run();
  }
  return json({ ok: true });
}

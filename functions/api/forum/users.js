import { json } from '../../_lib/auth.js';
import { cleanText, prepareCommunityDb } from '../../_lib/communityStore.js';

export async function onRequestGet(context) {
  const db = await prepareCommunityDb(context.env);
  if (!db) return json({ ok: true, configured: false, users: [] });
  const url = new URL(context.request.url);
  const search = cleanText(url.searchParams.get('search'), 80);
  if (search.length < 2) return json({ ok: true, configured: true, users: [] });
  const escaped = search.replace(/[\\%_]/g, '\\$&');
  const term = `%${escaped}%`;
  const result = await db.prepare(`
    SELECT discord_user_id AS id, discord_username, display_name, discord_avatar,
           CASE WHEN profile_photo IS NOT NULL AND profile_photo <> '' THEN 1 ELSE 0 END AS has_profile_photo,
           user_rank, user_roles, visible_roles, minecraft_username, bio
    FROM user_profiles
    WHERE discord_username LIKE ? ESCAPE '\\' OR display_name LIKE ? ESCAPE '\\' OR minecraft_username LIKE ? ESCAPE '\\'
    ORDER BY CASE WHEN lower(discord_username) = lower(?) THEN 0 ELSE 1 END, updated_at DESC
    LIMIT 30
  `).bind(term, term, term, search).all();
  const users = (result?.results || []).map((user) => ({
    ...user,
    profile_photo: user.has_profile_photo ? `/api/profile/photo/${encodeURIComponent(String(user.id))}` : '',
    has_profile_photo: undefined
  }));
  return json({ ok: true, configured: true, users });
}

import { json } from '../../_lib/auth.js';
import { findProfile, listProfilePosts, prepareCommunityDb, profileStats, publicProfile } from '../../_lib/communityStore.js';

export async function onRequestGet(context) {
  const id = String(context.params?.id || '').trim();
  if (!/^\d{5,24}$/.test(id)) return json({ ok: false, error: 'invalid_profile_id' }, { status: 400 });
  if (!await prepareCommunityDb(context.env)) return json({ ok: false, error: 'community_db_not_configured' }, { status: 503 });

  // Public profile reads are served from D1. Live Discord synchronization is an
  // explicit owner action, avoiding a Discord API request every time somebody
  // views another user's profile.
  const profile = await findProfile(context.env, id);
  if (!profile) return json({ ok: false, error: 'profile_not_found' }, { status: 404 });
  const [stats, posts] = await Promise.all([profileStats(context.env, id), listProfilePosts(context.env, id)]);
  return json({ ok: true, profile: publicProfile(profile, stats, posts) });
}

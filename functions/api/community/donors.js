import { authConfig, json } from '../../_lib/auth.js';
import { communityDb, prepareCommunityDb } from '../../_lib/communityStore.js';

const API = 'https://discord.com/api/v10';
const DONOR_ROLE_ID = '1532907682984628317';
const TOP_DONOR_ROLE_ID = '1532907784977387650';
const DISCORD_FETCH_TIMEOUT_MS = 8000;
const BANNER_ROLE_IDS = new Set([
  '1538302102495825931','1531524803435958353','1532907784977387650',
  '1532511214964572190','1532511213173342208','1532511211428646992',
  '1532511209620897894','1532511207779467436','1532511205107699943','1532511203342159892'
]);
const PREMIUM_ROLE_IDS = new Set([
  '1532511214964572190','1532511213173342208','1532511211428646992',
  '1532511209620897894','1532511207779467436','1532511205107699943','1532511203342159892'
]);
const PREMIUM_LABELS = new Map([
  ['1532511214964572190','IMPERIUM'],['1532511213173342208','EUPHRATES'],['1532511211428646992','APOLLYON'],
  ['1532511209620897894','ECLIPSE'],['1532511207779467436','AJENJO'],['1532511205107699943','MAREA'],['1532511203342159892','IGNIS']
]);

function discordAvatar(user) {
  const id = String(user?.id || '');
  const hash = String(user?.avatar || '');
  if (id && hash) return `https://cdn.discordapp.com/avatars/${encodeURIComponent(id)}/${encodeURIComponent(hash)}.webp?size=256`;
  try { return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(id) >> 22n) % 6n)}.png`; }
  catch { return 'https://cdn.discordapp.com/embed/avatars/0.png'; }
}

function safeRoles(value) {
  if (Array.isArray(value)) return value.map(String);
  try {
    const parsed = JSON.parse(String(value || '[]'));
    return Array.isArray(parsed) ? parsed.map((item) => String(item?.id || item)).filter(Boolean) : [];
  } catch { return []; }
}

async function fetchMembers(env) {
  const token = String(env?.DISCORD_BOT_TOKEN || '').trim();
  const guildId = String(authConfig(env).guildId || '').trim();
  if (!token || !guildId) return null;
  const members = [];
  let after = '0';
  for (let page = 0; page < 5; page += 1) {
    const url = new URL(`${API}/guilds/${encodeURIComponent(guildId)}/members`);
    url.searchParams.set('limit', '1000');
    if (after !== '0') url.searchParams.set('after', after);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('discord_members_timeout'), DISCORD_FETCH_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Authorization: `Bot ${token}`,
          'User-Agent': 'ARKAWOOD Website (https://arkawood.pages.dev, 8.45.0)'
        }
      });
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) return null;
    let pageItems;
    try { pageItems = await response.json(); }
    catch { return null; }
    if (!Array.isArray(pageItems)) return null;
    members.push(...pageItems);
    if (pageItems.length < 1000) break;
    after = String(pageItems[pageItems.length - 1]?.user?.id || '0');
    if (after === '0') break;
  }
  return members;
}

async function profileMapForIds(db, ids) {
  const map = new Map();
  const unique = [...new Set(ids.map(String).filter(Boolean))];
  for (let offset = 0; offset < unique.length; offset += 80) {
    const batch = unique.slice(offset, offset + 80);
    const placeholders = batch.map(() => '?').join(',');
    const result = await db.prepare(`
      SELECT discord_user_id, discord_username, display_name, discord_avatar, CASE WHEN profile_photo IS NOT NULL AND profile_photo <> '' THEN 1 ELSE 0 END AS has_profile_photo, CASE WHEN banner IS NOT NULL AND banner <> '' THEN 1 ELSE 0 END AS has_banner, bio, minecraft_username, user_roles
      FROM user_profiles WHERE discord_user_id IN (${placeholders})
    `).bind(...batch).all();
    for (const row of result?.results || []) map.set(String(row.discord_user_id), row);
  }
  return map;
}

function configuredTopOrder(env) {
  return String(env?.ARKAWOOD_TOP_DONOR_ORDER || '').split(',').map((id) => id.trim()).filter(Boolean);
}

function publicItem(member, profile, roleIds, topOrder) {
  const user = member?.user || null;
  const id = String(user?.id || profile?.discord_user_id || '');
  const username = String(user?.username || profile?.discord_username || 'usuario');
  const displayName = String(member?.nick || user?.global_name || profile?.display_name || username);
  const roles = roleIds.map(String);
  const premium = roles.map((role) => PREMIUM_LABELS.get(role)).filter(Boolean);
  const configuredIndex = topOrder.indexOf(id);
  return {
    id,
    username,
    name: displayName,
    avatar: profile?.has_profile_photo ? `/api/profile/photo/${encodeURIComponent(id)}` : (user ? discordAvatar(user) : (profile?.discord_avatar ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(id)}/${encodeURIComponent(profile.discord_avatar)}.webp?size=256` : discordAvatar({ id }))),
    banner: profile?.has_banner ? `/api/profile/banner/${encodeURIComponent(id)}` : '',
    bio: profile?.bio || '',
    minecraftUsername: profile?.minecraft_username || '',
    registered: Boolean(profile),
    profileUrl: profile ? `/perfil/${encodeURIComponent(id)}` : '',
    topDonor: roles.includes(TOP_DONOR_ROLE_ID),
    donor: roles.includes(DONOR_ROLE_ID),
    premium,
    bannerEligible: roles.some((role) => BANNER_ROLE_IDS.has(role)),
    topOrder: configuredIndex >= 0 ? configuredIndex : 999999,
    joinedAt: member?.joined_at || ''
  };
}

export async function onRequestGet(context) {
  const dbReady = await prepareCommunityDb(context.env);
  const db = dbReady ? communityDb(context.env) : null;
  const topOrder = configuredTopOrder(context.env);

  let source = 'profiles';
  let items = [];
  const members = await fetchMembers(context.env).catch(() => null);
  if (members) {
    source = 'discord';
    const selected = members.filter((member) => {
      const roles = Array.isArray(member?.roles) ? member.roles.map(String) : [];
      return roles.includes(DONOR_ROLE_ID) || roles.includes(TOP_DONOR_ROLE_ID);
    });
    const profiles = db ? await profileMapForIds(db, selected.map((member) => member?.user?.id)) : new Map();
    items = selected.map((member) => {
      const roles = Array.isArray(member?.roles) ? member.roles.map(String) : [];
      return publicItem(member, profiles.get(String(member?.user?.id || '')), roles, topOrder);
    });
  } else if (db) {
    const result = await db.prepare(`
      SELECT discord_user_id, discord_username, display_name, discord_avatar, CASE WHEN profile_photo IS NOT NULL AND profile_photo <> '' THEN 1 ELSE 0 END AS has_profile_photo, CASE WHEN banner IS NOT NULL AND banner <> '' THEN 1 ELSE 0 END AS has_banner, bio, minecraft_username, user_roles
      FROM user_profiles
      WHERE user_roles LIKE ? OR user_roles LIKE ?
      ORDER BY updated_at DESC
      LIMIT 2000
    `).bind(`%${DONOR_ROLE_ID}%`, `%${TOP_DONOR_ROLE_ID}%`).all();
    items = (result?.results || []).map((profile) => publicItem(null, profile, safeRoles(profile.user_roles), topOrder));
  }

  const top = items.filter((item) => item.topDonor)
    .sort((a,b) => a.topOrder - b.topOrder || String(a.joinedAt).localeCompare(String(b.joinedAt)) || a.name.localeCompare(b.name, 'es'))
    .slice(0, 6)
    .map((item, index) => ({ ...item, top: index + 1 }));
  const topIds = new Set(top.map((item) => item.id));
  const donors = items.filter((item) => item.donor && !topIds.has(item.id))
    .sort((a,b) => a.name.localeCompare(b.name, 'es'));

  return json({ ok:true, source, top, donors, total: top.length + donors.length });
}

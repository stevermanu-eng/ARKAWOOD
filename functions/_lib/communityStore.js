import { applicationsDb, applicationsDbBindingName } from './applicationStore.js';
import { liveDiscordSession } from './auth.js';
import { forumRolePermissions, parseRoleBadges, primaryRoleFor, rolesForDiscordIds, visibleRolesForProfile, visibleRolesFromIds } from './arkawoodRoles.js';

const FORUM_CATEGORIES = new Set(['home', 'actualizaciones', 'anuncios', 'modalidades', 'comunidad', 'informacion']);
const FORUM_TYPES = new Set(['general','network','modality','bugs','update','patch','announcement','maintenance','discussion','question','suggestion','guide','report','event','help','clans','off_topic','rules','faq','reference']);
const FORUM_TYPES_BY_CATEGORY = new Map([
  ['actualizaciones', new Set(['general','network','modality','bugs','update','patch'])],
  ['anuncios', new Set(['general','network','modality','event','announcement','maintenance'])],
  ['modalidades', new Set(['off_topic','help','question','suggestion','discussion','report','clans'])],
  ['comunidad', new Set(['off_topic','help','question','suggestion','discussion','report','clans'])],
  ['informacion', new Set(['general','guide','rules','faq','reference','announcement'])],
  ['home', new Set(['discussion'])]
]);
const FORUM_REPLY_TONES = new Set(['neutral', 'gold', 'blue', 'green', 'violet', 'red']);
const IMAGE_DATA_RE = /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
const PROFILE_IMAGE_DATA_RE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const FORUM_IMAGE_TOKEN_RE = /\[img\s+width=(\d{1,3})\s+align=(left|center|right)\s+alt="([^"\n]{0,140})"\](data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)\[\/img\]/gi;
const DEFAULT_OWNER_IDS = new Set(['1290118757888294912', '984129773179646003', '1052673571429810186']);
let schemaPromise = null;
let schemaDb = null;

export function communityDb(env) {
  return applicationsDb(env);
}

export function communityDbBindingName(env) {
  return applicationsDbBindingName(env);
}

function csvSet(value) {
  return new Set(String(value || '').split(',').map((item) => item.trim()).filter(Boolean));
}

function ownerIds(env) {
  return new Set([...DEFAULT_OWNER_IDS, ...csvSet(env?.ARKAWOOD_OWNER_DISCORD_IDS)]);
}

function roleRankMap(env) {
  const raw = String(env?.DISCORD_ROLE_RANKS || '').trim();
  if (!raw) return new Map();
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return new Map(Object.entries(parsed).map(([id, label]) => [String(id), cleanRank(label)]).filter(([, label]) => label));
    }
  } catch {}
  const entries = raw.split(',').map((entry) => entry.split('=').map((part) => part.trim())).filter(([id, label]) => id && label);
  return new Map(entries.map(([id, label]) => [id, cleanRank(label)]).filter(([, label]) => label));
}

function cleanRank(value) {
  const rank = String(value || '').trim().toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ0-9 _·.-]/g, '').slice(0, 40);
  return rank || '';
}

export function rankForSession(env, session) {
  const id = String(session?.sub || '');
  const roles = Array.isArray(session?.roles) ? session.roles.map(String) : [];
  if (id && ownerIds(env).has(id) && !roles.includes('1538302102495825931')) roles.unshift('1538302102495825931');
  const catalogRank = primaryRoleFor(id, roles);
  if (catalogRank !== 'MIEMBRO') return catalogRank;
  const mapping = roleRankMap(env);
  for (const role of roles) {
    const mapped = mapping.get(role);
    if (mapped) return mapped;
  }
  if (session?.auditStaff) return 'STAFF';
  return 'MIEMBRO';
}

export function roleBadgesForSession(env, session) {
  const id = String(session?.sub || '');
  const roles = Array.isArray(session?.roles) ? session.roles.map(String) : [];
  if (id && ownerIds(env).has(id) && !roles.includes('1538302102495825931')) roles.unshift('1538302102495825931');
  return rolesForDiscordIds(id, roles);
}

const PREMIUM_PROFILE_ROLE_IDS = new Set([
  '1538302102495825931', // DEIDAD
  '1531524803435958353', // CO-OWNER
  '1532907784977387650', // TOP DONADOR
  '1532511214964572190', // IMPERIUM
  '1532511213173342208', // EUPHRATES
  '1532511211428646992', // APOLLYON
  '1532511209620897894', // ECLIPSE
  '1532511207779467436', // AJENJO
  '1532511205107699943', // MAREA
  '1532511203342159892'  // IGNIS
]);

export function profilePermissions(env, session) {
  const id = String(session?.sub || '');
  const roles = Array.isArray(session?.roles) ? session.roles.map(String) : [];
  if (id && ownerIds(env).has(id) && !roles.includes('1538302102495825931')) roles.unshift('1538302102495825931');
  const owner = Boolean(id && ownerIds(env).has(id));
  // Banner y redes sociales comparten el mismo beneficio premium.
  const premiumProfile = owner || roles.some((role) => PREMIUM_PROFILE_ROLE_IDS.has(role));
  const forum = forumRolePermissions(id, roles);
  return {
    owner,
    bannerUpload: premiumProfile,
    socialLinks: premiumProfile,
    forumModeration: Boolean(forum.pin || forum.close || forum.deleteThread || forum.editAnyThread),
    forumPublishAll: Boolean(forum.publishAll),
    forumPublishCommunity: Boolean(session?.member),
    forumPin: Boolean(forum.pin),
    forumClose: Boolean(forum.close),
    forumDeleteThread: Boolean(forum.deleteThread),
    forumEditAnyThread: Boolean(forum.editAnyThread),
    forumModerateReplies: Boolean(forum.moderateReplies)
  };
}

export function canManageForumPost(env, session, authorId) {
  if (!session?.sub) return false;
  return String(session.sub) === String(authorId) || profilePermissions(env, session).forumEditAnyThread;
}

export function canDeleteForumPost(env, session) {
  return Boolean(session?.sub && profilePermissions(env, session).forumDeleteThread);
}

async function addColumnIfMissing(db, table, column, definition) {
  const result = await db.prepare(`PRAGMA table_info(${table})`).all();
  const columns = new Set((result?.results || []).map((row) => String(row.name)));
  if (columns.has(column)) return;
  try {
    await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  } catch (error) {
    if (!/duplicate column/i.test(String(error?.message || error))) throw error;
  }
}

async function initializeSchema(db) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS user_profiles (
      discord_user_id TEXT PRIMARY KEY,
      discord_username TEXT NOT NULL,
      display_name TEXT NOT NULL,
      discord_avatar TEXT,
      minecraft_username TEXT,
      profile_photo TEXT,
      banner TEXT,
      social_instagram TEXT,
      social_facebook TEXT,
      social_youtube TEXT,
      social_twitter TEXT,
      bio TEXT NOT NULL DEFAULT '',
      birth_date TEXT,
      user_rank TEXT NOT NULL DEFAULT 'MIEMBRO',
      user_roles TEXT NOT NULL DEFAULT '[]',
      visible_roles TEXT NOT NULL DEFAULT '[]',
      roles_synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )`,
    `CREATE TABLE IF NOT EXISTS forum_posts (
      post_id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      discord_user_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_avatar TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT NOT NULL DEFAULT '',
      post_type TEXT NOT NULL DEFAULT 'discussion',
      accent TEXT NOT NULL DEFAULT 'gold',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_locked INTEGER NOT NULL DEFAULT 0,
      view_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )`,
    `CREATE TABLE IF NOT EXISTS forum_replies (
      reply_id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      discord_user_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_avatar TEXT,
      content TEXT NOT NULL,
      image_data TEXT,
      parent_reply_id TEXT,
      quoted_reply_id TEXT,
      tone TEXT NOT NULL DEFAULT 'neutral',
      updated_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )`,
    `CREATE TABLE IF NOT EXISTS forum_notifications (
      notification_id TEXT PRIMARY KEY,
      recipient_discord_id TEXT NOT NULL,
      actor_discord_id TEXT NOT NULL,
      notification_type TEXT NOT NULL,
      post_id TEXT,
      reply_id TEXT,
      message TEXT NOT NULL DEFAULT '',
      read_at TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )`,
    `CREATE TABLE IF NOT EXISTS profile_posts (
      post_id TEXT PRIMARY KEY,
      discord_user_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_avatar TEXT,
      content TEXT NOT NULL,
      image_data TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )`,
    `CREATE TABLE IF NOT EXISTS profile_reports (
      report_id TEXT PRIMARY KEY,
      reporter_discord_id TEXT NOT NULL,
      reported_discord_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )`
  ];

  for (const sql of statements) await db.prepare(sql).run();
  await addColumnIfMissing(db, 'user_profiles', 'user_roles', "TEXT NOT NULL DEFAULT '[]'");
  await addColumnIfMissing(db, 'user_profiles', 'roles_synced_at', 'TEXT');
  await addColumnIfMissing(db, 'user_profiles', 'visible_roles', "TEXT NOT NULL DEFAULT '[]'");
  await addColumnIfMissing(db, 'user_profiles', 'social_instagram', 'TEXT');
  await addColumnIfMissing(db, 'user_profiles', 'social_facebook', 'TEXT');
  await addColumnIfMissing(db, 'profile_posts', 'image_data', 'TEXT');
  await addColumnIfMissing(db, 'user_profiles', 'social_youtube', 'TEXT');
  await addColumnIfMissing(db, 'user_profiles', 'social_twitter', 'TEXT');
  await addColumnIfMissing(db, 'forum_posts', 'post_type', "TEXT NOT NULL DEFAULT 'discussion'");
  await addColumnIfMissing(db, 'forum_posts', 'accent', "TEXT NOT NULL DEFAULT 'gold'");
  await addColumnIfMissing(db, 'forum_posts', 'view_count', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing(db, 'forum_posts', 'updated_at', "TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, 'forum_posts', 'excerpt', "TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, 'forum_posts', 'is_pinned', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing(db, 'forum_posts', 'is_locked', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing(db, 'forum_replies', 'parent_reply_id', 'TEXT');
  await addColumnIfMissing(db, 'forum_replies', 'quoted_reply_id', 'TEXT');
  await addColumnIfMissing(db, 'forum_replies', 'tone', "TEXT NOT NULL DEFAULT 'neutral'");
  await addColumnIfMissing(db, 'forum_replies', 'updated_at', "TEXT NOT NULL DEFAULT ''");
  await db.prepare("UPDATE forum_replies SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = ''").run();
  await db.prepare("UPDATE forum_posts SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = ''").run();
  await db.prepare("UPDATE forum_posts SET excerpt = substr(content, 1, 700) WHERE excerpt IS NULL OR excerpt = ''").run();

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_forum_posts_category_created ON forum_posts(category, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON forum_posts(discord_user_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_forum_posts_type ON forum_posts(post_type, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_forum_replies_post_created ON forum_replies(post_id, created_at ASC)',
    'CREATE INDEX IF NOT EXISTS idx_forum_replies_author ON forum_replies(discord_user_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_forum_replies_parent ON forum_replies(parent_reply_id, created_at ASC)',
    'CREATE INDEX IF NOT EXISTS idx_forum_posts_pinned ON forum_posts(category, is_pinned DESC, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_forum_notifications_recipient ON forum_notifications(recipient_discord_id, read_at, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_forum_notifications_dedupe ON forum_notifications(recipient_discord_id, actor_discord_id, notification_type, post_id, reply_id)',
    'CREATE INDEX IF NOT EXISTS idx_profile_posts_author_created ON profile_posts(discord_user_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_profile_reports_target ON profile_reports(reported_discord_id, created_at DESC)'
  ];
  for (const sql of indexes) await db.prepare(sql).run();
  return db;
}

export async function prepareCommunityDb(env) {
  const db = communityDb(env);
  if (!db) return null;
  if (schemaDb !== db) {
    schemaDb = db;
    schemaPromise = null;
  }
  if (!schemaPromise) {
    schemaPromise = initializeSchema(db).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
  return db;
}

export function normalizeForumCategory(value) {
  const category = String(value || '').trim().toLowerCase();
  return FORUM_CATEGORIES.has(category) ? category : null;
}

export function normalizeForumType(value, allowEmpty = false) {
  const type = String(value || '').trim().toLowerCase();
  if (!type && allowEmpty) return '';
  return FORUM_TYPES.has(type) ? type : null;
}

export function normalizeForumTypeForCategory(categoryValue, typeValue, allowEmpty = false) {
  const category = normalizeForumCategory(categoryValue);
  if (!category) return null;
  const rawType = String(typeValue || '').trim().toLowerCase();
  if (!rawType && allowEmpty) return '';
  const type = normalizeForumType(rawType, false);
  if (!type) return null;
  return FORUM_TYPES_BY_CATEGORY.get(category)?.has(type) ? type : null;
}

export function normalizeForumAccent() {
  // Conservado por compatibilidad con publicaciones antiguas; v8.21 ya no expone color por publicación.
  return 'gold';
}

export function normalizeReplyTone(value) {
  const tone = String(value || '').trim().toLowerCase();
  return FORUM_REPLY_TONES.has(tone) ? tone : 'neutral';
}

export function canCreateInCategory(category, permissions = null) {
  const normalized = String(category || '').toLowerCase();
  if (!FORUM_CATEGORIES.has(normalized) || normalized === 'home') return false;
  if (normalized === 'modalidades' || normalized === 'comunidad') {
    return Boolean(permissions?.forumPublishAll || permissions?.forumPublishCommunity);
  }
  return Boolean(permissions?.forumPublishAll);
}

export function cleanText(value, maxLength) {
  const text = String(value ?? '').replace(/\r\n?/g, '\n').trim();
  return text.length <= maxLength ? text : text.slice(0, maxLength);
}

export function forumExcerpt(value, maxLength = 700) {
  let text = String(value || '').replace(/\r\n?/g, '\n');
  text = text.replace(FORUM_IMAGE_TOKEN_RE, ' [imagen] ');
  text = text.replace(/\[color=(?:gold|ember|red|violet|blue|green)\]([\s\S]*?)\[\/color\]/gi, '$1');
  text = text.replace(/\[fg=#[0-9a-f]{6}\]|\[\/fg\]/gi, '');
  text = text.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '$1');
  text = text.replace(/__([^_\n]+)__/g, '$1');
  text = text.replace(/\[([^\]\n]+)\]\(https:\/\/[^)\s]+\)/g, '$1');
  text = text.replace(/[*_~`>#-]/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length <= maxLength ? text : `${text.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

export function validForumContent(value, { maxChars = 1800000, maxImages = 5, maxImageChars = 430000 } = {}) {
  const content = String(value || '').replace(/\r\n?/g, '\n').trim();
  if (!content || content.length > maxChars) return false;
  let imageCount = 0;
  let match;
  FORUM_IMAGE_TOKEN_RE.lastIndex = 0;
  while ((match = FORUM_IMAGE_TOKEN_RE.exec(content))) {
    imageCount += 1;
    if (imageCount > maxImages) return false;
    const width = Number(match[1]);
    if (!Number.isFinite(width) || width < 20 || width > 100) return false;
    if (!IMAGE_DATA_RE.test(match[4]) || match[4].length > maxImageChars) return false;
  }
  const withoutImages = content.replace(FORUM_IMAGE_TOKEN_RE, '');
  if (/data:image\//i.test(withoutImages)) return false;
  return true;
}

export function randomPublicId(prefix = '') {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${prefix}${hex}`;
}

export function validForumId(value) {
  return /^[A-Za-z0-9_-]{30,80}$/.test(String(value || ''));
}

export function validMinecraftUsername(value) {
  if (value == null || value === '') return true;
  return /^[A-Za-z0-9_]{3,16}$/.test(String(value));
}

export function validBirthDate(value) {
  if (value == null || value === '') return true;
  const text = String(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return false;
  return date.getTime() <= Date.now();
}

export function validImageData(value, maxChars) {
  if (value == null || value === '') return true;
  const image = String(value);
  // Los endpoints de medios sirven PNG/JPEG/WEBP. Rechazamos GIF aquí para
  // que la API no acepte un formato que después sería imposible mostrar.
  return image.length <= maxChars && PROFILE_IMAGE_DATA_RE.test(image);
}

const SOCIAL_HOSTS = {
  instagram: ['instagram.com'],
  facebook: ['facebook.com', 'fb.com'],
  youtube: ['youtube.com', 'youtu.be'],
  twitter: ['x.com', 'twitter.com']
};

function socialHostAllowed(hostname, allowed) {
  const host = String(hostname || '').toLowerCase().replace(/^www\./, '');
  return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function normalizeSocialUrl(platform, value) {
  const key = String(platform || '').toLowerCase();
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  // No truncar una URL: cortarla silenciosamente puede cambiar el destino.
  if (raw.length > 240 || /[\u0000-\u001f\u007f]/.test(raw)) return null;
  const allowed = SOCIAL_HOSTS[key];
  if (!allowed) return null;
  let parsed;
  try { parsed = new URL(raw); } catch { return null; }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !socialHostAllowed(parsed.hostname, allowed)) return null;
  parsed.hash = '';
  const normalized = parsed.toString();
  return normalized.length <= 240 ? normalized : null;
}

function profileHasPremiumFeatures(profile) {
  if (!profile) return false;
  const id = String(profile.discord_user_id || '');
  if (DEFAULT_OWNER_IDS.has(id)) return true;
  const roles = parseRoleBadges(profile.user_roles);
  return roles.some((role) => PREMIUM_PROFILE_ROLE_IDS.has(String(role?.id || '')));
}

export function publicSocialLinks(profile) {
  if (!profileHasPremiumFeatures(profile)) return {};
  const links = {};
  const values = {
    instagram: profile.social_instagram,
    facebook: profile.social_facebook,
    youtube: profile.social_youtube,
    twitter: profile.social_twitter
  };
  for (const [key, value] of Object.entries(values)) {
    const normalized = normalizeSocialUrl(key, value);
    if (normalized) links[key] = normalized;
  }
  return links;
}

export function discordAvatarUrl(user) {
  if (!user?.id) return null;
  if (user.avatar) return `https://cdn.discordapp.com/avatars/${encodeURIComponent(user.id)}/${encodeURIComponent(user.avatar)}.webp?size=256`;
  try { return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(user.id) >> 22n) % 6n)}.png`; }
  catch { return 'https://cdn.discordapp.com/embed/avatars/0.png'; }
}

export function extractMentionUsernames(value) {
  const found = new Set();
  const text = String(value || '').replace(FORUM_IMAGE_TOKEN_RE, ' ');
  const re = /(^|[^A-Za-z0-9_.])@([A-Za-z0-9_.]{2,32})/g;
  let match;
  while ((match = re.exec(text)) && found.size < 20) found.add(match[2].toLowerCase());
  return [...found];
}

export async function resolveMentionProfiles(db, usernames) {
  const clean = [...new Set((usernames || []).map((item) => String(item || '').toLowerCase()).filter(Boolean))].slice(0, 20);
  if (!clean.length) return [];
  const placeholders = clean.map(() => '?').join(',');
  const result = await db.prepare(`
    SELECT discord_user_id, discord_username, display_name, profile_photo, discord_avatar, user_rank
    FROM user_profiles
    WHERE lower(discord_username) IN (${placeholders})
  `).bind(...clean).all();
  return result?.results || [];
}

export async function createForumNotifications(db, { actorId, postId = null, replyId = null, content = '', direct = [] }) {
  if (!db || !actorId) return;
  const actor = String(actorId);
  const recipients = new Map();
  for (const item of direct || []) {
    const id = String(item?.id || '');
    if (id && id !== actor) recipients.set(id, { type: item.type || 'reply', message: cleanText(item.message, 180) });
  }
  const mentioned = await resolveMentionProfiles(db, extractMentionUsernames(content));
  for (const profile of mentioned) {
    const id = String(profile.discord_user_id || '');
    if (id && id !== actor && !recipients.has(id)) recipients.set(id, { type: 'mention', message: 'Te mencionaron en el foro.' });
  }
  for (const [recipientId, data] of recipients) {
    const existing = await db.prepare(`
      SELECT notification_id
      FROM forum_notifications
      WHERE recipient_discord_id = ? AND actor_discord_id = ? AND notification_type = ?
        AND COALESCE(post_id, '') = COALESCE(?, '') AND COALESCE(reply_id, '') = COALESCE(?, '')
      LIMIT 1
    `).bind(recipientId, actor, data.type, postId, replyId).first();
    if (existing?.notification_id) continue;
    await db.prepare(`
      INSERT INTO forum_notifications (notification_id, recipient_discord_id, actor_discord_id, notification_type, post_id, reply_id, message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(randomPublicId('n'), recipientId, actor, data.type, postId, replyId, data.message || '').run();
  }
}

export async function ensureProfile(env, session) {
  const db = await prepareCommunityDb(env);
  if (!db || !session?.sub) return null;
  const userId = String(session.sub);
  const rank = rankForSession(env, session);
  const allRoleBadges = roleBadgesForSession(env, session);
  const existing = await db.prepare('SELECT visible_roles FROM user_profiles WHERE discord_user_id = ? LIMIT 1').bind(userId).first();
  const visibleRoleBadges = visibleRolesForProfile(userId, allRoleBadges, existing?.visible_roles || '[]');
  await db.prepare(`
    INSERT INTO user_profiles (discord_user_id, discord_username, display_name, discord_avatar, user_rank, user_roles, visible_roles, roles_synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(discord_user_id) DO UPDATE SET
      discord_username = excluded.discord_username,
      display_name = excluded.display_name,
      discord_avatar = excluded.discord_avatar,
      user_rank = excluded.user_rank,
      user_roles = excluded.user_roles,
      visible_roles = excluded.visible_roles,
      roles_synced_at = excluded.roles_synced_at,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `).bind(
    userId,
    String(session.username || ''),
    String(session.displayName || session.username || ''),
    session.avatar || null,
    rank,
    JSON.stringify(allRoleBadges),
    JSON.stringify(visibleRoleBadges),
    session.roleCheckedAt || new Date().toISOString()
  ).run();
  return findProfile(env, userId);
}

export async function syncProfileDiscordIdentity(env, discordUserId) {
  if (!String(env?.DISCORD_BOT_TOKEN || '').trim()) return findProfile(env, discordUserId);
  const current = await findProfile(env, discordUserId);
  if (!current) return null;
  const live = await liveDiscordSession(env, {
    sub: String(discordUserId),
    username: current.discord_username,
    displayName: current.display_name,
    avatar: current.discord_avatar,
    member: true,
    auditStaff: false,
    roles: []
  });
  return ensureProfile(env, live);
}

export async function findProfile(env, discordUserId) {
  const db = await prepareCommunityDb(env);
  if (!db) return null;
  return db.prepare(`
    SELECT discord_user_id, discord_username, display_name, discord_avatar,
           minecraft_username, profile_photo, banner, social_instagram, social_facebook, social_youtube, social_twitter, bio, birth_date, user_rank, user_roles, visible_roles, roles_synced_at,
           created_at, updated_at
    FROM user_profiles
    WHERE discord_user_id = ?
    LIMIT 1
  `).bind(String(discordUserId)).first();
}

export async function profileStats(env, discordUserId) {
  const db = await prepareCommunityDb(env);
  if (!db) return { forumTopics: 0, replies: 0 };
  const [topics, replies] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS total FROM forum_posts WHERE discord_user_id = ?').bind(String(discordUserId)).first(),
    db.prepare('SELECT COUNT(*) AS total FROM forum_replies WHERE discord_user_id = ?').bind(String(discordUserId)).first()
  ]);
  return { forumTopics: Number(topics?.total || 0), replies: Number(replies?.total || 0) };
}

export async function listProfilePosts(env, discordUserId, limit = 20) {
  const db = await prepareCommunityDb(env);
  if (!db) return [];
  const result = await db.prepare(`
    SELECT pp.post_id, pp.discord_user_id,
           COALESCE(up.display_name, pp.author_name) AS author_name,
           pp.author_avatar, up.profile_photo, up.discord_avatar, up.user_rank, up.user_roles, up.visible_roles, up.social_instagram, up.social_facebook, up.social_youtube, up.social_twitter,
           pp.content, CASE WHEN pp.image_data IS NOT NULL AND pp.image_data <> '' THEN 1 ELSE 0 END AS has_image, pp.created_at
    FROM profile_posts pp
    LEFT JOIN user_profiles up ON up.discord_user_id = pp.discord_user_id
    WHERE pp.discord_user_id = ?
    ORDER BY pp.created_at DESC
    LIMIT ?
  `).bind(String(discordUserId), Math.min(Math.max(Number(limit) || 20, 1), 50)).all();
  return result?.results || [];
}

export function availableProfileRoles(profile) {
  if (!profile) return [];
  return parseRoleBadges(profile.user_roles);
}

export function selectVisibleProfileRoles(profile, requestedIds) {
  if (!profile) return null;
  return visibleRolesFromIds(String(profile.discord_user_id), parseRoleBadges(profile.user_roles), requestedIds);
}

export function publicProfile(profile, stats, posts) {
  if (!profile) return null;
  const id = String(profile.discord_user_id || '');
  const mediaVersion = encodeURIComponent(String(profile.updated_at || profile.roles_synced_at || '1'));
  const publicPosts = Array.isArray(posts) ? posts.map((post) => ({
    ...post,
    profile_photo: post?.profile_photo && post?.discord_user_id
      ? `/api/profile/photo/${encodeURIComponent(String(post.discord_user_id))}`
      : '',
    image_url: Number(post?.has_image || 0) && post?.post_id
      ? `/api/profile/post-image/${encodeURIComponent(String(post.post_id))}`
      : '',
    social_links: publicSocialLinks(post)
  })) : [];
  return {
    id,
    discordUsername: profile.discord_username,
    displayName: profile.display_name,
    discordAvatar: profile.discord_avatar,
    minecraftUsername: profile.minecraft_username || '',
    // Never embed large Base64 profile media in JSON responses. Serving images
    // through dedicated endpoints keeps forum/profile payloads small and cacheable.
    profilePhoto: profile.profile_photo ? `/api/profile/photo/${encodeURIComponent(id)}?v=${mediaVersion}` : '',
    banner: profile.banner ? `/api/profile/banner/${encodeURIComponent(id)}?v=${mediaVersion}` : '',
    socialLinks: publicSocialLinks(profile),
    bio: profile.bio || '',
    birthDate: profile.birth_date || '',
    rank: DEFAULT_OWNER_IDS.has(id) ? 'DEIDAD' : (profile.user_rank || 'MIEMBRO'),
    roles: visibleRolesForProfile(
      id,
      parseRoleBadges(profile.user_roles),
      profile.visible_roles || '[]'
    ),
    rolesSyncedAt: profile.roles_synced_at || null,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
    stats: stats || { forumTopics: 0, replies: 0 },
    posts: publicPosts
  };
}

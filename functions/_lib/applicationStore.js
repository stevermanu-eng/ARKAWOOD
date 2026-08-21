export const APPLICATIONS_DB_BINDING = 'applications_db';
export const PUBLIC_APPLICATION_BASELINE = 32;

const D1_BINDING_CANDIDATES = [
  'applications_db',
  'APPLICATIONS_DB',
  'community_db',
  'COMMUNITY_DB',
  'arkawood_db',
  'ARKAWOOD_DB',
  'arka_db',
  'ARKA_DB',
  'DB'
];

function looksLikeD1(binding) {
  return Boolean(
    binding &&
    typeof binding === 'object' &&
    typeof binding.prepare === 'function' &&
    typeof binding.batch === 'function'
  );
}

/**
 * Resolve the site's D1 binding without tying deployments to one dashboard name.
 * The explicit historical name is always preferred; common names and finally any
 * object that exposes the D1 API are accepted as a compatibility fallback.
 */
export function applicationsDb(env) {
  if (!env || typeof env !== 'object') return null;
  const requested = String(env.COMMUNITY_DB_BINDING || env.APPLICATIONS_DB_BINDING || '').trim();
  if (requested && looksLikeD1(env[requested])) return env[requested];
  for (const key of D1_BINDING_CANDIDATES) {
    if (looksLikeD1(env[key])) return env[key];
  }
  const detected = Object.values(env).filter(looksLikeD1);
  return detected.length === 1 ? detected[0] : null;
}

export function applicationsDbBindingName(env) {
  if (!env || typeof env !== 'object') return null;
  const requested = String(env.COMMUNITY_DB_BINDING || env.APPLICATIONS_DB_BINDING || '').trim();
  if (requested && looksLikeD1(env[requested])) return requested;
  for (const key of D1_BINDING_CANDIDATES) {
    if (looksLikeD1(env[key])) return key;
  }
  const detected = Object.entries(env).filter(([, value]) => looksLikeD1(value));
  return detected.length === 1 ? detected[0][0] : null;
}

export async function findApplicationByDiscordId(env, discordUserId) {
  const db = applicationsDb(env);
  if (!db) return null;
  return db.prepare(`
    SELECT application_id, branch, discord_user_id, submitted_at, status
    FROM staff_applications
    WHERE discord_user_id = ?
    LIMIT 1
  `).bind(String(discordUserId)).first();
}

export async function reserveApplication(env, application) {
  const db = applicationsDb(env);
  if (!db) throw new Error(`${APPLICATIONS_DB_BINDING} is not configured`);

  const result = await db.prepare(`
    INSERT OR IGNORE INTO staff_applications (
      application_id,
      branch,
      discord_user_id,
      username,
      display_name,
      avatar,
      started_at,
      submitted_at,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).bind(
    application.applicationId,
    application.branch,
    String(application.discordUserId),
    String(application.username || ''),
    String(application.displayName || application.username || ''),
    application.avatar || null,
    application.startedAt || null,
    application.submittedAt
  ).run();

  const inserted = Number(result?.meta?.changes || 0) === 1;
  if (inserted) return { inserted: true, existing: null };
  return {
    inserted: false,
    existing: await findApplicationByDiscordId(env, application.discordUserId)
  };
}

export async function markApplicationSubmitted(env, applicationId, webhookMessageId = null) {
  const db = applicationsDb(env);
  if (!db) throw new Error(`${APPLICATIONS_DB_BINDING} is not configured`);
  return db.prepare(`
    UPDATE staff_applications
    SET status = 'submitted', webhook_message_id = ?
    WHERE application_id = ? AND status = 'pending'
  `).bind(webhookMessageId || null, applicationId).run();
}

export async function releasePendingApplication(env, applicationId) {
  const db = applicationsDb(env);
  if (!db) return;
  await db.prepare(`
    DELETE FROM staff_applications
    WHERE application_id = ? AND status = 'pending'
  `).bind(applicationId).run();
}

export async function applicationStats(env) {
  const db = applicationsDb(env);
  if (!db) {
    return {
      configured: false,
      submittedCount: 0,
      total: PUBLIC_APPLICATION_BASELINE
    };
  }

  const row = await db.prepare(`
    SELECT COUNT(*) AS total
    FROM staff_applications
    WHERE status = 'submitted'
  `).first();
  const submittedCount = Number(row?.total || 0);
  return {
    configured: true,
    submittedCount,
    total: PUBLIC_APPLICATION_BASELINE + submittedCount
  };
}

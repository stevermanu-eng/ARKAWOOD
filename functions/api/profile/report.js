import { csrfTokenValid, isSameOriginRequest, json, sessionFromRequest } from '../../_lib/auth.js';
import { cleanText, prepareCommunityDb } from '../../_lib/communityStore.js';
import { readJsonBody } from '../../_lib/requestBody.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const session = await sessionFromRequest(request, env);
  if (!session?.sub) return json({ ok: false, error: 'login_required' }, { status: 401 });
  if (!isSameOriginRequest(request) || !csrfTokenValid(request, session)) return json({ ok: false, error: 'csrf' }, { status: 403 });
  const db = await prepareCommunityDb(env);
  if (!db) return json({ ok: false, error: 'community_db_not_configured' }, { status: 503 });

  const parsed = await readJsonBody(request, { maxBytes: 8 * 1024 });
  if (!parsed.ok) return json({ ok:false, error:parsed.error }, { status:parsed.status });
  const payload = parsed.value;
  const targetId = String(payload?.targetId || '').trim();
  const reason = cleanText(payload?.reason, 700);
  if (!/^\d{5,24}$/.test(targetId)) return json({ ok: false, error: 'invalid_target' }, { status: 400 });
  if (targetId === String(session.sub)) return json({ ok: false, error: 'cannot_report_self' }, { status: 400 });
  if (reason.length < 10) return json({ ok: false, error: 'reason_too_short' }, { status: 400 });

  await db.prepare(`
    INSERT INTO profile_reports (report_id, reporter_discord_id, reported_discord_id, reason)
    VALUES (?, ?, ?, ?)
  `).bind(crypto.randomUUID(), String(session.sub), targetId, reason).run();
  return json({ ok: true }, { status: 201 });
}

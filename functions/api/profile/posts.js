import { csrfTokenValid, isSameOriginRequest, json, sessionFromRequest } from '../../_lib/auth.js';
import { cleanText, discordAvatarUrl, ensureProfile, prepareCommunityDb, randomPublicId } from '../../_lib/communityStore.js';
import { readJsonBody } from '../../_lib/requestBody.js';

const IMAGE_RE = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;
function validPostImage(value) {
  if (!value) return '';
  const image = String(value);
  if (image.length > 1_600_000 || !IMAGE_RE.test(image)) return null;
  return image;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const storedSession = await sessionFromRequest(request, env);
  if (!storedSession?.sub) return json({ ok: false, error: 'login_required' }, { status: 401 });
  if (!isSameOriginRequest(request) || !csrfTokenValid(request, storedSession)) return json({ ok: false, error: 'csrf' }, { status: 403 });
  const db = await prepareCommunityDb(env);
  if (!db) return json({ ok: false, error: 'community_db_not_configured' }, { status: 503 });

  const parsed = await readJsonBody(request, { maxBytes: 1_700_000 });
  if (!parsed.ok) return json({ ok:false, error:parsed.error }, { status:parsed.status });
  const payload = parsed.value;
  const rawContent = String(payload?.content ?? '').replace(/\r\n?/g, '\n').trim();
  if (rawContent.length > 1000) return json({ ok:false, error:'post_too_long', maxLength:1000 }, { status:400 });
  const content = cleanText(rawContent, 1000);
  const imageData = validPostImage(payload?.imageData);
  if (imageData === null) return json({ ok:false, error:'invalid_post_image' }, { status:400 });
  if (content.length < 1 && !imageData) return json({ ok: false, error: 'empty_post' }, { status: 400 });

  const session = storedSession;
  const profile = await ensureProfile(env, session);
  const postId = randomPublicId('p');
  await db.prepare(`
    INSERT INTO profile_posts (post_id, discord_user_id, author_name, author_avatar, content, image_data)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    postId,
    String(session.sub),
    String(profile?.display_name || session.displayName || session.username || 'Usuario'),
    discordAvatarUrl({ id: session.sub, avatar: session.avatar }),
    content,
    imageData || null
  ).run();

  return json({ ok: true, postId }, { status: 201 });
}

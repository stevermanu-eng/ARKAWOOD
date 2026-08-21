import { json } from '../../../_lib/auth.js';
import { findProfile, prepareCommunityDb } from '../../../_lib/communityStore.js';

const IMAGE_RE = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;

function bytesFromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function onRequestGet(context) {
  const id = String(context.params?.id || '').trim();
  if (!/^\d{5,24}$/.test(id)) return json({ ok:false, error:'invalid_profile_id' }, { status:400 });
  if (!await prepareCommunityDb(context.env)) return json({ ok:false, error:'community_db_not_configured' }, { status:503 });
  const profile = await findProfile(context.env, id);
  const match = String(profile?.profile_photo || '').match(IMAGE_RE);
  if (!match) return new Response(null, { status:404, headers:{ 'Cache-Control':'public, max-age=30' } });
  let body;
  try { body = bytesFromBase64(match[2]); }
  catch { return new Response(null, { status:422, headers:{ 'Cache-Control':'no-store' } }); }
  const mime = match[1] === 'jpeg' ? 'image/jpeg' : `image/${match[1]}`;
  return new Response(body, {
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

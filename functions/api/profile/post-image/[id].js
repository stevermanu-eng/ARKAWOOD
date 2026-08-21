import { prepareCommunityDb } from '../../../_lib/communityStore.js';

const IMAGE_RE = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;
function bytesFromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
export async function onRequestGet(context) {
  const id = String(context.params?.id || '');
  if (!/^[A-Za-z0-9_-]{8,120}$/.test(id)) return new Response('Not found', { status:404 });
  const db = await prepareCommunityDb(context.env);
  if (!db) return new Response('Unavailable', { status:503 });
  const row = await db.prepare('SELECT image_data FROM profile_posts WHERE post_id = ? LIMIT 1').bind(id).first();
  const match = String(row?.image_data || '').match(IMAGE_RE);
  if (!match) return new Response('Not found', { status:404 });
  let body;
  try { body = bytesFromBase64(match[2]); }
  catch { return new Response('Invalid image data', { status:422, headers:{ 'Cache-Control':'no-store' } }); }
  const mime = match[1] === 'jpeg' ? 'image/jpeg' : `image/${match[1]}`;
  return new Response(body, { headers:{'Content-Type':mime,'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'} });
}

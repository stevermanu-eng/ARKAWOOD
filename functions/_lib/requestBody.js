export async function readJsonBody(request, { maxBytes = 256 * 1024, allowEmpty = false } = {}) {
  const contentType = String(request.headers.get('Content-Type') || '').toLowerCase();
  if (!contentType.startsWith('application/json')) {
    return { ok: false, error: 'invalid_content_type', status: 415 };
  }

  const rawLength = request.headers.get('Content-Length');
  if (rawLength) {
    const length = Number(rawLength);
    if (!Number.isFinite(length) || length < 0) return { ok:false, error:'invalid_length', status:400 };
    if (length > maxBytes) return { ok:false, error:'payload_too_large', status:413 };
  }

  if (!request.body) return allowEmpty ? { ok:true, value:{} } : { ok:false, error:'invalid_json', status:400 };
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel('payload_too_large'); } catch {}
        return { ok:false, error:'payload_too_large', status:413 };
      }
      chunks.push(value);
    }
  } catch {
    return { ok:false, error:'invalid_json', status:400 };
  }
  if (!total && allowEmpty) return { ok:true, value:{} };

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const text = new TextDecoder('utf-8', { fatal:true }).decode(bytes);
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok:false, error:'invalid_json', status:400 };
    return { ok:true, value };
  } catch {
    return { ok:false, error:'invalid_json', status:400 };
  }
}

import assert from 'node:assert/strict';
import { onRequest as middleware } from '../functions/_middleware.js';
import {
  MIN_SESSION_SECRET_BYTES,
  createSessionToken,
  safeReturnPath,
  sessionCheckFresh,
  verifySessionToken
} from '../functions/_lib/auth.js';
import { buildApplicationEmbeds } from '../functions/_lib/applicationWebhook.js';
import { MAX_APPLICATION_BODY_BYTES, submitApplication } from '../functions/_lib/applicationSubmission.js';
import { onRequestPost as logout } from '../functions/api/auth/logout.js';

const secret = 's'.repeat(MIN_SESSION_SECRET_BYTES + 12);
const now = new Date().toISOString();
const token = await createSessionToken({
  id: '123456789012345678',
  username: 'tester',
  displayName: 'Tester',
  member: true,
  auditStaff: true,
  roleCheckedAt: now,
  startedAt: now
}, secret);
const verified = await verifySessionToken(token, secret);
assert.equal(verified?.sub, '123456789012345678');
assert.ok(typeof verified?.csrf === 'string' && verified.csrf.length >= 24);
assert.equal(await verifySessionToken(`${token}x`, secret), null);
assert.equal(await verifySessionToken(token, 'short'), null);
assert.equal(safeReturnPath('https://evil.invalid/'), '/postulacion-moderacion.html');
assert.equal(safeReturnPath('//evil.invalid/'), '/postulacion-moderacion.html');
assert.equal(safeReturnPath('/wiki/?x=1#ok'), '/wiki/?x=1#ok');
assert.equal(sessionCheckFresh({ roleCheckedAt: now }, 60_000), true);
assert.equal(sessionCheckFresh({ roleCheckedAt: 'invalid' }, 60_000), false);

const longAnswers = Object.fromEntries(Array.from({ length: 40 }, (_, index) => [`q${index}`, 'a'.repeat(5000)]));
const embeds = buildApplicationEmbeds('moderation', {
  applicant: { discordUserId: '123', username: 'tester', displayName: 'Tester' },
  answers: longAnswers,
  applicationId: crypto.randomUUID(),
  submittedAt: now
});
assert.equal(embeds.length, 2);

class FakeDb {
  constructor() { this.row = null; }
  prepare(sql) {
    const db = this;
    return {
      args: [],
      bind(...args) { this.args = args; return this; },
      async run() {
        if (sql.includes('INSERT OR IGNORE')) {
          if (db.row) return { meta: { changes: 0 } };
          db.row = {
            application_id: this.args[0],
            branch: this.args[1],
            discord_user_id: this.args[2],
            submitted_at: this.args[7],
            status: 'pending'
          };
          return { meta: { changes: 1 } };
        }
        if (sql.includes("SET status = 'submitted'")) {
          if (db.row) db.row.status = 'submitted';
          return { meta: { changes: 1 } };
        }
        if (sql.includes('DELETE FROM')) {
          db.row = null;
          return { meta: { changes: 1 } };
        }
        return { meta: { changes: 0 } };
      },
      async first() { return db.row; }
    };
  }
}

const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith('https://discord.com/api/webhooks/')) {
    assert.equal(init.method, 'POST');
    return new Response(JSON.stringify({ id: 'webhook-message-id' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return originalFetch(url, init);
};

try {
  const env = {
    SESSION_SECRET: secret,
    applications_db: new FakeDb(),
    DISCORD_WEBHOOK_MODERATION: 'https://discord.com/api/webhooks/123/token'
  };
  const schema = [
    { id: 'answer', category: 0, type: 'text', min: 2, max: 50 },
    { id: 'discordIdentity', category: 0, type: 'discord' }
  ];
  const payload = {
    answers: { answer: 'respuesta válida', discordIdentity: 'identidad manipulada' },
    consent: { accepted: true, internalReview: true, notPublic: true, interviewIfNeeded: true }
  };
  const baseHeaders = {
    'Content-Type': 'application/json',
    Origin: 'https://arkawood.pages.dev',
    'Sec-Fetch-Site': 'same-origin',
    'X-CSRF-Token': verified.csrf,
    Cookie: `arka_session=${encodeURIComponent(token)}`
  };

  let request = new Request('https://arkawood.pages.dev/api/applications/moderation', {
    method: 'POST', headers: baseHeaders, body: JSON.stringify(payload)
  });
  let response = await submitApplication({ request, env, waitUntil() {} }, { branch: 'moderation', schema });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).ok, true);
  assert.equal(env.applications_db.row.status, 'submitted');

  request = new Request('https://arkawood.pages.dev/api/applications/moderation', {
    method: 'POST',
    headers: { ...baseHeaders, 'X-CSRF-Token': 'z'.repeat(32) },
    body: JSON.stringify(payload)
  });
  response = await submitApplication({ request, env: { ...env, applications_db: new FakeDb() }, waitUntil() {} }, { branch: 'moderation', schema });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'csrf_invalid');

  request = new Request('https://arkawood.pages.dev/api/applications/moderation', {
    method: 'POST',
    headers: { ...baseHeaders, Origin: 'https://evil.invalid' },
    body: JSON.stringify(payload)
  });
  response = await submitApplication({ request, env, waitUntil() {} }, { branch: 'moderation', schema });
  assert.equal(response.status, 403);

  request = new Request('https://arkawood.pages.dev/api/applications/moderation', {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify({ ...payload, padding: 'x'.repeat(MAX_APPLICATION_BODY_BYTES + 1000) })
  });
  response = await submitApplication({ request, env: { ...env, applications_db: new FakeDb() }, waitUntil() {} }, { branch: 'moderation', schema });
  assert.equal(response.status, 413);

  const next = async () => new Response('<html>ok</html>', { headers: { 'Content-Type': 'text/html' } });
  const staleToken = await createSessionToken({
    id: '1', username: 'u', displayName: 'U', member: true, auditStaff: true,
    roleCheckedAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(), startedAt: now
  }, secret);

  response = await middleware({
    request: new Request('https://arkawood.pages.dev/postulacion-moderacion.html', { headers: { Cookie: `arka_session=${encodeURIComponent(token)}` } }),
    env: { SESSION_SECRET: secret }, next
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Content-Security-Policy') || '', /script-src 'self'/);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store, max-age=0');

  response = await middleware({
    request: new Request('https://arkawood.pages.dev/postulacion-moderacion.html', { headers: { Cookie: `arka_session=${encodeURIComponent(staleToken)}` } }),
    env: { SESSION_SECRET: secret }, next
  });
  assert.equal(response.status, 302);
  assert.match(response.headers.get('Location') || '', /\/api\/auth\/discord/);

  response = await middleware({
    request: new Request('https://arkawood.pages.dev/moderation-form.js', { headers: { Cookie: `arka_session=${encodeURIComponent(staleToken)}` } }),
    env: { SESSION_SECRET: secret }, next
  });
  assert.equal(response.status, 200);

  response = await middleware({
    request: new Request('https://arkawood.pages.dev/wiki/auditoria-staff.html', { headers: { Cookie: `arka_session=${encodeURIComponent(token)}` } }),
    env: { SESSION_SECRET: secret }, next
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');

  response = await logout({
    request: new Request('https://arkawood.pages.dev/api/auth/logout', {
      method: 'POST',
      headers: { Origin: 'https://arkawood.pages.dev', 'Sec-Fetch-Site': 'same-origin', 'X-CSRF-Token': verified.csrf, Cookie: `arka_session=${encodeURIComponent(token)}` }
    }),
    env: { SESSION_SECRET: secret }
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Set-Cookie') || '', /Max-Age=0/);

  response = await logout({
    request: new Request('https://arkawood.pages.dev/api/auth/logout', {
      method: 'POST',
      headers: { Origin: 'https://arkawood.pages.dev', 'Sec-Fetch-Site': 'same-origin', 'X-CSRF-Token': 'z'.repeat(32), Cookie: `arka_session=${encodeURIComponent(token)}` }
    }),
    env: { SESSION_SECRET: secret }
  });
  assert.equal(response.status, 403);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('Pruebas de seguridad OK: sesión, CSRF, origen, tamaño, D1, webhook, middleware y logout.');

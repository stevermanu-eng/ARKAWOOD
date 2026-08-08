import {
  MEMBER_CHECK_FRESH_MS,
  csrfTokenValid,
  isSameOriginRequest,
  json,
  sessionCheckFresh,
  sessionFromRequest
} from './auth.js';
import {
  applicationWebhookConfigured,
  sendApplicationWebhook
} from './applicationWebhook.js';
import {
  APPLICATIONS_DB_BINDING,
  applicationsDb,
  markApplicationSubmitted,
  releasePendingApplication,
  reserveApplication
} from './applicationStore.js';

export const MAX_APPLICATION_BODY_BYTES = 96 * 1024;
const DAYS = new Set(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']);
const BRANCH_LABEL = Object.freeze({
  moderation: 'Moderación',
  builders: 'Builders',
  marketing: 'Marketing / Management'
});
const BRANCH_FORM = Object.freeze({
  moderation: '/postulacion-moderacion.html',
  builders: '/postulacion-builders.html',
  marketing: '/postulacion-marketing.html'
});

function validEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
}

async function readJsonWithLimit(request, maxBytes) {
  const contentLengthHeader = request.headers.get('Content-Length');
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isFinite(contentLength) || contentLength < 0) {
      return { error: 'invalid_length' };
    }
    if (contentLength > maxBytes) return { error: 'too_large' };
  }

  if (!request.body) return { error: 'invalid_json' };

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
        try { await reader.cancel('payload_too_large'); } catch (_) {}
        return { error: 'too_large' };
      }
      chunks.push(value);
    }
  } catch {
    return { error: 'invalid_json' };
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(body); }
  catch { return { error: 'invalid_json' }; }

  try { return { value: JSON.parse(text) }; }
  catch { return { error: 'invalid_json' }; }
}

function normalizeField(rule, answers, session) {
  if (rule.type === 'discord') {
    if (!session?.sub || !session?.username) return { error: 'La identidad de Discord no es válida.' };
    return { value: `${session.username} · ID ${session.sub}` };
  }

  const raw = answers?.[rule.id];
  if (rule.type === 'days') {
    if (!Array.isArray(raw) || raw.length === 0) return { error: 'Debes seleccionar al menos un día activo.' };
    const days = raw.map((day) => String(day));
    if (days.length > 7 || days.some((day) => !DAYS.has(day)) || new Set(days).size !== days.length) {
      return { error: 'Los días seleccionados no son válidos.' };
    }
    return { value: days };
  }

  if (rule.type === 'number') {
    if (typeof raw !== 'number' && typeof raw !== 'string') return { error: 'El valor numérico no es válido.' };
  } else if (typeof raw !== 'string') {
    return { error: 'Todas las preguntas deben enviarse como texto.' };
  }

  const value = String(raw ?? '').trim();
  if (!value) return { error: 'Todas las preguntas son obligatorias.' };

  if (rule.type === 'email' && !validEmail(value)) return { error: 'El correo electrónico no es válido.' };
  if (rule.type === 'phone' && !/^\d{8,15}$/.test(value)) return { error: 'El teléfono debe contener únicamente entre 8 y 15 números.' };
  if (rule.type === 'minecraft' && !/^[A-Za-z0-9_]{3,16}$/.test(value)) return { error: 'El nick de Minecraft no tiene un formato válido.' };

  if (rule.type === 'number') {
    const number = Number(value);
    if (!Number.isFinite(number)) return { error: 'El valor numérico no es válido.' };
    if (rule.integer && !Number.isInteger(number)) return { error: 'Debes escribir un número entero.' };
    if (rule.minValue !== undefined && number < rule.minValue) return { error: `El valor mínimo permitido es ${rule.minValue}.` };
    if (rule.maxValue !== undefined && number > rule.maxValue) return { error: `El valor máximo permitido es ${rule.maxValue}.` };
  }

  if (rule.min && value.length < rule.min) return { error: `La respuesta debe tener al menos ${rule.min} caracteres.` };
  if (rule.max && value.length > rule.max) return { error: `La respuesta supera el máximo permitido de ${rule.max} caracteres.` };
  return { value };
}

function normalizedAnswers(schema, answers, session) {
  const normalized = Object.create(null);
  const seen = new Set();

  for (const rule of schema) {
    if (!rule?.id || seen.has(rule.id)) throw new Error('Invalid application schema');
    seen.add(rule.id);
    const result = normalizeField(rule, answers, session);
    if (result.error) {
      return {
        error: {
          categoryIndex: Number.isInteger(rule.category) ? rule.category : 0,
          field: rule.id,
          message: result.error
        }
      };
    }
    normalized[rule.id] = result.value;
  }

  return { value: normalized };
}

function consentValid(consent) {
  return consent?.accepted === true
    && consent?.internalReview === true
    && consent?.notPublic === true
    && consent?.interviewIfNeeded === true;
}

export async function submitApplication(context, { branch, schema }) {
  const { request, env } = context;
  const label = BRANCH_LABEL[branch];
  const formPath = BRANCH_FORM[branch];
  if (!label || !formPath || !Array.isArray(schema) || schema.length === 0) {
    console.error('Invalid application endpoint configuration', branch);
    return json({ ok: false, code: 'server_configuration', message: 'El endpoint de postulación no está configurado correctamente.' }, { status: 500 });
  }

  if (!isSameOriginRequest(request)) {
    return json({ ok: false, code: 'cross_site_request', message: 'La solicitud fue rechazada por la protección de origen.' }, { status: 403 });
  }

  const session = await sessionFromRequest(request, env);
  if (!session?.member || !session?.sub) {
    return json({ ok: false, code: 'unauthorized', message: 'Debes iniciar sesión con Discord y pertenecer al servidor de ARKAWOOD.' }, { status: 401 });
  }

  if (!sessionCheckFresh(session, MEMBER_CHECK_FRESH_MS) || !session.csrf) {
    return json({
      ok: false,
      code: 'reauth_required',
      login: `/api/auth/discord?return=${encodeURIComponent(formPath)}`,
      message: 'Tu verificación de sesión necesita renovarse antes de enviar. Tu borrador permanece guardado.'
    }, { status: 401 });
  }

  if (!csrfTokenValid(request, session)) {
    return json({
      ok: false,
      code: 'csrf_invalid',
      message: 'La verificación de seguridad de esta página no coincide con tu sesión. Recarga la página e inténtalo nuevamente.'
    }, { status: 403 });
  }

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return json({ ok: false, code: 'invalid_content_type', message: 'El envío debe usar JSON.' }, { status: 415 });
  }

  const parsed = await readJsonWithLimit(request, MAX_APPLICATION_BODY_BYTES);
  if (parsed.error === 'too_large') {
    return json({ ok: false, code: 'payload_too_large', message: 'La postulación supera el tamaño máximo permitido.' }, { status: 413 });
  }
  if (parsed.error) {
    return json({ ok: false, code: 'invalid_json', message: 'No se pudo leer la postulación.' }, { status: 400 });
  }

  const payload = parsed.value;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return json({ ok: false, code: 'invalid_json', message: 'La estructura de la postulación no es válida.' }, { status: 400 });
  }

  const answers = payload.answers;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return json({ ok: false, code: 'validation_error', categoryIndex: 0, field: null, message: 'No se recibieron las respuestas de la postulación.' }, { status: 400 });
  }

  let normalized;
  try { normalized = normalizedAnswers(schema, answers, session); }
  catch (error) {
    console.error('Application schema validation failed', error instanceof Error ? error.message : error);
    return json({ ok: false, code: 'server_configuration', message: 'No se pudo validar la estructura interna de la postulación.' }, { status: 500 });
  }

  if (normalized.error) {
    return json({ ok: false, code: 'validation_error', ...normalized.error }, { status: 400 });
  }

  if (!consentValid(payload.consent)) {
    return json({
      ok: false,
      code: 'consent_required',
      message: 'Debes aceptar las condiciones de revisión interna y posible entrevista antes de enviar.'
    }, { status: 400 });
  }

  if (!applicationsDb(env)) {
    return json({
      ok: false,
      code: 'database_not_configured',
      message: `El sistema de postulaciones necesita la base D1 ${APPLICATIONS_DB_BINDING} antes de aceptar envíos.`
    }, { status: 503 });
  }

  if (!applicationWebhookConfigured(env, branch)) {
    return json({
      ok: false,
      code: 'webhook_not_configured',
      validated: true,
      message: `La postulación es válida, pero el canal de recepción de ${label} todavía no está configurado en Cloudflare.`
    }, { status: 503 });
  }

  const applicant = {
    discordUserId: String(session.sub),
    username: String(session.username || ''),
    displayName: String(session.displayName || session.username || ''),
    avatar: session.avatar || null,
    startedAt: session.startedAt || null
  };
  const submittedAt = new Date().toISOString();
  const applicationId = crypto.randomUUID();

  let reservation;
  try {
    reservation = await reserveApplication(env, {
      applicationId,
      branch,
      ...applicant,
      submittedAt
    });
  } catch (error) {
    console.error(`${branch} application reservation failed`, error instanceof Error ? error.message : error);
    return json({
      ok: false,
      code: 'database_error',
      message: 'No pudimos reservar tu postulación de forma segura. Inténtalo de nuevo en unos minutos.'
    }, { status: 503 });
  }

  if (!reservation.inserted) {
    return json({
      ok: false,
      code: 'already_submitted',
      applicationId: reservation.existing?.application_id || null,
      submittedAt: reservation.existing?.submitted_at || null,
      branch: reservation.existing?.branch || null,
      message: 'Esta cuenta de Discord ya tiene una postulación registrada. No puedes enviar otra postulación con la misma cuenta.'
    }, { status: 409 });
  }

  let webhookMessage;
  try {
    webhookMessage = await sendApplicationWebhook(env, branch, {
      applicant,
      answers: normalized.value,
      applicationId,
      submittedAt
    });
  } catch (error) {
    console.error(`${branch} webhook delivery failed`, error instanceof Error ? error.message : error);
    try { await releasePendingApplication(env, applicationId); }
    catch (releaseError) {
      console.error(`${branch} pending reservation release failed`, releaseError instanceof Error ? releaseError.message : releaseError);
    }
    return json({
      ok: false,
      code: 'webhook_delivery_failed',
      validated: true,
      message: 'La postulación pasó la validación, pero Discord no confirmó la recepción. Inténtalo nuevamente en unos minutos.'
    }, { status: 502 });
  }

  try {
    await markApplicationSubmitted(env, applicationId, webhookMessage?.id || null);
  } catch (error) {
    // Discord ya confirmó la entrega. No liberamos la reserva porque eso permitiría
    // duplicar una postulación ya recibida. Intentamos finalizar de nuevo en segundo plano.
    console.error(`${branch} application finalization failed after webhook delivery`, error instanceof Error ? error.message : error);
    if (typeof context.waitUntil === 'function') {
      context.waitUntil(
        markApplicationSubmitted(env, applicationId, webhookMessage?.id || null)
          .catch((retryError) => console.error(`${branch} application finalization retry failed`, retryError instanceof Error ? retryError.message : retryError))
      );
    }
  }

  return json({
    ok: true,
    code: 'submitted',
    applicationId,
    submittedAt,
    redirect: `/postulacion-enviada.html?id=${encodeURIComponent(applicationId)}`,
    message: `Postulación enviada correctamente al canal interno de ${label}.`
  }, { status: 201 });
}

export function methodNotAllowed() {
  return json({ ok: false, code: 'method_not_allowed' }, { status: 405, headers: { Allow: 'POST' } });
}

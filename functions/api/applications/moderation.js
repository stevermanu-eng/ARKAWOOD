import { json, sessionFromRequest } from '../../_lib/auth.js';
import { applicationWebhookConfigured, sendModerationApplicationWebhook } from '../../_lib/applicationWebhook.js';
import {
  APPLICATIONS_DB_BINDING,
  applicationsDb,
  markApplicationSubmitted,
  releasePendingApplication,
  reserveApplication
} from '../../_lib/applicationStore.js';

const MAX_BODY_BYTES = 96 * 1024;
const DAYS = new Set(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']);

const schema = [
  { id: 'realName', category: 0, type: 'text', min: 2, max: 80 },
  { id: 'age', category: 0, type: 'number', minValue: 16, maxValue: 80, integer: true },
  { id: 'minecraftNick', category: 0, type: 'minecraft' },
  { id: 'country', category: 0, type: 'text', min: 2, max: 80 },
  { id: 'discordIdentity', category: 0, type: 'discord' },
  { id: 'phone', category: 0, type: 'phone' },
  { id: 'email', category: 0, type: 'email' },

  { id: 'minecraftTime', category: 1, type: 'text', min: 2, max: 1000 },
  { id: 'dailyHours', category: 1, type: 'text', min: 2, max: 1500 },
  { id: 'activeDays', category: 1, type: 'days' },
  { id: 'futureLimits', category: 1, type: 'text', min: 10, max: 5000 },
  { id: 'discordOutsideHours', category: 1, type: 'text', min: 10, max: 5000 },

  { id: 'moderationTools', category: 2, type: 'text', min: 10, max: 5000 },
  { id: 'previousModeration', category: 2, type: 'text', min: 10, max: 5000 },
  { id: 'ticketsKnowledge', category: 2, type: 'text', min: 15, max: 5000 },
  { id: 'recordingAnticheat', category: 2, type: 'text', min: 10, max: 5000 },
  { id: 'lagVsHacks', category: 2, type: 'text', min: 30, max: 5000 },

  { id: 'scenarioInsults', category: 3, type: 'text', min: 30, max: 5000 },
  { id: 'scenarioHacksNoProof', category: 3, type: 'text', min: 30, max: 5000 },
  { id: 'scenarioFriend', category: 3, type: 'text', min: 30, max: 5000 },
  { id: 'scenarioReports', category: 3, type: 'text', min: 30, max: 5000 },
  { id: 'scenarioAppeal', category: 3, type: 'text', min: 30, max: 5000 },

  { id: 'whyArkaWood', category: 4, type: 'text', min: 40, max: 5000 },
  { id: 'qualities', category: 4, type: 'text', min: 30, max: 5000 },
  { id: 'contribution', category: 4, type: 'text', min: 30, max: 5000 },
  { id: 'pressure', category: 4, type: 'text', min: 30, max: 5000 },

  { id: 'additionalSkills', category: 5, type: 'text', min: 5, max: 5000 },
  { id: 'anythingElse', category: 5, type: 'text', min: 5, max: 5000 }
];

function validEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
}

function validateField(rule, answers, session) {
  if (rule.type === 'discord') {
    if (!session?.sub || !session?.username) return 'La identidad de Discord no es válida.';
    return '';
  }

  const raw = answers?.[rule.id];
  if (rule.type === 'days') {
    if (!Array.isArray(raw) || raw.length === 0) return 'Debes seleccionar al menos un día activo.';
    if (raw.length > 7 || raw.some((day) => !DAYS.has(String(day)))) return 'Los días seleccionados no son válidos.';
    return '';
  }

  const value = String(raw ?? '').trim();
  if (!value) return 'Todas las preguntas son obligatorias.';

  if (rule.type === 'email' && !validEmail(value)) return 'El correo electrónico no es válido.';
  if (rule.type === 'phone' && !/^\d{8,15}$/.test(value)) return 'El teléfono debe contener únicamente entre 8 y 15 números.';
  if (rule.type === 'minecraft' && !/^[A-Za-z0-9_]{3,16}$/.test(value)) return 'El nick de Minecraft no tiene un formato válido.';

  if (rule.type === 'number') {
    const number = Number(value);
    if (!Number.isFinite(number)) return 'El valor numérico no es válido.';
    if (rule.integer && !Number.isInteger(number)) return 'Debes escribir un número entero.';
    if (rule.minValue !== undefined && number < rule.minValue) return `El valor mínimo permitido es ${rule.minValue}.`;
    if (rule.maxValue !== undefined && number > rule.maxValue) return `El valor máximo permitido es ${rule.maxValue}.`;
  }

  if (rule.min && value.length < rule.min) return `La respuesta debe tener al menos ${rule.min} caracteres.`;
  if (rule.max && value.length > rule.max) return `La respuesta supera el máximo permitido de ${rule.max} caracteres.`;
  return '';
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const session = await sessionFromRequest(request, env);
  if (!session?.member || !session?.sub) {
    return json({ ok: false, code: 'unauthorized', message: 'Debes iniciar sesión con Discord y pertenecer al servidor de ARKAWOOD.' }, { status: 401 });
  }

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return json({ ok: false, code: 'invalid_content_type', message: 'El envío debe usar JSON.' }, { status: 415 });
  }

  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return json({ ok: false, code: 'payload_too_large', message: 'La postulación supera el tamaño máximo permitido.' }, { status: 413 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, code: 'invalid_json', message: 'No se pudo leer la postulación.' }, { status: 400 });
  }

  const answers = payload?.answers;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return json({ ok: false, code: 'validation_error', categoryIndex: 0, field: null, message: 'No se recibieron las respuestas de la postulación.' }, { status: 400 });
  }

  for (const rule of schema) {
    const error = validateField(rule, answers, session);
    if (error) {
      return json({
        ok: false,
        code: 'validation_error',
        categoryIndex: rule.category,
        field: rule.id,
        message: error
      }, { status: 400 });
    }
  }

  if (payload?.consent?.accepted !== true || payload?.consent?.internalReview !== true || payload?.consent?.notPublic !== true || payload?.consent?.interviewIfNeeded !== true) {
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

  if (!applicationWebhookConfigured(env, 'moderation')) {
    return json({
      ok: false,
      code: 'webhook_not_configured',
      validated: true,
      message: 'La postulación es válida, pero el canal de recepción de Moderación todavía no está configurado en Cloudflare.'
    }, { status: 503 });
  }

  const normalizedApplicant = {
    discordUserId: String(session.sub),
    username: String(session.username || ''),
    displayName: String(session.displayName || session.username || ''),
    avatar: session.avatar || null,
    startedAt: session.startedAt || null
  };
  const normalizedAnswers = { ...answers, discordIdentity: `${normalizedApplicant.username} · ID ${normalizedApplicant.discordUserId}` };
  const submittedAt = new Date().toISOString();
  const applicationId = crypto.randomUUID();

  let reservation;
  try {
    reservation = await reserveApplication(env, {
      applicationId,
      branch: 'moderation',
      ...normalizedApplicant,
      submittedAt
    });
  } catch (error) {
    console.error('Moderation application reservation failed', error instanceof Error ? error.message : error);
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
    webhookMessage = await sendModerationApplicationWebhook(env, {
      applicant: normalizedApplicant,
      answers: normalizedAnswers,
      applicationId,
      submittedAt
    });
  } catch (error) {
    console.error('Moderation webhook delivery failed', error instanceof Error ? error.message : error);
    try { await releasePendingApplication(env, applicationId); } catch (releaseError) {
      console.error('Moderation pending reservation release failed', releaseError instanceof Error ? releaseError.message : releaseError);
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
    // El webhook ya fue confirmado. Conservamos la reserva para impedir un segundo envío
    // y respondemos como éxito; el registro pendiente sigue identificando esta cuenta.
    console.error('Moderation application finalization failed after webhook delivery', error instanceof Error ? error.message : error);
  }

  return json({
    ok: true,
    code: 'submitted',
    applicationId,
    submittedAt,
    redirect: `/postulacion-enviada.html?id=${encodeURIComponent(applicationId)}`,
    message: 'Postulación enviada correctamente al canal interno de Moderación.'
  }, { status: 201 });
}

export function onRequestGet() {
  return json({ ok: false, code: 'method_not_allowed' }, { status: 405, headers: { Allow: 'POST' } });
}

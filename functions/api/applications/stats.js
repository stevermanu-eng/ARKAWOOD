import { json } from '../../_lib/auth.js';
import { applicationStats } from '../../_lib/applicationStore.js';

export async function onRequestGet(context) {
  try {
    const stats = await applicationStats(context.env);
    return json({ ok: true, ...stats });
  } catch (error) {
    console.error('Application stats failed', error instanceof Error ? error.message : error);
    return json({ ok: false, configured: true, code: 'stats_failed', message: 'No se pudo consultar el total de postulaciones.' }, { status: 500 });
  }
}

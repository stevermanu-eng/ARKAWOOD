import { json, sessionFromRequest } from '../../_lib/auth.js';
import { APPLICATIONS_DB_BINDING, applicationsDb, findApplicationByDiscordId } from '../../_lib/applicationStore.js';

export async function onRequestGet(context) {
  const session = await sessionFromRequest(context.request, context.env);
  if (!session?.sub) {
    return json({ ok: false, authenticated: false, hasApplication: false }, { status: 401 });
  }

  if (!applicationsDb(context.env)) {
    return json({
      ok: false,
      authenticated: true,
      configured: false,
      code: 'database_not_configured',
      message: `Falta enlazar la base D1 con el nombre ${APPLICATIONS_DB_BINDING}.`
    }, { status: 503 });
  }

  const application = await findApplicationByDiscordId(context.env, session.sub);
  return json({
    ok: true,
    authenticated: true,
    configured: true,
    hasApplication: Boolean(application),
    application: application ? {
      applicationId: application.application_id,
      branch: application.branch,
      submittedAt: application.submitted_at,
      status: application.status
    } : null
  });
}

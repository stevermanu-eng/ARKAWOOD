import { json, sessionFromRequest } from '../../_lib/auth.js';

export async function onRequestGet(context) {
  const session = await sessionFromRequest(context.request, context.env);
  if (!session) return json({ authenticated: false, member: false, user: null });

  return json({
    authenticated: true,
    member: Boolean(session.member),
    staffAuditAccess: Boolean(session.auditStaff),
    user: {
      id: session.sub,
      username: session.username,
      displayName: session.displayName,
      avatar: session.avatar,
      startedAt: session.startedAt
    }
  });
}

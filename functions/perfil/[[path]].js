function assetUrl(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  url.search = '';
  url.hash = '';
  return url;
}

function pathSegments(params) {
  const raw = params?.path;
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (raw == null || raw === '') return [];
  return String(raw).split('/').filter(Boolean);
}

function validDiscordId(value) {
  return /^\d{5,24}$/.test(String(value || ''));
}

async function serveShell(context, pathname, head = false) {
  const response = await context.env.ASSETS.fetch(assetUrl(context.request, pathname));
  if (!head) return response;
  return new Response(null, { status: response.status, statusText: response.statusText, headers: response.headers });
}

async function route(context, head = false) {
  const parts = pathSegments(context.params);
  if (!parts.length) return serveShell(context, '/perfil/', head);
  if (parts.length === 1 && parts[0].toLowerCase() === 'editar') return serveShell(context, '/perfil/editar/', head);
  if (parts.length === 1 && validDiscordId(parts[0])) return serveShell(context, '/perfil/', head);
  return new Response(head ? null : 'Perfil no válido', { status: 404 });
}

export function onRequestGet(context) { return route(context, false); }
export function onRequestHead(context) { return route(context, true); }

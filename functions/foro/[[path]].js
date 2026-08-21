function forumShellUrl(request) {
  const url = new URL(request.url);
  url.pathname = '/foro/';
  url.search = '';
  url.hash = '';
  return url;
}

export async function onRequestGet(context) {
  return context.env.ASSETS.fetch(forumShellUrl(context.request));
}

export async function onRequestHead(context) {
  const response = await context.env.ASSETS.fetch(forumShellUrl(context.request));
  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

import { execFileSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set(['.git', '.wrangler', 'dist', 'node_modules']);
const dynamicPrefixes = ['/api/'];
const redirectPaths = new Set(['/discord', '/discord/', '/support', '/support/']);
const errors = [];

const EXPECTED_NAV = ['HOME', 'FOROS', 'WIKI', 'MIEMBROS', 'SANCIONES', 'TIENDA', 'SOPORTE', 'POSTULACIONES'];
const footerVariants = new Map();

function normalizeMarkup(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function textFromMarkup(value) {
  return normalizeMarkup(String(value || '').replace(/<[^>]*>/g, ' '));
}

function expectedActiveNav(name) {
  if (name === 'index.html' || name === 'construccion.html') return 'HOME';
  if (name.startsWith('wiki/') || ['politica-privacidad.html', 'terminos-network.html', 'terminos-compra.html'].includes(name)) return 'WIKI';
  return 'POSTULACIONES';
}

function questionIds(source) {
  return [...source.matchAll(/(?:\bid\s*:\s*['\"]([^'\"]+)['\"]|['\"]id['\"]\s*:\s*['\"]([^'\"]+)['\"])/g)]
    .map((match) => match[1] || match[2]);
}

function constArraySlice(source, constName) {
  const startToken = `const ${constName} = [`;
  const start = source.indexOf(startToken);
  if (start < 0) return '';
  const end = source.indexOf('\n];', start);
  return end < 0 ? '' : source.slice(start, end + 3);
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

function projectPath(file) {
  return relative(root, file).replaceAll('\\', '/');
}

async function exists(file) {
  try { return (await stat(file)).isFile(); } catch { return false; }
}

function localTarget(raw) {
  if (!raw || raw.startsWith('#') || raw.startsWith('%') || raw.startsWith('data:') || raw.startsWith('mailto:') || raw.startsWith('tel:')) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//')) return null;
  const clean = raw.split('#', 1)[0].split('?', 1)[0];
  if (!clean) return null;
  return clean;
}

async function resolvePublicReference(fromFile, target) {
  if (redirectPaths.has(target) || dynamicPrefixes.some((prefix) => target.startsWith(prefix))) return true;

  let candidate;
  if (target.startsWith('/')) candidate = resolve(root, `.${target}`);
  else candidate = resolve(fromFile, '..', target);

  if (target.endsWith('/')) candidate = join(candidate, 'index.html');
  if (await exists(candidate)) return true;
  if (!extname(candidate) && await exists(`${candidate}.html`)) return true;
  return false;
}

const files = await walk(root);

for (const file of files) {
  const name = projectPath(file);
  const lower = name.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.txt') || /(^|\/)readm[ey](\.|$)/i.test(name)) {
    errors.push(`${name}: archivo de documentación prohibido por la entrega.`);
  }
}

for (const file of files.filter((item) => ['.js', '.mjs'].includes(extname(item)))) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    errors.push(`${projectPath(file)}: JavaScript inválido. ${String(error.stderr || error.message).trim()}`);
  }
}

for (const file of files.filter((item) => extname(item) === '.html')) {
  const html = await readFile(file, 'utf8');
  const name = projectPath(file);

  const navMatch = html.match(/<nav\b[^>]*class="[^"]*\bnav\b[^"]*"[^>]*>([\s\S]*?)<\/nav>/i);
  if (!navMatch) {
    errors.push(`${name}: falta la navegación principal.`);
  } else {
    const labels = [...navMatch[1].matchAll(/<(?:a|button)\b[^>]*>([\s\S]*?)<\/(?:a|button)>/gi)].map((match) => textFromMarkup(match[1]));
    if (JSON.stringify(labels) !== JSON.stringify(EXPECTED_NAV)) errors.push(`${name}: el orden del encabezado no coincide con la navegación canónica.`);
    const activeMatch = navMatch[1].match(/<(?:a|button)\b[^>]*class="[^"]*nav__item--active[^"]*"[^>]*>([\s\S]*?)<\/(?:a|button)>/i);
    const active = activeMatch ? textFromMarkup(activeMatch[1]) : '';
    if (active !== expectedActiveNav(name)) errors.push(`${name}: la sección activa debería ser ${expectedActiveNav(name)} y es ${active || 'ninguna'}.`);
  }

  const footerMatch = html.match(/<footer\b[^>]*class="[^"]*\bfooter\b[^"]*"[^>]*>([\s\S]*?)<\/footer>/i);
  if (!footerMatch) errors.push(`${name}: falta el footer compartido.`);
  else footerVariants.set(name, normalizeMarkup(footerMatch[0]));

  if (/\son[a-z]+\s*=/i.test(html)) errors.push(`${name}: contiene un manejador inline on*= incompatible con la CSP.`);
  if (/<script(?![^>]*\bsrc=)[^>]*>\s*\S/i.test(html)) errors.push(`${name}: contiene JavaScript inline.`);

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${name}: id duplicado "${id}".`);
    seen.add(id);
  }

  for (const match of html.matchAll(/<(?:script|img|link|a)\b[^>]*?\b(?:src|href)="([^"]+)"[^>]*>/gi)) {
    const target = localTarget(match[1]);
    if (!target) continue;
    if (!await resolvePublicReference(file, target)) errors.push(`${name}: referencia local inexistente ${match[1]}`);
  }

  for (const match of html.matchAll(/<script\b([^>]*)\bsrc="[^"]+"([^>]*)>/gi)) {
    const attrs = `${match[1]} ${match[2]}`;
    if (!/\b(?:defer|async)\b/i.test(attrs)) errors.push(`${name}: script externo sin defer/async.`);
  }

  for (const match of html.matchAll(/<a\b([^>]*)\btarget="_blank"([^>]*)>/gi)) {
    const attrs = `${match[1]} ${match[2]}`;
    if (!/\brel="[^"]*noopener[^"]*"/i.test(attrs)) errors.push(`${name}: enlace target=_blank sin rel=noopener.`);
  }
}

for (const file of files.filter((item) => extname(item) === '.css')) {
  const css = await readFile(file, 'utf8');
  const name = projectPath(file);
  for (const match of css.matchAll(/url\((['"]?)([^)'"\s]+)\1\)/gi)) {
    const target = localTarget(match[2]);
    if (!target) continue;
    if (!await resolvePublicReference(file, target)) errors.push(`${name}: recurso CSS inexistente ${match[2]}`);
  }
}


if (new Set(footerVariants.values()).size > 1) {
  errors.push('Los HTML no comparten exactamente el mismo footer canónico.');
}

const branchFiles = {
  moderation: { client: 'moderation-form.js', endpoint: 'functions/api/applications/moderation.js', webhook: 'MODERATION_QUESTIONS' },
  builders: { client: 'builders-form.js', endpoint: 'functions/api/applications/builders.js', webhook: 'BUILDERS_QUESTIONS' },
  marketing: { client: 'marketing-form.js', endpoint: 'functions/api/applications/marketing.js', webhook: 'MARKETING_QUESTIONS' }
};
const webhookSource = await readFile(join(root, 'functions/_lib/applicationWebhook.js'), 'utf8');
for (const [branch, config] of Object.entries(branchFiles)) {
  const clientSource = await readFile(join(root, config.client), 'utf8');
  const endpointSource = await readFile(join(root, config.endpoint), 'utf8');
  const clientIds = questionIds(clientSource);
  const endpointIds = questionIds(endpointSource);
  const webhookIds = questionIds(constArraySlice(webhookSource, config.webhook));
  const canonical = JSON.stringify(clientIds);
  if (clientIds.length !== 28) errors.push(`${config.client}: se esperaban 28 preguntas y se encontraron ${clientIds.length}.`);
  if (JSON.stringify(endpointIds) !== canonical) errors.push(`${branch}: los IDs del formulario y la validación del servidor no coinciden.`);
  if (JSON.stringify(webhookIds) !== canonical) errors.push(`${branch}: los IDs del formulario y del webhook no coinciden.`);
}

if (errors.length) {
  console.error(`Comprobación fallida (${errors.length} problema${errors.length === 1 ? '' : 's'}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Comprobación OK: ${files.length} archivos revisados sin referencias rotas ni patrones inseguros detectados.`);

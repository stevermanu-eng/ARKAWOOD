// Catálogo operativo de roles de Discord para perfiles y permisos web.
// Los colores son únicamente acentos visuales de la web; la fuente maestra
// mantiene los colores oficiales de los nuevos rangos como pendientes.
const STAFF_ACCENT = ['#8B6F47', '#D4A63A'];

const ROLE_DEFINITIONS = [
  // Propiedad / dirección general.
  { id: '1538302102495825931', key: 'DEIDAD', label: 'DEIDAD', colors: STAFF_ACCENT, publishAll: true, pin: true, forumModeration: true },
  { id: '1531524803435958353', key: 'CO_OWNER', label: 'CO-OWNER', colors: STAFF_ACCENT, publishAll: true, pin: true, forumModeration: true },
  { id: '1538302100524761268', key: 'ADMINISTRADOR_GENERAL', label: 'ADMINISTRADOR GENERAL', colors: STAFF_ACCENT, publishAll: true, pin: true, forumModeration: true },

  // Moderación — LEGIÓN DEL JUICIO (de mayor a menor autoridad para el rango primario).
  { id: '1538302076541477028', key: 'SERAFIN', label: 'SERAFÍN', colors: STAFF_ACCENT, publishAll: true, pin: true, forumModeration: true },
  { id: '1538302074654294138', key: 'QUERUBIN', label: 'QUERUBÍN', colors: STAFF_ACCENT, publishAll: true, pin: true, forumModeration: true },
  { id: '1538302072578113658', key: 'OFAN', label: 'OFÁN', colors: STAFF_ACCENT, forumModeration: true },
  { id: '1538302070572974151', key: 'ORACLE', label: 'ORACLE', colors: STAFF_ACCENT, forumModeration: true },
  { id: '1538302067414925343', key: 'LUMEN', label: 'LUMEN', colors: STAFF_ACCENT, forumModeration: true },
  { id: '1538302065724366859', key: 'ELYON', label: 'ELYON', colors: STAFF_ACCENT, forumModeration: true },
  { id: '1538302063732068413', key: 'MALVEN', label: 'MALVEN', colors: STAFF_ACCENT },
  { id: '1538302061912002681', key: 'VORIEN', label: 'VORIEN', colors: STAFF_ACCENT },
  { id: '1538302060112515124', key: 'SABLE', label: 'SABLE', colors: STAFF_ACCENT },
  { id: '1538302058535321730', key: 'INVAR', label: 'INVAR', colors: STAFF_ACCENT },
  { id: '1538302056937291826', key: 'VEXEN', label: 'VEXEN', colors: STAFF_ACCENT },
  { id: '1538302055301783642', key: 'NEMIS', label: 'NEMIS', colors: STAFF_ACCENT },
  { id: '1538302053401497651', key: 'ZELUM', label: 'ZELUM', colors: STAFF_ACCENT },

  // Builders — FORJA DEL EDÉN.
  { id: '1538302085244653660', key: 'GENESIS', label: 'GÉNESIS', colors: STAFF_ACCENT },
  { id: '1538302083181187102', key: 'AK', label: 'AK', colors: STAFF_ACCENT },
  { id: '1538302081536888892', key: 'SENIOR_BUILDER', label: 'SENIOR BUILDER', colors: STAFF_ACCENT },
  { id: '1538302079825874944', key: 'BUILDER_PLUS', label: 'BUILDER+', colors: STAFF_ACCENT },
  { id: '1538302078232039484', key: 'BUILDER', label: 'BUILDER', colors: STAFF_ACCENT },

  // Administración — CÓNCLAVE DEL NEXO (ADMINISTRADOR GENERAL, CO-OWNER y DEIDAD ya aparecen arriba).
  { id: '1538302098427351131', key: 'ADMINISTRADOR', label: 'ADMINISTRADOR', colors: STAFF_ACCENT },
  { id: '1538302095873282198', key: 'COORDINADOR', label: 'COORDINADOR', colors: STAFF_ACCENT },
  { id: '1538302094254153779', key: 'DEVELOPER', label: 'DEVELOPER', colors: STAFF_ACCENT },
  { id: '1538302090890313748', key: 'JEFE_DE_MODALIDAD', label: 'JEFE DE MODALIDAD', colors: STAFF_ACCENT },

  // Partners — ATRIO DE LOS PACTOS.
  { id: '1538302108430762085', key: 'INVERSIONISTA', label: 'INVERSIONISTA', colors: STAFF_ACCENT },
  { id: '1538302106778345543', key: 'PARTNER', label: 'PARTNER', colors: STAFF_ACCENT },
  { id: '1538302105356337308', key: 'COLABORADOR', label: 'COLABORADOR', colors: STAFF_ACCENT },

  // Marketing — EQUIPO DE DIFUSIÓN.
  { id: '1538302121458401363', key: 'JEFE_MARKETING', label: 'JEFE MARKETING', colors: STAFF_ACCENT },
  { id: '1538302119537549483', key: 'COMMUNITY_MANAGER', label: 'COMMUNITY MANAGER', colors: STAFF_ACCENT },
  { id: '1538302117482340372', key: 'CONTENT_CREATOR', label: 'CONTENT CREATOR', colors: STAFF_ACCENT },
  { id: '1538302113552007209', key: 'MARKETING', label: 'MARKETING', colors: STAFF_ACCENT },
  { id: '1538302111857512499', key: 'INFLUENCER', label: 'INFLUENCER', colors: STAFF_ACCENT },
  { id: '1536222273412014180', key: 'STREAMER', label: 'STREAMER', colors: STAFF_ACCENT },
  { id: '1538302110330789948', key: 'CREADOR', label: 'CREADOR', colors: STAFF_ACCENT },

  // Rangos de donación/perfil, ajenos a la jerarquía de staff.
  { id: '1532907784977387650', key: 'TOP_DONADOR', label: 'TOP DONADOR', colors: ['#D4A63A', '#FAE7AC', '#D4A63A'], light: true },
  { id: '1532511214964572190', key: 'IMPERIUM', label: 'IMPERIUM', colors: ['#6F5420', '#F4D57E'], light: true },
  { id: '1532511213173342208', key: 'EUPHRATES', label: 'EUPHRATES', colors: ['#8B6D1D', '#D9C16C'], light: true },
  { id: '1532907682984628317', key: 'DONADOR', label: 'DONADOR', colors: ['#8F6B2C', '#D4A63A'] },
  { id: '1532511211428646992', key: 'APOLLYON', label: 'APOLLYON', colors: ['#4A1F70', '#B45AD6'] },
  { id: '1532511209620897894', key: 'ECLIPSE', label: 'ECLIPSE', colors: ['#5B1828', '#D05C5C'] },
  { id: '1532511207779467436', key: 'AJENJO', label: 'AJENJO', colors: ['#7F7420', '#D4B94A'] },
  { id: '1532511205107699943', key: 'MAREA', label: 'MAREA', colors: ['#2D6F91', '#75D5E8'], light: true },
  { id: '1532511203342159892', key: 'IGNIS', label: 'IGNIS', colors: ['#C65F2B', '#F2B05F'], light: true }
];

const ROLE_BY_ID = new Map(ROLE_DEFINITIONS.map((role, index) => [role.id, { ...role, order: index }]));
const DEIDAD_ROLE_ID = '1538302102495825931';
const SPECIAL_OWNER_IDS = new Set([
  '1290118757888294912',
  '984129773179646003',
  '1052673571429810186'
]);

const SPECIAL_PROFILE_IDENTITIES = new Map([
  ['1290118757888294912', { id: 'identity:deidad-arbol-sagrado', key: 'DEIDAD_ARBOL_SAGRADO', label: '✧ DEIDAD DEL ÁRBOL SAGRADO ✧', colors: ['#2E6F4A', '#8DDC8D'], light: false, order: 1 }],
  ['984129773179646003', { id: 'identity:deidad-suprema', key: 'DEIDAD_SUPREMA', label: '✦ DEIDAD SUPREMA ✦', colors: ['#BC9135', '#FFE7B0'], light: true, order: 1 }],
  ['1052673571429810186', { id: 'identity:deidad-inframundo', key: 'DEIDAD_INFRAMUNDO', label: '✠ DEIDAD DEL INFRAMUNDO ✠', colors: ['#52120E', '#D95E4B'], light: false, order: 1 }]
]);

// Las tres identidades de propiedad muestran siempre DEIDAD + su identidad personal.
const FIXED_ROLE_ONLY_IDS = new Set(SPECIAL_OWNER_IDS);

function specialVisibleRoles(userId) {
  const id = String(userId || '');
  const identity = SPECIAL_PROFILE_IDENTITIES.get(id);
  const deidad = ROLE_BY_ID.get(DEIDAD_ROLE_ID);
  if (!identity || !deidad) return null;
  return [
    { ...deidad, order: 0 },
    { ...identity, order: 1 }
  ];
}

function publicRole(role) {
  return {
    id: role.id,
    key: role.key,
    label: role.label,
    colors: [...role.colors],
    light: Boolean(role.light),
    order: Number(role.order || 0),
    identity: String(role.id).startsWith('identity:')
  };
}

export function knownRoleIds() {
  return new Set(ROLE_DEFINITIONS.map((role) => role.id));
}

export function rolesForDiscordIds(discordUserId, roleIds) {
  const userId = String(discordUserId || '');
  const special = specialVisibleRoles(userId);
  if (special && FIXED_ROLE_ONLY_IDS.has(userId)) return special.map(publicRole);

  const found = [];
  const effectiveRoleIds = Array.isArray(roleIds) ? roleIds.map(String) : [];
  const seen = new Set();
  for (const id of effectiveRoleIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const role = ROLE_BY_ID.get(id);
    if (role) found.push(publicRole(role));
  }

  return found.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'es'));
}

export function visibleRolesForProfile(discordUserId, allRoles, storedVisibleRoles) {
  const userId = String(discordUserId || '');
  const fixed = specialVisibleRoles(userId);
  if (fixed) return fixed.map(publicRole);

  const available = Array.isArray(allRoles) ? allRoles.filter((role) => role && typeof role === 'object') : [];
  const byId = new Map(available.map((role) => [String(role.id || ''), role]));
  const requested = parseRoleBadges(storedVisibleRoles).map((role) => String(role?.id || '')).filter(Boolean);
  const selected = [];
  const seen = new Set();
  for (const id of requested) {
    if (seen.has(id) || !byId.has(id)) continue;
    seen.add(id);
    selected.push(byId.get(id));
    if (selected.length === 2) break;
  }
  for (const role of available) {
    const id = String(role?.id || '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    selected.push(role);
    if (selected.length === 2) break;
  }
  return selected.slice(0, 2).map((role) => ({ ...role }));
}

export function visibleRolesFromIds(discordUserId, allRoles, requestedIds) {
  const userId = String(discordUserId || '');
  const fixed = specialVisibleRoles(userId);
  if (fixed) return fixed.map(publicRole);
  const available = Array.isArray(allRoles) ? allRoles.filter((role) => role && typeof role === 'object') : [];
  const byId = new Map(available.map((role) => [String(role.id || ''), role]));
  const ids = Array.isArray(requestedIds) ? requestedIds.map(String).filter(Boolean) : [];
  if (ids.length > 2) return null;
  const selected = [];
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id) || !byId.has(id)) return null;
    seen.add(id);
    selected.push({ ...byId.get(id) });
  }
  return visibleRolesForProfile(discordUserId, available, selected);
}

export function primaryRoleFor(discordUserId, roleIds) {
  const roles = rolesForDiscordIds(discordUserId, roleIds).filter((role) => !role.identity);
  return roles[0]?.label || 'MIEMBRO';
}

export function forumRolePermissions(discordUserId, roleIds) {
  const id = String(discordUserId || '');
  const ids = new Set(Array.isArray(roleIds) ? roleIds.map(String) : []);
  if (SPECIAL_OWNER_IDS.has(id)) ids.add(DEIDAD_ROLE_ID);
  const roles = [...ids].map((roleId) => ROLE_BY_ID.get(roleId)).filter(Boolean);
  const publishAll = roles.some((role) => role.publishAll);
  const pin = roles.some((role) => role.pin);
  const moderate = roles.some((role) => role.forumModeration);
  return {
    publishAll,
    pin,
    close: moderate,
    deleteThread: moderate,
    moderateReplies: moderate,
    editAnyThread: moderate
  };
}

export function serializeRoleBadges(discordUserId, roleIds) {
  return JSON.stringify(rolesForDiscordIds(discordUserId, roleIds));
}

export function parseRoleBadges(value) {
  if (Array.isArray(value)) return value.filter(Boolean).slice(0, 256);
  try {
    const parsed = JSON.parse(String(value || '[]'));
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object').slice(0, 256) : [];
  } catch {
    return [];
  }
}

export { ROLE_DEFINITIONS };

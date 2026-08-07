const BRANCH_WEBHOOK_ENV = Object.freeze({
  moderation: 'DISCORD_WEBHOOK_MODERATION',
  builders: 'DISCORD_WEBHOOK_BUILDERS',
  marketing: 'DISCORD_WEBHOOK_MARKETING'
});

const DISCORD_EMBED_TOTAL_LIMIT = 6000;
const FIELD_VALUE_LIMIT = 1024;
const CATEGORY_TARGET_LIMIT = 820;

const MODERATION_QUESTIONS = [
  { number: 1, id: 'realName', short: 'Nombre', full: '¿Cuál es tu nombre? (o nombre real que uses habitualmente)', category: 0 },
  { number: 2, id: 'age', short: 'Edad', full: '¿Qué edad tienes?', category: 0 },
  { number: 3, id: 'minecraftNick', short: 'Nick de Minecraft', full: '¿Cuál es tu nick de Minecraft?', category: 0 },
  { number: 4, id: 'country', short: 'País', full: '¿En qué país te encuentras?', category: 0 },
  { number: 5, id: 'discordIdentity', short: 'Discord + ID', full: '¿Cuál es tu usuario de Discord? Incluye tu ID.', category: 0 },
  { number: 6, id: 'phone', short: 'Teléfono', full: '¿Cuál es tu número de teléfono?', category: 0 },
  { number: 7, id: 'email', short: 'Correo', full: '¿Cuál es tu correo electrónico personal?', category: 0 },
  { number: 8, id: 'minecraftTime', short: 'Tiempo jugando Minecraft', full: '¿Hace cuánto juegas Minecraft?', category: 1 },
  { number: 9, id: 'dailyHours', short: 'Horas diarias', full: '¿Cuántas horas diarias puedes dedicar a labores de moderación?', category: 1 },
  { number: 10, id: 'activeDays', short: 'Días activos', full: '¿Qué días de la semana sueles estar más activo?', category: 1 },
  { number: 11, id: 'futureLimits', short: 'Limitaciones de disponibilidad', full: '¿Tienes alguna actividad, como estudios o trabajo, que pueda limitar tu disponibilidad en el futuro cercano?', category: 1 },
  { number: 12, id: 'discordOutsideHours', short: 'Discord fuera del turno', full: '¿Estás dispuesto a mantenerte activo en Discord incluso fuera de tus horas de moderación para las coordinaciones del equipo?', category: 1 },
  { number: 13, id: 'moderationTools', short: 'Plugins/comandos', full: '¿Has usado plugins o comandos de moderación anteriormente, como kick, mute, ban, freeze o vanish? ¿Cuáles?', category: 2 },
  { number: 14, id: 'previousModeration', short: 'Experiencia previa', full: '¿Has sido miembro de moderación en otros servidores/lugares? ¿Cuánto tiempo estuviste ahí?', category: 2 },
  { number: 15, id: 'ticketsKnowledge', short: 'Tickets/reportes', full: '¿Sabes qué es y cómo funciona un sistema de tickets o reportes en Discord?', category: 2 },
  { number: 16, id: 'recordingAnticheat', short: 'Grabación/anti-cheat', full: '¿Tienes experiencia usando programas de grabación o herramientas anti-cheat para detección?', category: 2 },
  { number: 17, id: 'lagVsHacks', short: 'Lag vs hacks', full: '¿Sabes diferenciar entre un jugador con lag y un jugador que usa hacks? Explícanos.', category: 2 },
  { number: 18, id: 'scenarioInsults', short: 'Insultos tras sanción', full: 'Un jugador te insulta repetidamente en el chat luego de una sanción. ¿Cómo actúas?', category: 3 },
  { number: 19, id: 'scenarioHacksNoProof', short: 'Hacks sin pruebas', full: 'Sospechas que un jugador usa hacks, pero no tienes pruebas contundentes. ¿Qué haces?', category: 3 },
  { number: 20, id: 'scenarioFriend', short: 'Amigo comete falta grave', full: 'Un amigo cercano tuyo dentro del servidor comete una falta grave. ¿Lo sancionas igual que a cualquier otro jugador?', category: 3 },
  { number: 21, id: 'scenarioReports', short: 'Múltiples reportes', full: 'Recibes múltiples reportes al mismo tiempo y no puedes atenderlos todos de inmediato. ¿Cómo los priorizas?', category: 3 },
  { number: 22, id: 'scenarioAppeal', short: 'Apelación propia', full: 'Un usuario apela una sanción que tú mismo aplicaste y crees que tenía razón parcialmente. ¿Qué haces?', category: 3 },
  { number: 23, id: 'whyArkaWood', short: 'Por qué ARKAWOOD', full: '¿Por qué te gustaría formar parte del staff de ARKAWOOD y no de otra network? Teniendo en cuenta que es un proyecto en desarrollo.', category: 4 },
  { number: 24, id: 'qualities', short: 'Cualidades personales', full: '¿Qué cualidades personales crees que te hacen un buen candidato para moderar?', category: 4 },
  { number: 25, id: 'contribution', short: 'Aporte al proyecto', full: '¿Qué podrías aportar a ARKAWOOD NETWORK si tuvieras la oportunidad?', category: 4 },
  { number: 26, id: 'pressure', short: 'Decisiones impopulares', full: '¿Cómo manejarías la presión de tomar decisiones impopulares dentro de la comunidad?', category: 4 },
  { number: 27, id: 'additionalSkills', short: 'Habilidades adicionales', full: '¿Tienes alguna habilidad adicional que pueda ser útil para el staff, como diseño, desarrollo, redes sociales o edición de video?', category: 5 },
  { number: 28, id: 'anythingElse', short: 'Algo más sobre ti', full: '¿Hay algo más que quieras contarnos sobre ti antes de que evaluemos tu postulación?', category: 5 }
];

const CATEGORY_NAMES = [
  '1 · Datos generales',
  '2 · Disponibilidad y compromiso',
  '3 · Conocimientos técnicos',
  '4 · Situaciones y criterio',
  '5 · Motivación y visión personal',
  '6 · Preguntas adicionales'
];

function cleanText(value) {
  if (Array.isArray(value)) value = value.join(', ');
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/`/g, '′')
    .replace(/\r\n?/g, '\n')
    .trim();
}

function truncate(value, max) {
  const text = cleanText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function formatIso(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function branchWebhookUrl(env, branch) {
  const envName = BRANCH_WEBHOOK_ENV[branch];
  if (!envName) throw new Error(`Unsupported application branch: ${branch}`);
  const raw = String(env?.[envName] || '').trim();
  if (!raw) throw new Error(`${envName} is not configured`);

  let url;
  try { url = new URL(raw); } catch { throw new Error(`${envName} is not a valid URL`); }
  const acceptedHosts = new Set(['discord.com', 'www.discord.com', 'discordapp.com', 'canary.discord.com', 'ptb.discord.com']);
  if (url.protocol !== 'https:' || !acceptedHosts.has(url.hostname) || !url.pathname.startsWith('/api/webhooks/')) {
    throw new Error(`${envName} must be a Discord HTTPS webhook URL`);
  }
  url.searchParams.set('wait', 'true');
  return url.toString();
}

function compactCategoryField(categoryIndex, answers) {
  const questions = MODERATION_QUESTIONS.filter((question) => question.category === categoryIndex);
  const labelsLength = questions.reduce((sum, question) => sum + `**${question.number}. ${question.short}**\n`.length + 2, 0);
  const answerBudget = Math.max(58, Math.floor((CATEGORY_TARGET_LIMIT - labelsLength) / questions.length));

  let value = questions.map((question) => {
    const answer = truncate(answers[question.id], answerBudget) || '—';
    return `**${question.number}. ${question.short}**\n${answer}`;
  }).join('\n\n');

  if (value.length > FIELD_VALUE_LIMIT) value = truncate(value, FIELD_VALUE_LIMIT);
  return { name: CATEGORY_NAMES[categoryIndex], value, inline: false };
}

function embedTextLength(embed) {
  return [embed.title, embed.description, embed.footer?.text, embed.author?.name]
    .filter(Boolean)
    .reduce((sum, part) => sum + part.length, 0) +
    (embed.fields || []).reduce((sum, field) => sum + field.name.length + field.value.length, 0);
}

function buildModerationEmbed({ applicant, answers, applicationId, submittedAt }) {
  const fields = Array.from({ length: 6 }, (_, index) => compactCategoryField(index, answers));
  fields.unshift({
    name: 'Postulante verificado',
    value: [
      `**Discord:** ${truncate(applicant.username, 80)} · \`${truncate(applicant.discordUserId, 30)}\``,
      `**Nombre visible:** ${truncate(applicant.displayName, 80)}`,
      `**Inicio:** ${truncate(applicant.startedAt || 'No disponible', 64)}`,
      `**ID de postulación:** \`${applicationId}\``
    ].join('\n'),
    inline: false
  });

  const embed = {
    title: '🛡️ Nueva postulación · Moderación',
    description: 'Las **28 preguntas** aparecen dentro de este único embed. Discord limita el tamaño de los embeds; si una respuesta extensa fue recortada visualmente, el archivo adjunto del mismo envío conserva la postulación íntegra.',
    color: 0xD99B35,
    fields,
    footer: { text: 'ARKA WOOD · Postulaciones internas · No publicar' },
    timestamp: submittedAt
  };

  // Defensive guard against Discord's 6000-character total embed limit.
  if (embedTextLength(embed) > DISCORD_EMBED_TOTAL_LIMIT) {
    for (let index = embed.fields.length - 1; index >= 1 && embedTextLength(embed) > 5850; index -= 1) {
      embed.fields[index].value = truncate(embed.fields[index].value, Math.max(300, embed.fields[index].value.length - 120));
    }
  }
  return embed;
}

function buildModerationAttachment({ applicant, answers, applicationId, submittedAt }) {
  const lines = [
    'ARKA WOOD — POSTULACIÓN STAFF · MODERACIÓN',
    `ID de postulación: ${applicationId}`,
    `Enviada: ${submittedAt}`,
    `Discord User ID: ${applicant.discordUserId}`,
    `Usuario: ${applicant.username}`,
    `Nombre visible: ${applicant.displayName}`,
    `Inicio del proceso: ${applicant.startedAt || 'No disponible'}`,
    '',
    'RESPUESTAS COMPLETAS',
    '===================='
  ];

  for (let category = 0; category < 6; category += 1) {
    lines.push('', CATEGORY_NAMES[category].toUpperCase(), '-'.repeat(54));
    for (const question of MODERATION_QUESTIONS.filter((item) => item.category === category)) {
      lines.push(`${question.number}. ${question.full}`, cleanText(answers[question.id]) || '—', '');
    }
  }

  lines.push(
    'CONSENTIMIENTO',
    '-------------',
    'El postulante aceptó la revisión interna de sus datos y respuestas, su no publicación pública como parte del proceso y la posibilidad de una entrevista o revisión adicional si ARKAWOOD lo considera necesario.'
  );
  return lines.join('\n');
}

export function applicationWebhookConfigured(env, branch) {
  const envName = BRANCH_WEBHOOK_ENV[branch];
  return Boolean(envName && String(env?.[envName] || '').trim());
}

export async function sendModerationApplicationWebhook(env, { applicant, answers, applicationId, submittedAt }) {
  const webhookUrl = branchWebhookUrl(env, 'moderation');
  const embed = buildModerationEmbed({ applicant, answers, applicationId, submittedAt });
  const attachmentText = buildModerationAttachment({ applicant, answers, applicationId, submittedAt });

  const payload = {
    username: 'ARKA WOOD · Postulaciones',
    allowed_mentions: { parse: [] },
    embeds: [embed],
    attachments: [{ id: 0, filename: `postulacion-moderacion-${applicationId}.txt`, description: 'Respuestas completas de la postulación' }]
  };

  const form = new FormData();
  form.set('payload_json', JSON.stringify(payload));
  form.set('files[0]', new Blob([attachmentText], { type: 'text/plain;charset=utf-8' }), `postulacion-moderacion-${applicationId}.txt`);

  const response = await fetch(webhookUrl, { method: 'POST', body: form });
  if (!response.ok) {
    const body = truncate(await response.text().catch(() => ''), 700);
    throw new Error(`Discord webhook rejected the application (${response.status}): ${body}`);
  }

  return response.json().catch(() => null);
}

export const APPLICATION_BRANCH_WEBHOOK_ENV = BRANCH_WEBHOOK_ENV;

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

const BUILDERS_QUESTIONS = [
  {
    "number": 1,
    "id": "realName",
    "short": "Cuál es tu nombre (o nombre real que uses habitualm…",
    "full": "¿Cuál es tu nombre? (o nombre real que uses habitualmente)",
    "category": 0
  },
  {
    "number": 2,
    "id": "age",
    "short": "Qué edad tienes",
    "full": "¿Qué edad tienes?",
    "category": 0
  },
  {
    "number": 3,
    "id": "minecraftNick",
    "short": "Cuál es tu nick de Minecraft",
    "full": "¿Cuál es tu nick de Minecraft?",
    "category": 0
  },
  {
    "number": 4,
    "id": "country",
    "short": "En qué país te encuentras",
    "full": "¿En qué país te encuentras?",
    "category": 0
  },
  {
    "number": 5,
    "id": "discordIdentity",
    "short": "Cuál es tu usuario de Discord Incluye tu ID.",
    "full": "¿Cuál es tu usuario de Discord? Incluye tu ID.",
    "category": 0
  },
  {
    "number": 6,
    "id": "phone",
    "short": "Cuál es tu número de teléfono",
    "full": "¿Cuál es tu número de teléfono?",
    "category": 0
  },
  {
    "number": 7,
    "id": "email",
    "short": "Cuál es tu correo electrónico personal",
    "full": "¿Cuál es tu correo electrónico personal?",
    "category": 0
  },
  {
    "number": 8,
    "id": "minecraftBuildingTime",
    "short": "Hace cuánto juegas Minecraft y desde cuándo comenza…",
    "full": "¿Hace cuánto juegas Minecraft y desde cuándo comenzaste a interesarte específicamente por la construcción?",
    "category": 1
  },
  {
    "number": 9,
    "id": "weeklyHours",
    "short": "Cuántas horas semanales podrías dedicar aproximadam…",
    "full": "¿Cuántas horas semanales podrías dedicar aproximadamente a las construcciones de ARKAWOOD?",
    "category": 1
  },
  {
    "number": 10,
    "id": "availabilitySchedule",
    "short": "Qué días y horarios de la semana sueles tener mayor…",
    "full": "¿Qué días y horarios de la semana sueles tener mayor disponibilidad para construir?",
    "category": 1
  },
  {
    "number": 11,
    "id": "futureLimits",
    "short": "Tienes estudios, trabajo u otras responsabilidades …",
    "full": "¿Tienes estudios, trabajo u otras responsabilidades que puedan reducir considerablemente tu disponibilidad durante los próximos meses?",
    "category": 1
  },
  {
    "number": 12,
    "id": "revisionCommitment",
    "short": "Estarías dispuesto a trabajar durante varias semana…",
    "full": "¿Estarías dispuesto a trabajar durante varias semanas en una misma zona, realizar modificaciones y rehacer partes de una construcción si el proyecto lo requiere?",
    "category": 1
  },
  {
    "number": 13,
    "id": "buildingStyles",
    "short": "Qué estilos de construcción consideras que dominas …",
    "full": "¿Qué estilos de construcción consideras que dominas mejor?",
    "category": 2
  },
  {
    "number": 14,
    "id": "previousBuilderExperience",
    "short": "Has participado anteriormente como Builder en algún…",
    "full": "¿Has participado anteriormente como Builder en algún servidor, Build Team o proyecto de Minecraft? Cuéntanos qué hiciste y durante cuánto tiempo.",
    "category": 2
  },
  {
    "number": 15,
    "id": "buildingTools",
    "short": "Qué herramientas de construcción sabes utilizar",
    "full": "¿Qué herramientas de construcción sabes utilizar?",
    "category": 2
  },
  {
    "number": 16,
    "id": "strengthsWeaknesses",
    "short": "Qué tipo de construcciones consideras que realizas …",
    "full": "¿Qué tipo de construcciones consideras que realizas mejor y cuáles son las que más dificultad te presentan?",
    "category": 2
  },
  {
    "number": 17,
    "id": "portfolio",
    "short": "Envíanos un portafolio con algunas de tus mejores c…",
    "full": "Envíanos un portafolio con algunas de tus mejores construcciones.",
    "category": 2
  },
  {
    "number": 18,
    "id": "scenarioArtDirection",
    "short": "Estás construyendo una zona desde hace varios días …",
    "full": "Estás construyendo una zona desde hace varios días y el encargado del proyecto te pide modificar una parte importante porque no encaja con la dirección artística establecida. ¿Cómo reaccionarías?",
    "category": 3
  },
  {
    "number": 19,
    "id": "scenarioVisualConsistency",
    "short": "Otro Builder continúa una construcción que comenzas…",
    "full": "Otro Builder continúa una construcción que comenzaste tú, pero utiliza detalles y bloques diferentes a los que habías planteado. ¿Qué harías?",
    "category": 3
  },
  {
    "number": 20,
    "id": "scenarioConceptStart",
    "short": "Recibes únicamente una referencia, una idea general…",
    "full": "Recibes únicamente una referencia, una idea general y algunas indicaciones sobre una nueva zona, pero no existe un diseño exacto que copiar. ¿Cómo comenzarías a desarrollar la construcción?",
    "category": 3
  },
  {
    "number": 21,
    "id": "scenarioScaleIssue",
    "short": "Estás trabajando en una construcción grande y descu…",
    "full": "Estás trabajando en una construcción grande y descubres que la escala utilizada inicialmente no funciona correctamente para el gameplay o para las dimensiones previstas. ¿Qué harías?",
    "category": 3
  },
  {
    "number": 22,
    "id": "scenarioQualityFeedback",
    "short": "Un Builder del equipo realiza una construcción que …",
    "full": "Un Builder del equipo realiza una construcción que consideras que no alcanza el nivel visual esperado para ARKAWOOD. ¿Cómo abordarías la situación?",
    "category": 3
  },
  {
    "number": 23,
    "id": "whyBuilders",
    "short": "Por qué te gustaría formar parte del equipo de Buil…",
    "full": "¿Por qué te gustaría formar parte del equipo de Builders de ARKAWOOD y no simplemente construir en proyectos personales u otros servidores?",
    "category": 4
  },
  {
    "number": 24,
    "id": "qualities",
    "short": "Qué cualidades personales o creativas crees que te …",
    "full": "¿Qué cualidades personales o creativas crees que te convierten en un buen candidato para formar parte del equipo de construcción?",
    "category": 4
  },
  {
    "number": 25,
    "id": "regionConcept",
    "short": "Si pudieras diseñar una región o reino completo par…",
    "full": "Si pudieras diseñar una región o reino completo para ARKAWOOD desde cero, ¿qué concepto propondrías?",
    "category": 4
  },
  {
    "number": 26,
    "id": "memorableBuild",
    "short": "Qué crees que hace que una construcción de Minecraf…",
    "full": "¿Qué crees que hace que una construcción de Minecraft pase de ser simplemente «bonita» a sentirse como un lugar memorable dentro de un servidor?",
    "category": 4
  },
  {
    "number": 27,
    "id": "additionalVisualSkills",
    "short": "Tienes alguna habilidad adicional relacionada con e…",
    "full": "¿Tienes alguna habilidad adicional relacionada con el desarrollo visual del proyecto?",
    "category": 5
  },
  {
    "number": 28,
    "id": "anythingElse",
    "short": "Hay algo más que quieras mostrarnos o contarnos ant…",
    "full": "¿Hay algo más que quieras mostrarnos o contarnos antes de que evaluemos tu postulación como Builder?",
    "category": 5
  }
];

const MARKETING_QUESTIONS = [
  {
    "number": 1,
    "id": "realName",
    "short": "Cuál es tu nombre (o nombre real que uses habitualm…",
    "full": "¿Cuál es tu nombre? (o nombre real que uses habitualmente)",
    "category": 0
  },
  {
    "number": 2,
    "id": "age",
    "short": "Qué edad tienes",
    "full": "¿Qué edad tienes?",
    "category": 0
  },
  {
    "number": 3,
    "id": "minecraftNick",
    "short": "Cuál es tu nick de Minecraft",
    "full": "¿Cuál es tu nick de Minecraft?",
    "category": 0
  },
  {
    "number": 4,
    "id": "country",
    "short": "En qué país te encuentras",
    "full": "¿En qué país te encuentras?",
    "category": 0
  },
  {
    "number": 5,
    "id": "discordIdentity",
    "short": "Cuál es tu usuario de Discord Incluye tu ID.",
    "full": "¿Cuál es tu usuario de Discord? Incluye tu ID.",
    "category": 0
  },
  {
    "number": 6,
    "id": "phone",
    "short": "Cuál es tu número de teléfono",
    "full": "¿Cuál es tu número de teléfono?",
    "category": 0
  },
  {
    "number": 7,
    "id": "email",
    "short": "Cuál es tu correo electrónico personal",
    "full": "¿Cuál es tu correo electrónico personal?",
    "category": 0
  },
  {
    "number": 8,
    "id": "minecraftCommunityKnowledge",
    "short": "Hace cuánto juegas Minecraft y qué tanto conoces el…",
    "full": "¿Hace cuánto juegas Minecraft y qué tanto conoces el funcionamiento de servidores, networks o comunidades relacionadas con Minecraft?",
    "category": 1
  },
  {
    "number": 9,
    "id": "weeklyHours",
    "short": "Cuántas horas semanales podrías dedicar aproximadam…",
    "full": "¿Cuántas horas semanales podrías dedicar aproximadamente a tareas de Marketing / Management de ARKAWOOD?",
    "category": 1
  },
  {
    "number": 10,
    "id": "availabilitySchedule",
    "short": "Qué días y horarios de la semana sueles tener mayor…",
    "full": "¿Qué días y horarios de la semana sueles tener mayor disponibilidad?",
    "category": 1
  },
  {
    "number": 11,
    "id": "futureLimits",
    "short": "Tienes estudios, trabajo u otras responsabilidades …",
    "full": "¿Tienes estudios, trabajo u otras responsabilidades que puedan reducir considerablemente tu disponibilidad durante los próximos meses?",
    "category": 1
  },
  {
    "number": 12,
    "id": "longTermStrategyCommitment",
    "short": "Estarías dispuesto a trabajar durante semanas o mes…",
    "full": "¿Estarías dispuesto a trabajar durante semanas o meses en una estrategia previa al lanzamiento aunque los resultados de crecimiento no sean inmediatos?",
    "category": 1
  },
  {
    "number": 13,
    "id": "marketingExperience",
    "short": "Has trabajado anteriormente en Marketing, Community…",
    "full": "¿Has trabajado anteriormente en Marketing, Community Management, Social Media Management o gestión de comunidades? Cuéntanos tu experiencia.",
    "category": 2
  },
  {
    "number": 14,
    "id": "platforms",
    "short": "Qué redes sociales o plataformas consideras que dom…",
    "full": "¿Qué redes sociales o plataformas consideras que dominas mejor y qué tipo de contenido sabes gestionar en cada una?",
    "category": 2
  },
  {
    "number": 15,
    "id": "marketingTools",
    "short": "Qué herramientas sabes utilizar para organizar, dis…",
    "full": "¿Qué herramientas sabes utilizar para organizar, diseñar, programar, editar o analizar contenido?",
    "category": 2
  },
  {
    "number": 16,
    "id": "campaignPlanning",
    "short": "Tienes experiencia creando calendarios de contenido…",
    "full": "¿Tienes experiencia creando calendarios de contenido, campañas de lanzamiento o estrategias de crecimiento? Explícanos brevemente cómo organizarías una.",
    "category": 2
  },
  {
    "number": 17,
    "id": "portfolio",
    "short": "Muéstranos algún trabajo, proyecto, cuenta, campaña…",
    "full": "Muéstranos algún trabajo, proyecto, cuenta, campaña o contenido en el que hayas participado anteriormente.",
    "category": 2
  },
  {
    "number": 18,
    "id": "scenarioLowEngagement",
    "short": "ARKAWOOD lleva varias semanas publicando contenido,…",
    "full": "ARKAWOOD lleva varias semanas publicando contenido, pero las publicaciones tienen pocas visualizaciones e interacciones. ¿Qué analizarías y qué cambios propondrías?",
    "category": 3
  },
  {
    "number": 19,
    "id": "scenarioFeatureDelay",
    "short": "Está previsto anunciar una característica important…",
    "full": "Está previsto anunciar una característica importante del servidor, pero el equipo de desarrollo informa que podría retrasarse. La campaña ya estaba preparada. ¿Qué harías?",
    "category": 3
  },
  {
    "number": 20,
    "id": "scenarioNegativeComments",
    "short": "Una publicación de ARKAWOOD recibe una cantidad imp…",
    "full": "Una publicación de ARKAWOOD recibe una cantidad importante de comentarios negativos y críticas. ¿Cómo gestionarías la situación?",
    "category": 3
  },
  {
    "number": 21,
    "id": "scenarioCreatorOffer",
    "short": "Un creador de contenido con una comunidad considera…",
    "full": "Un creador de contenido con una comunidad considerable se ofrece a promocionar ARKAWOOD, pero solicita condiciones que podrían no beneficiar al proyecto a largo plazo. ¿Cómo evaluarías la propuesta?",
    "category": 3
  },
  {
    "number": 22,
    "id": "scenarioStrategyDisagreement",
    "short": "Dos miembros del equipo tienen ideas completamente …",
    "full": "Dos miembros del equipo tienen ideas completamente diferentes sobre cómo debería promocionarse una nueva modalidad. ¿Cómo ayudarías a decidir qué estrategia utilizar?",
    "category": 3
  },
  {
    "number": 23,
    "id": "whyMarketing",
    "short": "Por qué te gustaría formar parte del área de Market…",
    "full": "¿Por qué te gustaría formar parte del área de Marketing / Management de ARKAWOOD y no de otro proyecto?",
    "category": 4
  },
  {
    "number": 24,
    "id": "qualities",
    "short": "Qué cualidades personales crees que te convierten e…",
    "full": "¿Qué cualidades personales crees que te convierten en un buen candidato para gestionar la imagen, comunicación o crecimiento de ARKAWOOD?",
    "category": 4
  },
  {
    "number": 25,
    "id": "launchCampaign",
    "short": "Imagina que ARKAWOOD se lanzará oficialmente dentro…",
    "full": "Imagina que ARKAWOOD se lanzará oficialmente dentro de tres meses. ¿Cómo plantearías una campaña previa al lanzamiento?",
    "category": 4
  },
  {
    "number": 26,
    "id": "brandDifferentiation",
    "short": "Qué crees que debería diferenciar la comunicación y…",
    "full": "¿Qué crees que debería diferenciar la comunicación y el marketing de ARKAWOOD frente a otras networks de Minecraft?",
    "category": 4
  },
  {
    "number": 27,
    "id": "additionalSkills",
    "short": "Tienes alguna habilidad adicional que pueda ser úti…",
    "full": "¿Tienes alguna habilidad adicional que pueda ser útil para esta área?",
    "category": 5
  },
  {
    "number": 28,
    "id": "anythingElse",
    "short": "Hay algo más que quieras mostrarnos o contarnos ant…",
    "full": "¿Hay algo más que quieras mostrarnos o contarnos antes de que evaluemos tu postulación para Marketing / Management?",
    "category": 5
  }
];

const MODERATION_CATEGORY_NAMES = [
  '1 · Datos generales',
  '2 · Disponibilidad y compromiso',
  '3 · Conocimientos técnicos',
  '4 · Situaciones y criterio',
  '5 · Motivación y visión personal',
  '6 · Preguntas adicionales'
];

const BRANCH_CONFIG = Object.freeze({
  moderation: {
    label: 'Moderación', emoji: '🛡️', slug: 'moderacion', questions: MODERATION_QUESTIONS,
    categories: MODERATION_CATEGORY_NAMES
  },
  builders: {
    label: 'Builders', emoji: '🏗️', slug: 'builders', questions: BUILDERS_QUESTIONS,
    categories: ['1 · Datos generales','2 · Disponibilidad y compromiso','3 · Experiencia y construcción','4 · Trabajo en equipo y situaciones','5 · Motivación y visión como Builder','6 · Preguntas adicionales']
  },
  marketing: {
    label: 'Marketing / Management', emoji: '📣', slug: 'marketing', questions: MARKETING_QUESTIONS,
    categories: ['1 · Datos generales','2 · Disponibilidad y compromiso','3 · Experiencia, marketing y gestión','4 · Situaciones, estrategia y criterio','5 · Motivación y visión del proyecto','6 · Preguntas adicionales']
  }
});


function cleanText(value) {
  if (Array.isArray(value)) value = value.join(', ');
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/`/g, '′')
    .replace(/\r\n?/g, '\n')
    .trim();
}

function compactLine(value) {
  return cleanText(value).replace(/\s+/g, ' ').trim();
}

function truncate(value, max) {
  const text = cleanText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
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

function questionField(question, answers, answerLimit, categoryNames) {
  const categoryName = categoryNames[question.category].split(' · ')[0];
  const answer = truncate(compactLine(answers[question.id]) || '—', answerLimit);
  return {
    name: `CATEGORÍA ${categoryName} · PREGUNTA ${String(question.number).padStart(2, '0')}`,
    value: `**${question.full}**\n-# ${answer}`,
    inline: false
  };
}

function embedsTextLength(embeds) {
  return embeds.reduce((total, embed) => total +
    [embed.title, embed.description, embed.footer?.text, embed.author?.name]
      .filter(Boolean)
      .reduce((sum, part) => sum + part.length, 0) +
    (embed.fields || []).reduce((sum, field) => sum + field.name.length + field.value.length, 0), 0);
}

export function buildApplicationEmbeds(branch, { applicant, answers, applicationId, submittedAt }) {
  const config = BRANCH_CONFIG[branch];
  if (!config) throw new Error(`Unsupported application branch: ${branch}`);
  let answerLimit = 76;
  let embeds;

  do {
    const fields = config.questions.map((question) => questionField(question, answers, answerLimit, config.categories));
    embeds = [
      {
        title: `${config.emoji} Postulación a ${config.label} · 1/2`,
        description: [
          `**Postulante:** ${truncate(applicant.displayName || applicant.username, 60)} (@${truncate(applicant.username, 50)})`,
          `**Discord ID:** \`${truncate(applicant.discordUserId, 30)}\``,
          `**Postulación:** \`${applicationId}\``
        ].join('\n'),
        color: 0xD99B35,
        fields: fields.slice(0, 14),
        footer: { text: `ARKA WOOD · ${config.label} · Parte 1 de 2` },
        timestamp: submittedAt
      },
      {
        title: `${config.emoji} Postulación a ${config.label} · 2/2`,
        description: 'Continuación de la misma postulación. Las respuestas completas también van adjuntas en el archivo de respaldo.',
        color: 0xD99B35,
        fields: fields.slice(14),
        footer: { text: `ARKA WOOD · ${config.label} · Parte 2 de 2 · Uso interno` },
        timestamp: submittedAt
      }
    ];

    if (embedsTextLength(embeds) <= 5850) break;
    answerLimit -= 4;
  } while (answerLimit >= 24);

  if (embedsTextLength(embeds) > DISCORD_EMBED_TOTAL_LIMIT) {
    throw new Error(`The ${branch} embeds exceed Discord total character limits`);
  }
  return embeds;
}

export function buildModerationEmbeds(data) {
  return buildApplicationEmbeds('moderation', data);
}

function buildApplicationAttachment(branch, { applicant, answers, applicationId, submittedAt }) {
  const config = BRANCH_CONFIG[branch];
  if (!config) throw new Error(`Unsupported application branch: ${branch}`);
  const lines = [
    `ARKA WOOD — POSTULACIÓN STAFF · ${config.label.toUpperCase()}`,
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
    lines.push('', config.categories[category].toUpperCase(), '-'.repeat(54));
    for (const question of config.questions.filter((item) => item.category === category)) {
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

export async function sendApplicationWebhook(env, branch, { applicant, answers, applicationId, submittedAt }) {
  const config = BRANCH_CONFIG[branch];
  if (!config) throw new Error(`Unsupported application branch: ${branch}`);
  const webhookUrl = branchWebhookUrl(env, branch);
  const embeds = buildApplicationEmbeds(branch, { applicant, answers, applicationId, submittedAt });
  const attachmentText = buildApplicationAttachment(branch, { applicant, answers, applicationId, submittedAt });

  const payload = {
    username: 'ARKA WOOD · Postulaciones',
    allowed_mentions: { parse: [] },
    embeds,
    attachments: [{ id: 0, filename: `postulacion-${config.slug}-${applicationId}.txt`, description: 'Respuestas completas de la postulación' }]
  };

  const form = new FormData();
  form.set('payload_json', JSON.stringify(payload));
  form.set('files[0]', new Blob([attachmentText], { type: 'text/plain;charset=utf-8' }), `postulacion-${config.slug}-${applicationId}.txt`);

  const response = await fetch(webhookUrl, { method: 'POST', body: form });
  if (!response.ok) {
    const body = truncate(await response.text().catch(() => ''), 700);
    throw new Error(`Discord webhook rejected the application (${response.status}): ${body}`);
  }
  return response.json().catch(() => null);
}

export function sendModerationApplicationWebhook(env, data) {
  return sendApplicationWebhook(env, 'moderation', data);
}
export function sendBuildersApplicationWebhook(env, data) {
  return sendApplicationWebhook(env, 'builders', data);
}
export function sendMarketingApplicationWebhook(env, data) {
  return sendApplicationWebhook(env, 'marketing', data);
}


export const APPLICATION_BRANCH_WEBHOOK_ENV = BRANCH_WEBHOOK_ENV;

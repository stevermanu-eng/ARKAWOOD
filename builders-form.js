(async () => {
  const form = document.getElementById('moderationApplicationForm');
  if (!form) return;

  // Sesión y estado de postulación se consultan en paralelo. Antes eran dos
  // viajes de red consecutivos, lo que hacía esperar un RTT extra al formulario.
  let authSession = null;
  let applicationState = null;
  try {
    const sessionTask = window.arkaSessionPromise || fetch('/api/auth/session', {
      credentials: 'same-origin',
      cache: 'no-store'
    }).then((response) => response.ok ? response.json() : null).catch(() => null);
    window.arkaSessionPromise = sessionTask;

    const [session, applicationResponse] = await Promise.all([
      sessionTask,
      fetch('/api/applications/me', { credentials: 'same-origin', cache: 'no-store' })
    ]);
    authSession = session;
    applicationState = applicationResponse.ok ? await applicationResponse.json() : null;
  } catch (_) {}

  if (!authSession?.authenticated || !authSession?.member || !authSession?.user?.id) {
    const target = `/acceso-builders.html?next=${encodeURIComponent('/postulacion-builders.html')}`;
    window.location.replace(target);
    return;
  }

  const discordUser = authSession.user;

  // Antes de mostrar las preguntas, comprobamos en D1 si esta cuenta ya postuló.
  // La protección real también se repite en el endpoint de envío.
  if (applicationState?.hasApplication) {
    const id = applicationState.application?.applicationId || '';
    window.location.replace(`/postulacion-enviada.html?already=1${id ? `&id=${encodeURIComponent(id)}` : ''}`);
    return;
  }

  const STORAGE_KEY = `arkaWoodBuildersApplicationV1:${discordUser.id}`;
  const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  // Migra una sola vez los borradores de versiones anteriores y elimina la copia
  // persistente. Los datos personales quedan limitados a la sesión de esta pestaña.
  try {
    const legacyDraft = localStorage.getItem(STORAGE_KEY);
    if (legacyDraft && !sessionStorage.getItem(STORAGE_KEY)) sessionStorage.setItem(STORAGE_KEY, legacyDraft);
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
  const REVIEW_STEP_INDEX = 6;
  const state = {
    current: 0,
    data: {},
    completed: new Set(),
    reviewOpen: false,
    finalConsent: false
  };

  const categories = [
  {
    "title": "Datos Generales",
    "short": "Datos Generales",
    "icon": "▤",
    "description": "Información básica para identificarte y contactarte durante el proceso de selección.",
    "tip": "Tu identidad de Discord ya fue verificada. Revisa con especial atención tu nick de Minecraft, teléfono y correo antes de continuar.",
    "questions": [
      {
        "id": "realName",
        "number": 1,
        "label": "¿Cuál es tu nombre? (o nombre real que uses habitualmente)",
        "help": "Sirve para identificarte fuera del juego y llevar un registro interno del staff.",
        "type": "text",
        "placeholder": "Escribe el nombre que usas habitualmente...",
        "required": true,
        "min": 2,
        "max": 80,
        "icon": "♟"
      },
      {
        "id": "age",
        "number": 2,
        "label": "¿Qué edad tienes?",
        "help": "Nos ayuda a evaluar la madurez esperada según el rango de edad y asignar responsabilidades acordes.",
        "type": "number",
        "placeholder": "Ej. 18",
        "required": true,
        "minValue": 1,
        "maxValue": 100,
        "step": 1,
        "icon": "◆"
      },
      {
        "id": "minecraftNick",
        "number": 3,
        "label": "¿Cuál es tu nick de Minecraft?",
        "help": "Escribe el nombre exacto con el que juegas actualmente en ARKAWOOD.",
        "type": "minecraft",
        "placeholder": "Ej. SteveArka",
        "required": true,
        "icon": "▦"
      },
      {
        "id": "country",
        "number": 4,
        "label": "¿En qué país te encuentras?",
        "help": "Nos permite organizar coordinación, reuniones y horarios con miembros de distintas zonas.",
        "type": "text",
        "placeholder": "Ej. Perú, México, España...",
        "required": true,
        "min": 2,
        "max": 80,
        "icon": "◈"
      },
      {
        "id": "discordIdentity",
        "number": 5,
        "label": "¿Cuál es tu usuario de Discord? Incluye tu ID.",
        "help": "Discord es el canal principal de comunicación del staff. Este dato se completa y bloquea automáticamente con la cuenta verificada que usaste para entrar.",
        "type": "discord",
        "required": true,
        "icon": "◉"
      },
      {
        "id": "phone",
        "number": 6,
        "label": "¿Cuál es tu número de teléfono?",
        "help": "Incluye el prefijo internacional y escribe únicamente números. Ejemplo: 51987654321. El equipo encargado podrá comunicarse contigo durante el proceso cuando sea necesario.",
        "type": "phone",
        "placeholder": "Ej. 51987654321",
        "required": true,
        "icon": "☎"
      },
      {
        "id": "email",
        "number": 7,
        "label": "¿Cuál es tu correo electrónico personal?",
        "help": "Las novedades y el resultado del proceso se comunicarán al correo registrado. Debe ser una dirección válida, por ejemplo nombre@gmail.com.",
        "type": "email",
        "placeholder": "nombre@gmail.com",
        "required": true,
        "icon": "✉"
      }
    ]
  },
  {
    "title": "Disponibilidad y Compromiso",
    "short": "Disponibilidad",
    "icon": "◷",
    "description": "Evaluaremos si tu disponibilidad y forma de trabajar son compatibles con un proyecto de construcción que todavía se encuentra en desarrollo.",
    "tip": "Indica una disponibilidad realista. Algunas zonas pueden requerir varias semanas de trabajo, revisiones y sesiones coordinadas con otros builders.",
    "questions": [
      {
        "id": "minecraftBuildingTime",
        "number": 8,
        "label": "¿Hace cuánto juegas Minecraft y desde cuándo comenzaste a interesarte específicamente por la construcción?",
        "help": "Queremos conocer tu trayectoria dentro del juego y cuánto tiempo llevas desarrollando tus habilidades como builder.",
        "type": "textarea",
        "placeholder": "Cuéntanos desde cuándo juegas y cómo comenzó tu interés por construir...",
        "required": true,
        "icon": "⌛",
        "min": 2,
        "max": 5000
      },
      {
        "id": "weeklyHours",
        "number": 9,
        "label": "¿Cuántas horas semanales podrías dedicar aproximadamente a las construcciones de ARKAWOOD?",
        "help": "El proyecto se encuentra en una etapa previa al lanzamiento y algunas construcciones pueden requerir varias semanas de trabajo. Queremos conocer tu disponibilidad real.",
        "type": "textarea",
        "placeholder": "Explícanos cuántas horas semanales podrías dedicar y cómo se distribuyen...",
        "required": true,
        "icon": "◷",
        "min": 2,
        "max": 5000
      },
      {
        "id": "availabilitySchedule",
        "number": 10,
        "label": "¿Qué días y horarios de la semana sueles tener mayor disponibilidad para construir?",
        "help": "Nos permitirá organizar sesiones de construcción conjunta, revisiones y reuniones entre builders.",
        "type": "textarea",
        "placeholder": "Indica tus días, rangos horarios y zona horaria si lo consideras útil...",
        "required": true,
        "icon": "▥",
        "min": 2,
        "max": 5000
      },
      {
        "id": "futureLimits",
        "number": 11,
        "label": "¿Tienes estudios, trabajo u otras responsabilidades que puedan reducir considerablemente tu disponibilidad durante los próximos meses?",
        "help": "ARKAWOOD es un proyecto a futuro y queremos formar un equipo estable que pueda acompañar el desarrollo durante un periodo prolongado.",
        "type": "textarea",
        "placeholder": "Explícanos de forma general qué limitaciones deberíamos tener en cuenta...",
        "required": true,
        "icon": "▤",
        "min": 2,
        "max": 5000
      },
      {
        "id": "revisionCommitment",
        "number": 12,
        "label": "¿Estarías dispuesto a trabajar durante varias semanas en una misma zona, realizar modificaciones y rehacer partes de una construcción si el proyecto lo requiere?",
        "help": "Las construcciones pueden pasar por distintas revisiones antes de considerarse terminadas. Buscamos personas constantes y abiertas a mejorar su trabajo.",
        "type": "textarea",
        "placeholder": "Explícanos cómo afrontarías revisiones, cambios y trabajo prolongado sobre una misma zona...",
        "required": true,
        "icon": "↻",
        "min": 2,
        "max": 5000
      }
    ]
  },
  {
    "title": "Experiencia y Conocimientos de Construcción",
    "short": "Experiencia",
    "icon": "⚒",
    "description": "Evaluaremos tus conocimientos de construcción, herramientas, estilos y capacidad para trabajar dentro de proyectos de gran escala.",
    "tip": "No necesitas dominar todas las herramientas. Sé preciso sobre lo que sabes hacer y diferencia claramente experiencia personal de trabajo realizado en equipo.",
    "questions": [
      {
        "id": "buildingStyles",
        "number": 13,
        "label": "¿Qué estilos de construcción consideras que dominas mejor?",
        "help": "Puedes mencionar medieval, fantasía, oriental, gótico, nórdico, naturaleza, terraformación, ciudades, interiores, estructuras orgánicas u otros. ARKAWOOD contará con diferentes regiones y reinos.",
        "type": "textarea",
        "placeholder": "Describe los estilos que dominas mejor y, si quieres, cuáles estás desarrollando...",
        "required": true,
        "icon": "✦",
        "min": 2,
        "max": 5000
      },
      {
        "id": "previousBuilderExperience",
        "number": 14,
        "label": "¿Has participado anteriormente como Builder en algún servidor, Build Team o proyecto de Minecraft? Cuéntanos qué hiciste y durante cuánto tiempo.",
        "help": "Queremos conocer tu experiencia trabajando en construcciones destinadas a servidores o proyectos reales. Si nunca has pertenecido a un equipo, puedes indicarlo con total transparencia.",
        "type": "textarea",
        "placeholder": "Cuéntanos proyectos, responsabilidades, duración y qué parte realizaste tú...",
        "required": true,
        "icon": "♜",
        "min": 2,
        "max": 5000
      },
      {
        "id": "buildingTools",
        "number": 15,
        "label": "¿Qué herramientas de construcción sabes utilizar?",
        "help": "Por ejemplo: WorldEdit, FAWE, VoxelSniper, Axiom, Arceon, GoBrush, GoPaint u otras. No es obligatorio dominar todas las herramientas.",
        "type": "textarea",
        "placeholder": "Enumera las herramientas que utilizas y explica brevemente tu nivel con cada una...",
        "required": true,
        "icon": "⚒",
        "min": 2,
        "max": 5000
      },
      {
        "id": "strengthsWeaknesses",
        "number": 16,
        "label": "¿Qué tipo de construcciones consideras que realizas mejor y cuáles son las que más dificultad te presentan?",
        "help": "Buscamos conocer tanto tus fortalezas como las áreas en las que todavía necesitas mejorar.",
        "type": "textarea",
        "placeholder": "Cuéntanos tus fortalezas y las áreas que todavía te cuestan más...",
        "required": true,
        "icon": "◇",
        "min": 2,
        "max": 5000
      },
      {
        "id": "portfolio",
        "number": 17,
        "label": "Envíanos un portafolio con algunas de tus mejores construcciones.",
        "help": "Puedes pegar enlaces a imágenes, videos o galerías. Indica qué partes construiste tú, si trabajaste solo o con otras personas, cuánto tiempo te tomó y qué herramientas utilizaste. El portafolio será uno de los elementos principales de la evaluación.",
        "type": "textarea",
        "placeholder": "Pega aquí tus enlaces y explica el contexto de cada construcción...",
        "required": true,
        "icon": "▣",
        "min": 2,
        "max": 5000
      }
    ]
  },
  {
    "title": "Trabajo en Equipo y Situaciones Prácticas",
    "short": "Situaciones",
    "icon": "⚖",
    "description": "Queremos conocer cómo actuarías dentro de un equipo real de construcción durante el desarrollo de ARKAWOOD.",
    "tip": "Nos interesa tu razonamiento, tu capacidad para aceptar correcciones y cómo coordinarías decisiones visuales con otras personas.",
    "questions": [
      {
        "id": "scenarioArtDirection",
        "number": 18,
        "label": "Estás construyendo una zona desde hace varios días y el encargado del proyecto te pide modificar una parte importante porque no encaja con la dirección artística establecida. ¿Cómo reaccionarías?",
        "help": "Queremos conocer tu capacidad para recibir críticas y realizar cambios sobre un trabajo al que ya has dedicado tiempo.",
        "type": "textarea",
        "placeholder": "Explícanos cómo reaccionarías y cómo organizarías los cambios...",
        "required": true,
        "icon": "↻",
        "min": 2,
        "max": 5000
      },
      {
        "id": "scenarioVisualConsistency",
        "number": 19,
        "label": "Otro Builder continúa una construcción que comenzaste tú, pero utiliza detalles y bloques diferentes a los que habías planteado. ¿Qué harías?",
        "help": "Evaluamos tu capacidad para coordinar y mantener coherencia visual sin generar conflictos.",
        "type": "textarea",
        "placeholder": "Describe cómo hablarías con el otro builder y cómo buscarías coherencia visual...",
        "required": true,
        "icon": "⚖",
        "min": 2,
        "max": 5000
      },
      {
        "id": "scenarioConceptStart",
        "number": 20,
        "label": "Recibes únicamente una referencia, una idea general y algunas indicaciones sobre una nueva zona, pero no existe un diseño exacto que copiar. ¿Cómo comenzarías a desarrollar la construcción?",
        "help": "Nos interesa conocer tu proceso creativo y capacidad para transformar ideas en escenarios.",
        "type": "textarea",
        "placeholder": "Explícanos tu proceso desde la referencia inicial hasta los primeros prototipos o decisiones...",
        "required": true,
        "icon": "✦",
        "min": 2,
        "max": 5000
      },
      {
        "id": "scenarioScaleIssue",
        "number": 21,
        "label": "Estás trabajando en una construcción grande y descubres que la escala utilizada inicialmente no funciona correctamente para el gameplay o para las dimensiones previstas. ¿Qué harías?",
        "help": "Queremos evaluar si eres capaz de detectar problemas estructurales, plantear soluciones y priorizar el resultado final sobre el trabajo ya realizado.",
        "type": "textarea",
        "placeholder": "Explica cómo evaluarías el problema y qué harías con el trabajo ya construido...",
        "required": true,
        "icon": "⌁",
        "min": 2,
        "max": 5000
      },
      {
        "id": "scenarioQualityFeedback",
        "number": 22,
        "label": "Un Builder del equipo realiza una construcción que consideras que no alcanza el nivel visual esperado para ARKAWOOD. ¿Cómo abordarías la situación?",
        "help": "Buscamos personas capaces de aportar críticas constructivas sin generar conflictos y que comprendan que el objetivo es mejorar el proyecto entre todos.",
        "type": "textarea",
        "placeholder": "Explica cómo darías feedback y cómo colaborarías para mejorar el resultado...",
        "required": true,
        "icon": "◇",
        "min": 2,
        "max": 5000
      }
    ]
  },
  {
    "title": "Motivación y Visión como Builder",
    "short": "Motivación",
    "icon": "◆",
    "description": "Queremos conocer tus motivaciones, creatividad y qué tipo de aportación visual podrías realizar al mundo de ARKAWOOD.",
    "tip": "Piensa en ARKAWOOD como un mundo que debe sentirse coherente, memorable y funcional para el jugador, no solo como una colección de construcciones bonitas.",
    "questions": [
      {
        "id": "whyBuilders",
        "number": 23,
        "label": "¿Por qué te gustaría formar parte del equipo de Builders de ARKAWOOD y no simplemente construir en proyectos personales u otros servidores?",
        "help": "Ten en cuenta que ARKAWOOD es un proyecto en desarrollo y todavía no ha sido lanzado oficialmente. Buscamos personas interesadas en participar desde sus primeras etapas.",
        "type": "textarea",
        "placeholder": "Cuéntanos qué te atrae del proyecto y por qué quieres construirlo desde esta etapa...",
        "required": true,
        "icon": "◆",
        "min": 2,
        "max": 5000
      },
      {
        "id": "qualities",
        "number": 24,
        "label": "¿Qué cualidades personales o creativas crees que te convierten en un buen candidato para formar parte del equipo de construcción?",
        "help": "Puedes hablarnos de creatividad, atención al detalle, paciencia, constancia, capacidad de adaptación, trabajo en equipo u otras cualidades relacionadas.",
        "type": "textarea",
        "placeholder": "Describe las cualidades que aportarías al equipo...",
        "required": true,
        "icon": "♟",
        "min": 2,
        "max": 5000
      },
      {
        "id": "regionConcept",
        "number": 25,
        "label": "Si pudieras diseñar una región o reino completo para ARKAWOOD desde cero, ¿qué concepto propondrías?",
        "help": "Explícanos brevemente la temática, arquitectura, ambientación, colores principales, terreno y elementos característicos que tendría.",
        "type": "textarea",
        "placeholder": "Desarrolla tu concepto de región o reino: temática, arquitectura, ambiente, paleta, terreno y elementos distintivos...",
        "required": true,
        "icon": "✦",
        "min": 2,
        "max": 5000
      },
      {
        "id": "memorableBuild",
        "number": 26,
        "label": "¿Qué crees que hace que una construcción de Minecraft pase de ser simplemente «bonita» a sentirse como un lugar memorable dentro de un servidor?",
        "help": "Nos interesa conocer tu visión sobre ambientación, escala, composición, narrativa visual, detalles y experiencia del jugador.",
        "type": "textarea",
        "placeholder": "Explícanos qué elementos convierten una construcción en una experiencia memorable...",
        "required": true,
        "icon": "◇",
        "min": 2,
        "max": 5000
      }
    ]
  },
  {
    "title": "Preguntas Adicionales",
    "short": "Adicionales",
    "icon": "✦",
    "description": "Esta última categoría nos permitirá conocer habilidades complementarias que puedan ser útiles durante la creación de ARKAWOOD.",
    "tip": "Si una habilidad no aplica a tu caso, puedes indicarlo. Lo importante es no dejar preguntas vacías y ser transparente sobre tu experiencia.",
    "questions": [
      {
        "id": "additionalVisualSkills",
        "number": 27,
        "label": "¿Tienes alguna habilidad adicional relacionada con el desarrollo visual del proyecto?",
        "help": "Por ejemplo: terraformación, organic building, interiores, Pixel Art, modelado 3D, Blockbench, Resource Packs, texturas, diseño gráfico, Concept Art, edición, esquemáticas u otras habilidades relacionadas.",
        "type": "textarea",
        "placeholder": "Cuéntanos qué habilidades adicionales tienes y qué nivel consideras que manejas...",
        "required": true,
        "icon": "✦",
        "min": 2,
        "max": 5000
      },
      {
        "id": "anythingElse",
        "number": 28,
        "label": "¿Hay algo más que quieras mostrarnos o contarnos antes de que evaluemos tu postulación como Builder?",
        "help": "Puedes enseñarnos otros proyectos, explicar tu forma de trabajar, hablarnos de una construcción de la que estés especialmente orgulloso o añadir cualquier información relevante.",
        "type": "textarea",
        "placeholder": "Añade cualquier información final o indica expresamente que no tienes nada más que agregar...",
        "required": true,
        "icon": "▤",
        "min": 2,
        "max": 5000
      }
    ]
  }
];

  const reviewStep = { title: 'Revisión Final', short: 'Revisión', icon: '☑' };
  const allSteps = [...categories, reviewStep];

  const questionRoot = document.getElementById('applicationQuestions');
  const sidebar = document.getElementById('applicationSidebar');
  const stepper = document.getElementById('applicationStepper');
  const categoryLabel = document.getElementById('currentCategoryLabel');
  const categoryTitle = document.getElementById('currentCategoryTitle');
  const categoryDescription = document.getElementById('currentCategoryDescription');
  const categoryNumber = document.getElementById('currentCategoryNumber');
  const tipText = document.getElementById('applicationTipText');
  const progressBar = document.getElementById('applicationProgressBar');
  const progressText = document.getElementById('applicationProgressText');
  const previous = document.getElementById('previousCategory');
  const next = document.getElementById('nextCategory');
  const save = document.getElementById('saveApplication');
  const toast = document.getElementById('applicationToast');
  const formPanel = document.querySelector('.application-form-panel');
  const reviewScreen = document.getElementById('applicationReviewScreen');
  const reviewContent = document.getElementById('applicationReviewContent');
  const reviewAvatar = document.getElementById('applicationReviewAvatar');
  const reviewName = document.getElementById('applicationReviewName');
  const reviewMeta = document.getElementById('applicationReviewMeta');
  const reviewConsent = document.getElementById('applicationReviewConsent');
  const reviewConsentBox = document.getElementById('applicationReviewConsentBox');
  const reviewBack = document.getElementById('applicationReviewBack');
  const reviewEdit = document.getElementById('applicationReviewEdit');
  const reviewSave = document.getElementById('applicationReviewSave');
  const reviewSubmit = document.getElementById('applicationReviewSubmit');

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

  const defaultDiscordAvatar = (id) => {
    try { return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(id) >> 22n) % 6}.png`; }
    catch (_) { return 'https://cdn.discordapp.com/embed/avatars/0.png'; }
  };

  const discordAvatarUrl = discordUser.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.webp?size=96`
    : defaultDiscordAvatar(discordUser.id);

  const discordIdentity = `${discordUser.username} · ID ${discordUser.id}`;
  state.data.discordIdentity = discordIdentity;

  const authAvatar = document.getElementById('applicationAuthAvatar');
  const authName = document.getElementById('applicationAuthName');
  const heroDiscordName = document.getElementById('moderationDiscordName');
  const logoutButton = document.getElementById('applicationLogout');
  if (authAvatar) authAvatar.src = discordAvatarUrl;
  if (authName) authName.textContent = discordUser.displayName || discordUser.username;
  if (heroDiscordName) heroDiscordName.textContent = `@${discordUser.username}`;
  if (reviewAvatar) reviewAvatar.src = discordAvatarUrl;
  if (reviewName) reviewName.textContent = discordUser.displayName || discordUser.username;
  if (reviewMeta) {
    const started = discordUser.startedAt ? new Date(discordUser.startedAt) : null;
    const startedText = started && !Number.isNaN(started.getTime())
      ? started.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })
      : 'sesión actual';
    reviewMeta.textContent = `@${discordUser.username} · Discord ID ${discordUser.id} · Inicio: ${startedText}`;
  }

  logoutButton?.addEventListener('click', async () => {
    logoutButton.disabled = true;
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: authSession?.csrfToken ? { 'X-CSRF-Token': authSession.csrfToken } : {}
      });
    }
    finally { window.location.replace('/acceso-builders.html'); }
  });

  const scrollToQuestionStart = () => {
    const target = questionRoot || formPanel;
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - 118;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };

  // Agrupamos el crecimiento de textarea al siguiente frame para evitar
  // lecturas/escrituras de layout repetidas en cada pulsación.
  let autoGrowFrame = 0;
  const autoGrowQueue = new Set();
  const flushAutoGrow = () => {
    autoGrowFrame = 0;
    const fields = [...autoGrowQueue];
    autoGrowQueue.clear();
    fields.forEach((textarea) => { textarea.style.height = 'auto'; });
    const heights = fields.map((textarea) => ({
      textarea,
      scrollHeight: textarea.scrollHeight,
      height: Math.min(Math.max(textarea.scrollHeight, 154), 820)
    }));
    heights.forEach(({ textarea, scrollHeight, height }) => {
      textarea.style.height = `${height}px`;
      textarea.style.overflowY = scrollHeight > 820 ? 'auto' : 'hidden';
    });
  };
  const autoGrowTextarea = (textarea) => {
    if (!textarea || textarea.tagName !== 'TEXTAREA') return;
    autoGrowQueue.add(textarea);
    if (!autoGrowFrame) autoGrowFrame = requestAnimationFrame(flushAutoGrow);
  };

  const showToast = (message, kind = 'default', duration = 4200) => {
    if (!toast) return;
    toast.textContent = message;
    toast.dataset.kind = kind;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), duration);
  };

  const load = () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (saved && typeof saved === 'object') {
        const savedAt = Number(saved.savedAt || Date.now());
        const age = Date.now() - savedAt;
        if (Number.isFinite(savedAt) && age >= 0 && age <= DRAFT_TTL_MS) {
          state.data = saved.data && typeof saved.data === 'object' ? saved.data : {};
          state.current = Number.isInteger(saved.current) ? Math.min(Math.max(saved.current, 0), categories.length - 1) : 0;
          state.finalConsent = Boolean(saved.finalConsent);
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (_) {}
    state.data.discordIdentity = discordIdentity;
  };

  let persistTimer = 0;
  let persistenceEnabled = true;
  const persistNow = (notify = false) => {
    if (!persistenceEnabled) return;
    window.clearTimeout(persistTimer);
    persistTimer = 0;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        data: state.data,
        current: state.current,
        finalConsent: state.finalConsent,
        savedAt: Date.now()
      }));
      if (notify) showToast('Borrador guardado en este navegador.', 'success');
    } catch (_) {
      if (notify) showToast('No se pudo guardar el borrador en este navegador.', 'error');
    }
  };
  // sessionStorage es síncrono. En escritura continua guardamos con debounce para
  // no bloquear el hilo principal en cada tecla.
  const persist = (notify = false) => {
    if (notify) {
      persistNow(true);
      return;
    }
    window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(() => persistNow(false), 320);
  };
  window.addEventListener('pagehide', () => persistNow(false));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) persistNow(false);
  });

  const getQuestionValue = (question) => {
    if (question.type === 'discord') return discordIdentity;
    if (question.type === 'multicheckbox') {
      return [...form.querySelectorAll(`input[name="${question.id}"]:checked`)].map((field) => field.value);
    }
    const field = form.elements[question.id];
    if (!field) return state.data[question.id];
    return field.type === 'checkbox' ? Boolean(field.checked) : field.value;
  };

  const collectCurrent = () => {
    const category = categories[state.current];
    if (!category) return;
    category.questions.forEach((question) => {
      state.data[question.id] = getQuestionValue(question);
    });
    state.data.discordIdentity = discordIdentity;
  };

  const emailIsValid = (value) => {
    if (value.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
  };

  const questionValidation = (question) => {
    const raw = question.type === 'discord' ? discordIdentity : state.data[question.id];

    if (question.type === 'multicheckbox') {
      const values = Array.isArray(raw) ? raw : [];
      if (question.required && values.length === 0) return 'Selecciona al menos un día antes de continuar.';
      return '';
    }

    if (question.type === 'discord') {
      return discordUser?.id && discordUser?.username ? '' : 'No se pudo verificar tu identidad de Discord. Vuelve a iniciar sesión.';
    }

    const value = String(raw ?? '').trim();
    if (question.required && !value) return 'Esta pregunta es obligatoria. Debes responderla antes de continuar.';

    if (question.type === 'email' && value && !emailIsValid(value)) {
      return 'Escribe un correo electrónico válido, por ejemplo nombre@gmail.com.';
    }

    if (question.type === 'phone' && value && !/^\d{8,15}$/.test(value)) {
      return 'El teléfono debe contener únicamente números, incluido el prefijo internacional, y tener entre 8 y 15 dígitos.';
    }

    if (question.type === 'minecraft' && value && !/^[A-Za-z0-9_]{3,16}$/.test(value)) {
      return 'El nick de Minecraft debe tener entre 3 y 16 caracteres y usar únicamente letras, números o guion bajo.';
    }

    if (question.type === 'number' && value) {
      const number = Number(value);
      if (!Number.isFinite(number)) return 'Escribe un número válido.';
      if (question.minValue !== undefined && number < question.minValue) return `El valor mínimo permitido es ${question.minValue}.`;
      if (question.maxValue !== undefined && number > question.maxValue) return `El valor máximo permitido es ${question.maxValue}.`;
      if (question.step === 1 && !Number.isInteger(number)) return 'Debes escribir un número entero.';
    }

    if (question.min && value.length < question.min) {
      return `Amplía un poco tu respuesta. Debe tener al menos ${question.min} caracteres.`;
    }

    if (question.max && value.length > question.max) {
      return `La respuesta no puede superar ${question.max} caracteres.`;
    }

    return '';
  };

  const categoryIsComplete = (index, showErrors = false) => {
    const category = categories[index];
    if (!category) return false;
    let valid = true;

    category.questions.forEach((question) => {
      const error = questionValidation(question);
      if (error) valid = false;
      if (showErrors && index === state.current) {
        const wrapper = document.querySelector(`[data-question="${question.id}"]`);
        if (wrapper) {
          wrapper.classList.toggle('has-error', Boolean(error));
          const errorNode = wrapper.querySelector('.application-question__error');
          if (errorNode) errorNode.textContent = error;
        }
      }
    });

    if (valid) state.completed.add(index);
    else state.completed.delete(index);
    return valid;
  };

  const recalcCompleted = () => {
    state.completed = new Set();
    categories.forEach((_, index) => categoryIsComplete(index));
  };

  const firstIncompleteIndex = () => {
    recalcCompleted();
    return categories.findIndex((_, index) => !state.completed.has(index));
  };

  const allQuestionCategoriesComplete = () => {
    recalcCompleted();
    return state.completed.size === categories.length;
  };

  const maxUnlockedStep = () => {
    const missing = firstIncompleteIndex();
    return missing === -1 ? REVIEW_STEP_INDEX : missing;
  };

  const renderNavigation = (recalculate = true) => {
    if (recalculate) recalcCompleted();
    const missing = categories.findIndex((_, index) => !state.completed.has(index));
    const maxUnlocked = missing === -1 ? REVIEW_STEP_INDEX : missing;

    sidebar.innerHTML = allSteps.map((step, index) => {
      const isReview = index === REVIEW_STEP_INDEX;
      const active = state.reviewOpen ? isReview : index === state.current;
      const complete = isReview ? false : state.completed.has(index);
      const locked = index > maxUnlocked;
      const indicator = complete ? '✓' : String(index + 1).padStart(2, '0');
      return `<button type="button" class="application-sidebar__item${active ? ' is-active' : ''}${complete ? ' is-complete' : ''}${locked ? ' is-locked' : ''}" data-index="${index}" ${locked ? 'disabled' : ''}><span>${step.icon}</span><b>${escapeHtml(step.short)}</b><i>${locked ? '×' : indicator}</i></button>`;
    }).join('');

    stepper.innerHTML = allSteps.map((step, index) => {
      const isReview = index === REVIEW_STEP_INDEX;
      const active = state.reviewOpen ? isReview : index === state.current;
      const complete = isReview ? false : state.completed.has(index);
      const locked = index > maxUnlocked;
      return `<button type="button" class="application-step${active ? ' is-active' : ''}${complete ? ' is-complete' : ''}${locked ? ' is-locked' : ''}" data-index="${index}" aria-label="Ir a ${escapeHtml(step.title)}" ${locked ? 'disabled' : ''}><span>${complete ? '✓' : index + 1}</span><b>${escapeHtml(step.short)}</b></button>`;
    }).join('');
  };

  // Sidebar y stepper se vuelven a pintar, pero sus listeners no: delegamos
  // ambos clics una sola vez y evitamos reinstalar handlers en cada render.
  const handleNavigationClick = (event) => {
    const button = event.target.closest('[data-index]');
    if (!button || button.disabled) return;
    const index = Number(button.dataset.index);
    if (!Number.isInteger(index)) return;
    if (index === REVIEW_STEP_INDEX) openReview();
    else navigate(index);
  };
  sidebar.addEventListener('click', handleNavigationClick);
  stepper.addEventListener('click', handleNavigationClick);

  const renderField = (question) => {
    const value = question.type === 'discord' ? discordIdentity : (state.data[question.id] ?? (question.type === 'multicheckbox' ? [] : ''));
    let control = '';

    if (question.type === 'select') {
      control = `<div class="form-control-wrap"><select id="${question.id}" name="${question.id}" required><option value="">${escapeHtml(question.placeholder)}</option>${question.options.map((option) => `<option value="${escapeHtml(option)}" ${value === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select><span class="select-chevron">⌄</span></div>`;
    } else if (question.type === 'textarea') {
      control = `<div class="form-control-wrap"><textarea id="${question.id}" name="${question.id}" rows="6" placeholder="${escapeHtml(question.placeholder)}" required maxlength="${question.max || 5000}">${escapeHtml(value)}</textarea><small class="char-count" data-for="${question.id}">${String(value).length}${question.min ? ` / ${question.min}+ mínimo` : ''}</small></div>`;
    } else if (question.type === 'multicheckbox') {
      const selected = Array.isArray(value) ? value : [];
      control = `<div class="application-multi-checkbox" role="group" aria-label="${escapeHtml(question.label)}">${question.options.map((option) => `<label><input type="checkbox" name="${question.id}" value="${escapeHtml(option)}" ${selected.includes(option) ? 'checked' : ''}><span>✓</span><b>${escapeHtml(option)}</b></label>`).join('')}</div>`;
    } else if (question.type === 'discord') {
      control = `<div class="form-control-wrap form-control-wrap--verified"><input id="${question.id}" name="${question.id}" type="text" value="${escapeHtml(discordIdentity)}" readonly aria-readonly="true"><span class="verified-field-badge">✓ VERIFICADO</span></div>`;
    } else if (question.type === 'email') {
      control = `<div class="form-control-wrap"><input id="${question.id}" name="${question.id}" type="email" autocomplete="email" value="${escapeHtml(value)}" placeholder="${escapeHtml(question.placeholder)}" required maxlength="254"></div>`;
    } else if (question.type === 'phone') {
      control = `<div class="form-control-wrap"><input id="${question.id}" name="${question.id}" type="text" inputmode="numeric" autocomplete="tel" value="${escapeHtml(value)}" placeholder="${escapeHtml(question.placeholder)}" required maxlength="15" pattern="[0-9]{8,15}"></div>`;
    } else if (question.type === 'number') {
      control = `<div class="form-control-wrap"><input id="${question.id}" name="${question.id}" type="number" inputmode="decimal" value="${escapeHtml(value)}" placeholder="${escapeHtml(question.placeholder)}" required ${question.minValue !== undefined ? `min="${question.minValue}"` : ''} ${question.maxValue !== undefined ? `max="${question.maxValue}"` : ''} ${question.step !== undefined ? `step="${question.step}"` : ''}></div>`;
    } else {
      control = `<div class="form-control-wrap"><input id="${question.id}" name="${question.id}" type="text" value="${escapeHtml(value)}" placeholder="${escapeHtml(question.placeholder || '')}" required ${question.max ? `maxlength="${question.max}"` : ''}></div>`;
    }

    return `<article class="application-question" data-question="${question.id}">
      <div class="application-question__number">${question.number}.</div>
      <div class="application-question__icon">${question.icon}</div>
      <div class="application-question__body">
        <div class="application-question__label"><label for="${question.id}">${escapeHtml(question.label)}</label><span class="required-mark">OBLIGATORIA</span></div>
        <p>${escapeHtml(question.help)}</p>
        ${control}
        <div class="application-question__error">Esta pregunta es obligatoria. Debes responderla antes de continuar.</div>
      </div>
    </article>`;
  };

  const updateFieldValue = (field) => {
    const category = categories[state.current];
    const question = category.questions.find((item) => item.id === field.name);
    if (!question) return;

    if (question.type === 'phone') {
      const digitsOnly = field.value.replace(/\D/g, '').slice(0, 15);
      if (field.value !== digitsOnly) field.value = digitsOnly;
    }

    if (question.type === 'multicheckbox') {
      state.data[question.id] = [...form.querySelectorAll(`input[name="${question.id}"]:checked`)].map((item) => item.value);
    } else {
      state.data[question.id] = field.value;
    }

    // Si el usuario modifica una respuesta después de haber aceptado la revisión,
    // pedimos una nueva confirmación sobre la versión actualizada del formulario.
    state.finalConsent = false;

    const wrapper = field.closest('.application-question');
    if (wrapper) {
      const error = questionValidation(question);
      wrapper.classList.toggle('has-error', Boolean(error));
      const errorNode = wrapper.querySelector('.application-question__error');
      if (errorNode) errorNode.textContent = error || '';
    }

    if (field.tagName === 'TEXTAREA') {
      autoGrowTextarea(field);
      const count = questionRoot.querySelector(`[data-for="${field.name}"]`);
      if (count) count.textContent = `${field.value.length}${question.min ? ` / ${question.min}+ mínimo` : ''}`;
    }

    // Solo repintamos navegación si el estado completo/incompleto de la categoría
    // realmente cambió. Antes se reconstruían sidebar y stepper en CADA tecla.
    const wasComplete = state.completed.has(state.current);
    const isComplete = categoryIsComplete(state.current);
    if (wasComplete !== isComplete) {
      paintProgress();
      renderNavigation(false);
    }
    persist();
  };

  // Delegación de eventos: dos listeners estables para todos los campos dinámicos.
  questionRoot.addEventListener('input', (event) => {
    const field = event.target;
    if (!(field instanceof HTMLElement)) return;
    if (!field.matches('textarea, input:not([type="checkbox"])')) return;
    updateFieldValue(field);
  });
  questionRoot.addEventListener('change', (event) => {
    const field = event.target;
    if (!(field instanceof HTMLElement)) return;
    if (!field.matches('select, input[type="checkbox"]')) return;
    updateFieldValue(field);
  });

  const render = () => {
    state.reviewOpen = false;
    reviewScreen.hidden = true;
    document.body.classList.remove('application-review-open');
    recalcCompleted();

    const category = categories[state.current];
    categoryLabel.textContent = `CATEGORÍA ${state.current + 1} DE ${categories.length}`;
    categoryTitle.textContent = category.title.toUpperCase();
    categoryDescription.textContent = category.description;
    categoryNumber.textContent = String(state.current + 1).padStart(2, '0');
    tipText.textContent = category.tip;

    questionRoot.innerHTML = category.questions.map(renderField).join('');

    questionRoot.querySelectorAll('textarea').forEach(autoGrowTextarea);

    previous.disabled = state.current === 0;
    previous.style.visibility = state.current === 0 ? 'hidden' : 'visible';
    if (state.current === categories.length - 1) {
      next.innerHTML = 'REVISAR POSTULACIÓN <span>→</span>';
      next.classList.add('form-btn--submit');
    } else {
      next.innerHTML = 'SIGUIENTE CATEGORÍA <span>→</span>';
      next.classList.remove('form-btn--submit');
    }

    paintProgress();
    renderNavigation(false);
    persist();
  };

  const paintProgress = () => {
    const count = state.completed.size;
    progressBar.style.width = `${(count / categories.length) * 100}%`;
    progressText.textContent = `${count} / ${categories.length}`;
  };

  const updateProgress = () => {
    recalcCompleted();
    paintProgress();
  };

  const navigate = (index) => {
    collectCurrent();
    categoryIsComplete(state.current);
    const maxUnlocked = maxUnlockedStep();
    if (index < 0 || index >= categories.length || index > maxUnlocked) {
      const missing = firstIncompleteIndex();
      const name = missing >= 0 ? categories[missing].title : categories[state.current].title;
      showToast(`No puedes saltar preguntas. Completa primero: ${name}.`, 'error');
      return;
    }
    state.current = index;
    render();
    scrollToQuestionStart();
  };

  const answerForReview = (question) => {
    if (question.type === 'discord') return discordIdentity;
    const value = state.data[question.id];
    if (Array.isArray(value)) return value.join(', ');
    return String(value ?? '').trim();
  };

  const renderReview = () => {
    reviewContent.innerHTML = categories.map((category, categoryIndex) => `
      <article class="application-review-category">
        <header>
          <div><small>CATEGORÍA ${categoryIndex + 1}</small><h3>${escapeHtml(category.title)}</h3><p>${escapeHtml(category.description)}</p></div>
          <button type="button" data-edit-category="${categoryIndex}">EDITAR CATEGORÍA <span>↗</span></button>
        </header>
        <div class="application-review-answers">
          ${category.questions.map((question) => `
            <div class="application-review-answer">
              <span>${String(question.number).padStart(2, '0')}</span>
              <div><small>${escapeHtml(question.label)}</small><p>${escapeHtml(answerForReview(question))}</p></div>
            </div>`).join('')}
        </div>
      </article>`).join('');

    reviewConsentBox.checked = state.finalConsent;
    reviewConsent.classList.toggle('has-error', false);
    renderNavigation();
  };

  reviewContent.addEventListener('click', (event) => {
    const button = event.target.closest('[data-edit-category]');
    if (!button) return;
    const categoryIndex = Number(button.dataset.editCategory);
    if (!Number.isInteger(categoryIndex)) return;
    state.reviewOpen = false;
    state.current = categoryIndex;
    render();
    window.setTimeout(scrollToQuestionStart, 30);
  });

  const openReview = () => {
    collectCurrent();
    if (!categoryIsComplete(state.current, true)) {
      showToast('Completa todas las preguntas de esta categoría antes de revisar tu postulación.', 'error');
      document.querySelector('.application-question.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    recalcCompleted();
    if (!allQuestionCategoriesComplete()) {
      const missing = firstIncompleteIndex();
      showToast(`No puedes saltar preguntas. Todavía falta completar: ${categories[missing].title}.`, 'error');
      navigate(missing);
      return;
    }

    state.reviewOpen = true;
    renderReview();
    reviewScreen.hidden = false;
    document.body.classList.add('application-review-open');
    reviewScreen.scrollTop = 0;
  };

  const closeReview = () => {
    state.reviewOpen = false;
    reviewScreen.hidden = true;
    document.body.classList.remove('application-review-open');
    state.current = categories.length - 1;
    render();
  };

  const buildSubmissionPayload = () => ({
    applicant: {
      discordUserId: String(discordUser.id),
      username: String(discordUser.username || ''),
      displayName: String(discordUser.displayName || discordUser.username || ''),
      avatar: discordUser.avatar || null,
      startedAt: discordUser.startedAt || null
    },
    answers: Object.fromEntries(categories.flatMap((category) => category.questions.map((question) => [question.id, question.type === 'discord' ? discordIdentity : state.data[question.id]]))),
    consent: {
      internalReview: true,
      notPublic: true,
      interviewIfNeeded: true,
      accepted: Boolean(state.finalConsent)
    }
  });

  const submitApplication = async () => {
    collectCurrent();
    if (!allQuestionCategoriesComplete()) {
      const missing = firstIncompleteIndex();
      showToast(`Falta completar: ${categories[missing].title}.`, 'error');
      state.reviewOpen = false;
      reviewScreen.hidden = true;
      document.body.classList.remove('application-review-open');
      navigate(missing);
      return;
    }

    if (!state.finalConsent) {
      reviewConsent.classList.add('has-error');
      reviewConsent.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('Debes aceptar las condiciones de revisión antes de enviar la postulación.', 'error');
      return;
    }

    reviewSubmit.disabled = true;
    reviewSubmit.innerHTML = 'VALIDANDO POSTULACIÓN...';

    try {
      const response = await fetch('/api/applications/builders', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': authSession.csrfToken || ''
        },
        body: JSON.stringify(buildSubmissionPayload())
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok && result.ok) {
        persistenceEnabled = false;
        window.clearTimeout(persistTimer);
        sessionStorage.removeItem(STORAGE_KEY);
        reviewSubmit.innerHTML = 'POSTULACIÓN ENVIADA ✓';
        reviewSubmit.disabled = true;
        showToast('Postulación enviada. Abriendo la confirmación...', 'success', 2400);
        const destination = result.redirect || `/postulacion-enviada.html${result.applicationId ? `?id=${encodeURIComponent(result.applicationId)}` : ''}`;
        window.setTimeout(() => window.location.replace(destination), 650);
        return;
      }

      if (result.code === 'reauth_required') {
        persistNow(false);
        showToast(result.message || 'Necesitamos renovar tu verificación de Discord antes de enviar.', 'error', 5200);
        const loginUrl = typeof result.login === 'string' && result.login.startsWith('/api/auth/discord')
          ? result.login
          : `/api/auth/discord?return=${encodeURIComponent(window.location.pathname)}`;
        window.setTimeout(() => window.location.assign(loginUrl), 900);
        return;
      }

      if (result.code === 'already_submitted') {
        persistenceEnabled = false;
        window.clearTimeout(persistTimer);
        sessionStorage.removeItem(STORAGE_KEY);
        showToast('Esta cuenta de Discord ya tiene una postulación registrada.', 'error', 4200);
        const id = result.applicationId ? `&id=${encodeURIComponent(result.applicationId)}` : '';
        window.setTimeout(() => window.location.replace(`/postulacion-enviada.html?already=1${id}`), 700);
        return;
      }

      if (result.code === 'database_not_configured' || result.code === 'database_error') {
        showToast(result.message || 'La base de datos de postulaciones todavía no está disponible.', 'error', 7000);
        reviewSubmit.innerHTML = 'REINTENTAR ENVÍO <span>→</span>';
        reviewSubmit.disabled = false;
        return;
      }

      if (result.code === 'webhook_not_configured') {
        showToast(result.message || 'El canal interno de Builders todavía no está configurado.', 'error', 7000);
        reviewSubmit.innerHTML = 'CANAL DE DISCORD PENDIENTE';
        window.setTimeout(() => {
          reviewSubmit.disabled = false;
          reviewSubmit.innerHTML = 'ENVIAR POSTULACIÓN <span>→</span>';
        }, 4500);
        return;
      }

      if (result.code === 'webhook_delivery_failed') {
        showToast(result.message || 'Discord no confirmó la recepción. Tu borrador permanece guardado.', 'error', 7000);
        reviewSubmit.innerHTML = 'REINTENTAR ENVÍO <span>→</span>';
        reviewSubmit.disabled = false;
        return;
      }

      if (result.code === 'validation_error' && Number.isInteger(result.categoryIndex)) {
        state.reviewOpen = false;
        reviewScreen.hidden = true;
        document.body.classList.remove('application-review-open');
        state.current = Math.min(Math.max(result.categoryIndex, 0), categories.length - 1);
        render();
        showToast(result.message || 'El servidor detectó una respuesta inválida. Revísala antes de continuar.', 'error', 5000);
        return;
      }

      showToast(result.message || 'No se pudo validar la postulación en el servidor.', 'error', 5000);
    } catch (_) {
      showToast('No se pudo conectar con el módulo de envío. Tu borrador sigue guardado en este navegador.', 'error', 5000);
    } finally {
      if (reviewSubmit.innerHTML === 'VALIDANDO POSTULACIÓN...') {
        reviewSubmit.disabled = false;
        reviewSubmit.innerHTML = 'ENVIAR POSTULACIÓN <span>→</span>';
      }
    }
  };

  previous.addEventListener('click', () => navigate(state.current - 1));

  next.addEventListener('click', () => {
    collectCurrent();
    if (!categoryIsComplete(state.current, true)) {
      showToast('Todas las preguntas son obligatorias. Completa esta categoría antes de continuar.', 'error');
      document.querySelector('.application-question.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    persist();
    if (state.current === categories.length - 1) openReview();
    else navigate(state.current + 1);
  });

  save.addEventListener('click', () => {
    collectCurrent();
    recalcCompleted();
    paintProgress();
    renderNavigation(false);
    persist(true);
  });

  reviewBack?.addEventListener('click', closeReview);
  reviewEdit?.addEventListener('click', () => reviewBack?.click());
  reviewSave?.addEventListener('click', () => persist(true));
  reviewConsentBox?.addEventListener('change', () => {
    state.finalConsent = Boolean(reviewConsentBox.checked);
    reviewConsent.classList.remove('has-error');
    persist();
  });
  reviewSubmit?.addEventListener('click', submitApplication);

  load();
  render();
})();

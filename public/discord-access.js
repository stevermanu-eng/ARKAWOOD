(() => {
  const fetchWithTimeout = window.arkaFetch || (async (input, init = {}, timeoutMs = 12000) => {
    if (!('AbortController' in window)) return window.fetch(input, init);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await window.fetch(input, { ...init, signal: controller.signal });
    } finally {
      window.clearTimeout(timer);
    }
  });
  const BRANCHES = Object.freeze({
    moderation: {
      form: '/postulacion-moderacion.html',
      access: '/acceso-moderacion.html',
      title: 'Ya puedes acceder a Moderación'
    },
    builders: {
      form: '/postulacion-builders.html',
      access: '/acceso-builders.html',
      title: 'Ya puedes acceder a Builders'
    },
    marketing: {
      form: '/postulacion-marketing.html',
      access: '/acceso-marketing.html',
      title: 'Ya puedes acceder a Marketing / Management'
    }
  });

  const branch = document.body?.dataset?.applicationBranch || 'moderation';
  const config = BRANCHES[branch] || BRANCHES.moderation;

  const statusIcon = document.getElementById('accessStatusIcon');
  const eyebrow = document.getElementById('accessEyebrow');
  const title = document.getElementById('accessTitle');
  const copy = document.getElementById('accessCopy');
  const identity = document.getElementById('discordIdentity');
  const avatar = document.getElementById('discordAvatar');
  const displayName = document.getElementById('discordDisplayName');
  const username = document.getElementById('discordUsername');
  const identityState = document.getElementById('discordIdentityState');
  const login = document.getElementById('discordLogin');
  const join = document.getElementById('discordJoin');
  const recheck = document.getElementById('discordRecheck');
  const enter = document.getElementById('discordEnter');
  const logout = document.getElementById('discordLogout');
  const steps = [...document.querySelectorAll('.moderation-access-step')];
  let currentSession = null;

  if (![statusIcon, eyebrow, title, copy, identity, avatar, displayName, username, identityState, login, join, recheck, enter, logout].every(Boolean)) return;

  const params = new URLSearchParams(location.search);
  const requestedNext = params.get('next');
  const safeClientPath = (value) => typeof value === 'string'
    && value.length <= 2048
    && value.startsWith('/')
    && !value.startsWith('//')
    && !value.includes('\\')
    && !/[\u0000-\u001F\u007F]/.test(value);
  const safeNext = safeClientPath(requestedNext) ? requestedNext : config.form;

  login.href = `/api/auth/discord?return=${encodeURIComponent(safeNext)}`;
  recheck.href = `/api/auth/discord?return=${encodeURIComponent(safeNext)}`;
  enter.href = safeNext;

  const errorMessages = {
    configuration: 'El acceso con Discord no está disponible en este momento. Contacta con un administrador si el problema continúa.',
    cancelled: 'Cancelaste la autorización de Discord. Puedes intentarlo de nuevo cuando quieras.',
    discord_authorization: 'Discord no pudo completar la autorización. Intenta iniciar sesión nuevamente.',
    invalid_state: 'La verificación de seguridad del inicio de sesión expiró o no coincide. Inicia el proceso otra vez.',
    token_exchange: 'No se pudo validar la respuesta de Discord. Revisa la configuración OAuth2 o vuelve a intentarlo.',
    profile_read: 'No se pudo leer tu perfil básico de Discord.',
    membership_check: 'No se pudo comprobar tu pertenencia al servidor de ARKA WOOD.',
    discord_unavailable: 'Discord no está respondiendo correctamente en este momento. Intenta nuevamente más tarde.'
  };

  const defaultAvatar = (id) => {
    try { return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(id) >> 22n) % 6}.png`; }
    catch { return 'https://cdn.discordapp.com/embed/avatars/0.png'; }
  };

  const avatarUrl = (user) => user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=96`
    : defaultAvatar(user.id);

  const setSteps = (discordOk, guildOk, formOk) => {
    const values = [discordOk, guildOk, formOk];
    steps.forEach((step, index) => {
      step.classList.toggle('is-complete', Boolean(values[index]));
      step.classList.toggle('is-current', !values[index] && (index === 0 || values[index - 1]));
      const marker = step.querySelector('i');
      if (marker) marker.textContent = values[index] ? '✓' : (step.classList.contains('is-current') ? '→' : '•');
    });
  };

  const resetActions = () => {
    [login, join, recheck, enter, logout].forEach((element) => { element.hidden = true; });
  };

  const showIdentity = (user, stateLabel = 'VERIFICADA') => {
    identity.hidden = false;
    avatar.src = avatarUrl(user);
    avatar.width = 96;
    avatar.height = 96;
    avatar.decoding = 'async';
    displayName.textContent = user.displayName || user.username;
    username.textContent = `@${user.username}`;
    identityState.textContent = stateLabel;
  };

  const renderError = (message) => {
    resetActions();
    identity.hidden = true;
    statusIcon.dataset.state = 'error';
    statusIcon.querySelector('span').textContent = '!';
    eyebrow.textContent = 'NO SE PUDO COMPLETAR EL ACCESO';
    title.textContent = 'Hay un problema con la autenticación';
    copy.textContent = message;
    login.hidden = false;
    const label = login.querySelector('span:nth-child(2)');
    if (label) label.textContent = 'INTENTAR DE NUEVO CON DISCORD';
    setSteps(false, false, false);
  };

  const renderLoggedOut = () => {
    resetActions();
    identity.hidden = true;
    statusIcon.dataset.state = 'idle';
    statusIcon.querySelector('span').textContent = '◈';
    eyebrow.textContent = 'PASO 1 DE 2';
    title.textContent = 'Verifica tu cuenta de Discord';
    copy.textContent = 'Usaremos Discord únicamente para identificar tu cuenta y comprobar que eres miembro del servidor oficial. Después de eso se habilitará el formulario.';
    login.hidden = false;
    setSteps(false, false, false);
  };

  const renderNotMember = (user) => {
    resetActions();
    showIdentity(user, 'CUENTA VERIFICADA');
    statusIcon.dataset.state = 'warning';
    statusIcon.querySelector('span').textContent = '⌁';
    eyebrow.textContent = 'PASO 2 DE 2';
    title.textContent = 'Debes unirte al Discord de ARKA WOOD';
    copy.textContent = 'Tu identidad ya fue verificada, pero Discord indica que esta cuenta todavía no pertenece al servidor. Únete y luego vuelve a comprobar el acceso.';
    join.hidden = false;
    recheck.hidden = false;
    logout.hidden = false;
    setSteps(true, false, false);
  };

  const renderMember = (user) => {
    resetActions();
    showIdentity(user, 'ACCESO APROBADO');
    statusIcon.dataset.state = 'success';
    statusIcon.querySelector('span').textContent = '✓';
    eyebrow.textContent = 'VERIFICACIÓN COMPLETADA';
    title.textContent = config.title;
    copy.textContent = 'Tu cuenta está verificada y pertenece al servidor de ARKA WOOD. Las preguntas de la postulación ya están desbloqueadas para esta sesión.';
    enter.hidden = false;
    logout.hidden = false;
    setSteps(true, true, true);
  };

  const renderAlreadySubmitted = (user, application) => {
    resetActions();
    showIdentity(user, 'POSTULACIÓN REGISTRADA');
    statusIcon.dataset.state = 'success';
    statusIcon.querySelector('span').textContent = '✓';
    eyebrow.textContent = 'SOLICITUD YA REGISTRADA';
    title.textContent = 'Esta cuenta ya envió una postulación';
    copy.textContent = 'Para mantener el proceso justo, una misma cuenta de Discord no puede enviar una segunda postulación. Puedes revisar la pantalla de confirmación mientras esperas la respuesta del equipo.';
    enter.href = `/postulacion-enviada.html?already=1${application?.applicationId ? `&id=${encodeURIComponent(application.applicationId)}` : ''}`;
    const label = enter.querySelector('span');
    if (label) label.textContent = 'VER ESTADO DE MI POSTULACIÓN';
    enter.hidden = false;
    logout.hidden = false;
    setSteps(true, true, true);
  };

  const load = async () => {
    const error = params.get('error');
    if (error) {
      renderError(errorMessages[error] || 'No se pudo completar el acceso. Intenta nuevamente.');
      return;
    }

    try {
      const sessionTask = window.arkaSessionPromise || fetchWithTimeout('/api/auth/session', {
        credentials: 'same-origin',
        cache: 'no-store'
      }).then((response) => response.ok ? response.json() : null).catch(() => null);
      window.arkaSessionPromise = sessionTask;

      const [session, applicationResponse] = await Promise.all([
        sessionTask,
        fetchWithTimeout('/api/applications/me', { credentials: 'same-origin', cache: 'no-store' })
      ]);
      if (!session) throw new Error('session');
      currentSession = session;
      if (!session.authenticated) return renderLoggedOut();
      if (!session.member) return renderNotMember(session.user);

      if (applicationResponse.ok) {
        const applicationState = await applicationResponse.json();
        if (applicationState?.hasApplication) return renderAlreadySubmitted(session.user, applicationState.application);
      }

      return renderMember(session.user);
    } catch {
      renderError('No pudimos consultar tu sesión. Inténtalo nuevamente en unos instantes.');
    }
  };

  logout.addEventListener('click', async () => {
    logout.disabled = true;
    try {
      await fetchWithTimeout('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: currentSession?.csrfToken ? { 'X-CSRF-Token': currentSession.csrfToken } : {}
      });
    } finally {
      location.replace(config.access);
    }
  });

  load();
})();

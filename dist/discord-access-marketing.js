(() => {
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

  const params = new URLSearchParams(location.search);
  const requestedNext = params.get('next');
  const safeNext = requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/postulacion-marketing.html';

  login.href = `/api/auth/discord?return=${encodeURIComponent(safeNext)}`;
  recheck.href = `/api/auth/discord?return=${encodeURIComponent(safeNext)}`;
  enter.href = safeNext;

  const errorMessages = {
    configuration: 'Falta completar la configuración privada de Discord en Cloudflare. El administrador debe añadir DISCORD_CLIENT_SECRET y SESSION_SECRET antes de activar el acceso.',
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
      step.querySelector('i').textContent = values[index] ? '✓' : (step.classList.contains('is-current') ? '→' : '•');
    });
  };

  const resetActions = () => {
    [login, join, recheck, enter, logout].forEach((element) => { element.hidden = true; });
  };

  const showIdentity = (user, stateLabel = 'VERIFICADA') => {
    identity.hidden = false;
    avatar.src = avatarUrl(user);
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
    login.querySelector('span:nth-child(2)').textContent = 'INTENTAR DE NUEVO CON DISCORD';
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
    title.textContent = 'Ya puedes acceder a Marketing / Management';
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
    enter.querySelector('span').textContent = 'VER ESTADO DE MI POSTULACIÓN';
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
      const [sessionResponse, applicationResponse] = await Promise.all([
        fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' }),
        fetch('/api/applications/me', { credentials: 'same-origin', cache: 'no-store' })
      ]);
      if (!sessionResponse.ok) throw new Error('session');
      const session = await sessionResponse.json();
      if (!session.authenticated) return renderLoggedOut();
      if (!session.member) return renderNotMember(session.user);

      if (applicationResponse.ok) {
        const applicationState = await applicationResponse.json();
        if (applicationState?.hasApplication) return renderAlreadySubmitted(session.user, applicationState.application);
      }

      return renderMember(session.user);
    } catch {
      renderError('No pudimos consultar tu sesión en Cloudflare. Si el sitio acaba de desplegarse, confirma que Pages Functions esté habilitado.');
    }
  };

  logout.addEventListener('click', async () => {
    logout.disabled = true;
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); }
    finally { location.replace('/acceso-marketing.html'); }
  });

  load();
})();

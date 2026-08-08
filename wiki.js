(() => {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const accessMessage = document.getElementById('auditAccessMessage');
  const auditIdentity = document.getElementById('auditIdentity');
  const auditAuthorizedIdentity = document.getElementById('auditAuthorizedIdentity');
  const reason = params.get('reason');

  if (accessMessage) {
    const messages = {
      'login-required': 'Inicia sesión con Discord para comprobar tu acceso al área de Auditoría Staff.',
      'server-required': 'Tu cuenta debe pertenecer al servidor oficial de ARKA WOOD antes de poder validar este acceso.',
      'role-required': 'Tu cuenta de Discord está verificada, pero no tiene el rol autorizado para entrar a Auditoría Staff.',
      'role-refresh': 'Necesitamos volver a validar tus roles de Discord antes de abrir este apartado.',
      'configuration': 'La autenticación de Discord todavía no está configurada correctamente en el entorno de Cloudflare.',
      'cancelled': 'La verificación con Discord fue cancelada. Puedes intentarlo de nuevo cuando quieras.'
    };
    if (messages[reason]) accessMessage.textContent = messages[reason];
  }

  if (!auditIdentity && !auditAuthorizedIdentity) return;

  const sessionTask = window.arkaSessionPromise || fetch('/api/auth/session', {
    credentials: 'same-origin',
    cache: 'no-store'
  }).then((response) => response.ok ? response.json() : null).catch(() => null);
  window.arkaSessionPromise = sessionTask;

  sessionTask
    .then((session) => {
      if (!session?.authenticated || !session?.user) return;
      const label = session.user.displayName || session.user.username || 'Discord';
      if (auditIdentity) {
        auditIdentity.hidden = false;
        auditIdentity.textContent = `Sesión actual: ${label}`;
      }
      if (auditAuthorizedIdentity) {
        auditAuthorizedIdentity.textContent = `ACCESO VERIFICADO · ${label}`;
      }
    })
    .catch(() => {});
})();

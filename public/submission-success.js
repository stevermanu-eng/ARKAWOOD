(async () => {
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
  const params = new URLSearchParams(location.search);
  const already = params.get('already') === '1';
  const applicationId = params.get('id');
  const title = document.getElementById('successTitle');
  const lead = document.getElementById('successLead');
  const total = document.getElementById('applicationTotal');
  const idBox = document.getElementById('successApplicationId');
  const userBox = document.getElementById('successUser');
  const avatar = document.getElementById('successAvatar');
  const displayName = document.getElementById('successDisplayName');
  const username = document.getElementById('successUsername');

  if (already) {
    title.innerHTML = 'POSTULACIÓN <strong>YA REGISTRADA</strong>';
    lead.textContent = 'Esta cuenta de Discord ya tiene una solicitud registrada en ARKA WOOD. Para proteger la integridad del proceso no es posible enviar otra postulación con la misma cuenta.';
  }

  if (applicationId && idBox) {
    idBox.hidden = false;
    idBox.querySelector('code').textContent = applicationId;
  }

  const defaultAvatar = (id) => {
    try { return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(id) >> 22n) % 6}.png`; }
    catch { return 'https://cdn.discordapp.com/embed/avatars/0.png'; }
  };

  try {
    const sessionTask = window.arkaSessionPromise || fetchWithTimeout('/api/auth/session', {
      credentials: 'same-origin',
      cache: 'no-store'
    }).then((response) => response.ok ? response.json() : null).catch(() => null);
    window.arkaSessionPromise = sessionTask;

    const [statsResponse, session] = await Promise.all([
      fetchWithTimeout('/api/applications/stats', { cache: 'no-store' }),
      sessionTask
    ]);

    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      if (stats?.ok && Number.isFinite(Number(stats.total))) {
        total.textContent = String(stats.total);
      }
    }

    if (session?.authenticated && session?.user?.id) {
      const user = session.user;
      avatar.src = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=96`
        : defaultAvatar(user.id);
      displayName.textContent = user.displayName || user.username;
      username.textContent = `@${user.username} · Discord ID ${user.id}`;
      userBox.hidden = false;
    }
  } catch (_) {
    // La pantalla mantiene el valor base si el contador remoto no está disponible.
  }
})();

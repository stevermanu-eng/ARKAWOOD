(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer:fine)').matches;
  const lowPower = (navigator.deviceMemory && navigator.deviceMemory <= 4)
    || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
    || window.innerWidth < 700;

  const fetchWithTimeout = async (input, init = {}, timeoutMs = 12000) => {
    if (!('AbortController' in window)) return window.fetch(input, init);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await window.fetch(input, { ...init, signal: controller.signal });
    } finally {
      window.clearTimeout(timer);
    }
  };
  window.arkaFetch = fetchWithTimeout;

  const onIdle = (callback, timeout = 1000) => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(callback, { timeout });
    else window.setTimeout(callback, Math.min(timeout, 350));
  };

  // FOROS: recuperación global. Incluso si una página HTML antigua quedó desplegada
  // con href=/construccion.html o con la clase dummy, el botón FOROS se corrige aquí.
  // Esto evita que deployments parciales mantengan el destino obsoleto.
  const globalForumButtons = [...document.querySelectorAll('.nav__item')]
    .filter((item) => item.textContent.trim().toUpperCase() === 'FOROS');
  globalForumButtons.forEach((item) => {
    item.classList.remove('dummy');
    item.setAttribute('href', '/foro/');
    item.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.location.assign('/foro/');
    });
  });

  // WIKI: mantiene intacto el botón/estética del encabezado de Home y solo activa su navegación.
  const homeWikiButton = [...document.querySelectorAll('.nav__item.dummy')]
    .find((item) => item.textContent.trim().toUpperCase() === 'WIKI');
  if (homeWikiButton) {
    homeWikiButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.location.href = '/wiki/';
    });
  }


  // SOPORTE conserva exactamente el botón original del encabezado; solo activamos su destino.
  const supportButton = [...document.querySelectorAll('.nav__item.dummy')]
    .find((item) => item.textContent.trim().toUpperCase() === 'SOPORTE');
  if (supportButton) {
    supportButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.location.href = '/support';
    });
  }

  // Navegación exacta de documentos largos.
  // content-visibility puede hacer que el navegador estime alturas y un ancla quede corta.
  // Calculamos el destino real, descontamos la barra fija y hacemos una corrección final.
  if (document.body.classList.contains('privacy-page')) {
    let legalScrollCorrection = 0;
    const legalSelector = '.privacy-sidebar a[href^="#"], .privacy-toc-mobile a[href^="#"], .privacy-end a[href^="#"]';
    const targetTop = (target) => {
      const bar = document.getElementById('topbar');
      const barHeight = bar ? bar.getBoundingClientRect().height : 0;
      return Math.max(0, target.getBoundingClientRect().top + window.scrollY - barHeight - 18);
    };

    document.addEventListener('click', (event) => {
      const link = event.target.closest(legalSelector);
      if (!link) return;
      const href = link.getAttribute('href') || '';
      const id = href.startsWith('#') ? decodeURIComponent(href.slice(1)) : '';
      const target = id ? document.getElementById(id) : null;
      if (!target) return;

      event.preventDefault();
      window.clearTimeout(legalScrollCorrection);
      window.scrollTo({ top: targetTop(target), behavior: reducedMotion ? 'auto' : 'smooth' });
      history.replaceState(null, '', `#${encodeURIComponent(id)}`);

      const mobileToc = link.closest('details.privacy-toc-mobile');
      if (mobileToc) mobileToc.open = false;

      legalScrollCorrection = window.setTimeout(() => {
        window.scrollTo({ top: targetTop(target), behavior: 'auto' });
      }, reducedMotion ? 0 : 650);
    });

    // Si se abre directamente una URL con #titulo-..., corrige la posición después del layout inicial.
    if (window.location.hash) {
      window.setTimeout(() => {
        const id = decodeURIComponent(window.location.hash.slice(1));
        const target = document.getElementById(id);
        if (target) window.scrollTo({ top: targetTop(target), behavior: 'auto' });
      }, 80);
    }
  }

  // Los accesos que todavía no tienen una sección pública llevan a la página de mundo en construcción.
  document.addEventListener('click', (event) => {
    const dummy = event.target.closest('.dummy');
    if (!dummy) return;
    event.preventDefault();
    dummy.blur?.();
    window.location.assign(dummy.getAttribute('href') || '/construccion.html');
  });

  const topbar = document.getElementById('topbar');
  if (topbar) {
    let scheduled = false;
    const paintTopbar = () => {
      scheduled = false;
      topbar.classList.toggle('is-scrolled', window.scrollY > 20);
    };
    paintTopbar();
    window.addEventListener('scroll', () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(paintTopbar);
    }, { passive: true });
  }

  // Una sola consulta de sesión por documento. Las páginas de acceso, formularios y WIKI
  // reutilizan esta promesa para evitar solicitudes duplicadas a Pages Functions.
  const sessionEndpoint = location.pathname.startsWith('/foro') ? '/api/auth/session?live=1' : '/api/auth/session';
  const sessionPromise = window.arkaSessionPromise || fetchWithTimeout(sessionEndpoint, {
    credentials: 'same-origin',
    cache: 'no-store'
  }).then((response) => response.ok ? response.json() : null).catch(() => null);
  window.arkaSessionPromise = sessionPromise;

  // Control global de Discord. Sin sesión se presenta como un botón rectangular CONECTAR;
  // con sesión vuelve al avatar circular del usuario. El mismo componente se reutiliza en todas las páginas.
  const homeProfile = document.getElementById('homeProfile');
  const homeProfileAvatar = document.getElementById('homeProfileAvatar');
  const homeProfileFallback = document.getElementById('homeProfileFallback');
  let notificationBell = null;
  let notificationPanel = null;
  let notificationCsrfToken = '';
  let notificationRefreshTimer = 0;
  let accountMenu = null;
  let accountRoot = null;
  if (homeProfile?.parentElement) {
    const parent = homeProfile.parentElement;
    let account = parent.querySelector('.topbar__account');
    if (!account) {
      account = document.createElement('div');
      account.className = 'topbar__account';
      parent.insertBefore(account, homeProfile);
      account.appendChild(homeProfile);
    }
    accountRoot = account;
    notificationBell = document.createElement('button');
    notificationBell.className = 'notification-bell';
    notificationBell.type = 'button';
    notificationBell.hidden = true;
    notificationBell.setAttribute('aria-label', 'Notificaciones');
    notificationBell.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 22a2.5 2.5 0 0 0 2.36-1.67H9.64A2.5 2.5 0 0 0 12 22Zm7-5.5-1.75-2.1V9a5.27 5.27 0 0 0-4.25-5.17V3a1 1 0 0 0-2 0v.83A5.27 5.27 0 0 0 6.75 9v5.4L5 16.5V18h14v-1.5Z"/></svg><i hidden>0</i>';
    account.insertBefore(notificationBell, homeProfile);
    notificationPanel = document.createElement('div');
    notificationPanel.className = 'notification-panel';
    notificationPanel.hidden = true;
    notificationPanel.innerHTML = '<b>NOTIFICACIONES</b><p>No tienes notificaciones nuevas.</p>';
    account.appendChild(notificationPanel);
    accountMenu = document.createElement('div');
    accountMenu.className = 'topbar-profile-menu';
    accountMenu.hidden = true;
    accountMenu.innerHTML = '<div class="topbar-profile-menu__head"><img alt=""><div><b>MI CUENTA</b><small></small></div></div><a data-account-action="view" href="/perfil/">VER MI PERFIL</a><a data-account-action="edit" href="/perfil/editar">EDITAR PERFIL</a><button data-account-action="share" type="button">COMPARTIR PERFIL</button><button class="is-danger" data-account-action="logout" type="button">CERRAR SESIÓN</button><p class="topbar-profile-menu__status" role="status"></p>';
    account.appendChild(accountMenu);
    notificationBell.addEventListener('click', (event) => {
      event.stopPropagation();
      if(accountMenu) accountMenu.hidden = true;
      notificationPanel.hidden = !notificationPanel.hidden;
      if (!notificationPanel.hidden) refreshNotifications();
    });
    document.addEventListener('click', () => { notificationPanel.hidden = true; if(accountMenu) accountMenu.hidden = true; });
    notificationPanel.addEventListener('click', async (event) => {
      event.stopPropagation();
      const link = event.target.closest('[data-notification-id]');
      if (!link) return;
      event.preventDefault();
      const id = link.dataset.notificationId || '';
      const href = link.getAttribute('href') || '/foro/';
      if (id) await markNotificationRead(id);
      window.location.assign(href);
    });
  }

  const notificationFallbackAvatar = (id) => {
    try { return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(id) >> 22n) % 6}.png`; }
    catch (_) { return 'https://cdn.discordapp.com/embed/avatars/0.png'; }
  };
  const notificationAvatar = (item) => item?.profile_photo
    || (item?.discord_avatar && item?.actor_discord_id
      ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(item.actor_discord_id)}/${encodeURIComponent(item.discord_avatar)}.webp?size=96`
      : notificationFallbackAvatar(item?.actor_discord_id || '0'));
  const notificationTarget = (item) => {
    if (!item?.post_id || !item?.category) return '/foro/';
    const base = `/foro/${encodeURIComponent(item.category)}/${encodeURIComponent(item.post_id)}`;
    return item.reply_id ? `${base}#respuesta-${encodeURIComponent(item.reply_id)}` : base;
  };
  const notificationLabel = (item) => {
    if (item?.message) return String(item.message);
    const labels = { mention: 'Te mencionaron en el foro.', reply: 'Respondieron a tu publicación.', reply_to: 'Respondieron a tu comentario.', quote: 'Citaron tu comentario.' };
    return labels[item?.notification_type] || 'Tienes una nueva notificación del foro.';
  };
  const escapeNotificationHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const paintNotificationCount = (count) => {
    const badge = notificationBell?.querySelector('i');
    if (!badge) return;
    const value = Math.max(0, Number(count) || 0);
    badge.textContent = value > 99 ? '99+' : String(value);
    badge.hidden = value < 1;
    notificationBell.classList.toggle('has-unread', value > 0);
  };
  const renderNotifications = (data) => {
    if (!notificationPanel) return;
    const items = Array.isArray(data?.notifications) ? data.notifications : [];
    if (data?.configured === false) {
      notificationPanel.innerHTML = '<header><b>NOTIFICACIONES</b><span>FORO</span></header><p class="notification-panel__empty">No se pudieron cargar las notificaciones en este momento.</p>';
      paintNotificationCount(0);
      return;
    }
    paintNotificationCount(data?.unread || 0);
    if (!items.length) {
      notificationPanel.innerHTML = '<header><b>NOTIFICACIONES</b><span>FORO</span></header><p class="notification-panel__empty">No tienes notificaciones del foro.</p>';
      return;
    }
    notificationPanel.innerHTML = `<header><b>NOTIFICACIONES</b><button type="button" data-notification-read-all>MARCAR LEÍDAS</button></header><div class="notification-panel__list">${items.map((item) => {
      const unread = !item.read_at;
      const actor = escapeNotificationHtml(item.actor_name || 'Usuario');
      const message = escapeNotificationHtml(notificationLabel(item));
      const title = escapeNotificationHtml(item.title || 'Foro de ARKA WOOD');
      return `<a class="notification-item${unread ? ' is-unread' : ''}" data-notification-id="${escapeNotificationHtml(item.notification_id)}" href="${notificationTarget(item)}"><img src="${escapeNotificationHtml(notificationAvatar(item))}" alt=""><span><b>${actor}</b><small>${message}</small><em>${title}</em></span></a>`;
    }).join('')}</div>`;
    notificationPanel.querySelector('[data-notification-read-all]')?.addEventListener('click', async (event) => {
      event.stopPropagation();
      await markNotificationRead('');
      await refreshNotifications();
    });
  };
  async function refreshNotifications() {
    if (!notificationBell || notificationBell.hidden) return;
    try {
      const response = await fetchWithTimeout('/api/notifications', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) return;
      renderNotifications(await response.json());
    } catch (_) {}
  }
  async function markNotificationRead(id = '') {
    if (!notificationCsrfToken) return;
    try {
      await fetchWithTimeout('/api/notifications', {
        method: 'PUT', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': notificationCsrfToken },
        body: JSON.stringify(id ? { id } : {})
      });
      if (id) {
        const item = notificationPanel?.querySelector(`[data-notification-id="${CSS.escape(id)}"]`);
        item?.classList.remove('is-unread');
        const badge = notificationBell?.querySelector('i');
        paintNotificationCount(Math.max(0, (Number(badge?.textContent) || 0) - 1));
      }
    } catch (_) {}
  }
  if (homeProfile && homeProfileAvatar) {
    const currentReturnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const discordLoginUrl = `/api/auth/discord?return=${encodeURIComponent(currentReturnPath)}`;
    let profileAuthenticated = false;
    let profileHref = '/perfil/';

    const renderDiscordConnect = () => {
      profileAuthenticated = false;
      profileHref = '/perfil/';
      homeProfile.classList.remove('is-authenticated');
      homeProfile.classList.add('is-disconnected');
      homeProfileAvatar.hidden = true;
      homeProfileAvatar.removeAttribute('src');
      if (homeProfileFallback) {
        homeProfileFallback.innerHTML = `<svg class="profile__discord-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M19.5 5.3A17 17 0 0 0 15.4 4l-.5 1.1a15 15 0 0 0-5.8 0L8.6 4a17 17 0 0 0-4.1 1.3C1.9 9.2 1.2 13 1.5 16.8a17 17 0 0 0 5 2.5l1.2-1.7c-.7-.3-1.4-.7-2-1.2l.5-.4c3.8 1.8 7.8 1.8 11.6 0l.5.4c-.6.5-1.3.9-2 1.2l1.2 1.7a17 17 0 0 0 5-2.5c.4-4.4-.8-8.1-3-11.5ZM8.5 14.5c-1.2 0-2.1-1.1-2.1-2.5s.9-2.5 2.1-2.5 2.1 1.1 2.1 2.5-.9 2.5-2.1 2.5Zm7 0c-1.2 0-2.1-1.1-2.1-2.5s.9-2.5 2.1-2.5 2.1 1.1 2.1 2.5-.9 2.5-2.1 2.5Z"/></svg><span class="profile__connect-label">CONECTAR</span>`;
      }
      homeProfile.title = 'Conectar con Discord';
      homeProfile.setAttribute('aria-label', 'Conectar con Discord');
      if (notificationBell) notificationBell.hidden = true;
      if (accountMenu) accountMenu.hidden = true;
    };

    renderDiscordConnect();

    homeProfile.addEventListener('click', (event) => {
      event.stopPropagation();
      if(!profileAuthenticated){ window.location.assign(discordLoginUrl); return; }
      if(notificationPanel) notificationPanel.hidden = true;
      if(accountMenu) accountMenu.hidden = !accountMenu.hidden;
    });
    accountMenu?.addEventListener('click', async (event) => {
      event.stopPropagation();
      const action = event.target.closest('[data-account-action]')?.dataset.accountAction;
      if(!action) return;
      if(action==='share'){
        event.preventDefault();
        const url=new URL(profileHref,location.origin).href;
        const status=accountMenu.querySelector('.topbar-profile-menu__status');
        try{await navigator.clipboard.writeText(url);if(status)status.textContent='Enlace del perfil copiado.';}
        catch{if(status)status.textContent=url;}
        return;
      }
      if(action==='logout'){
        event.preventDefault();
        const button=event.target.closest('button');if(button)button.disabled=true;
        try{await fetchWithTimeout('/api/auth/logout',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':notificationCsrfToken||''}});}catch(_){}
        location.assign('/');
      }
    });

    const defaultDiscordAvatar = (id) => {
      try { return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(id) >> 22n) % 6}.png`; }
      catch (_) { return 'https://cdn.discordapp.com/embed/avatars/0.png'; }
    };

    sessionPromise.then((session) => {
        if (!session?.authenticated || !session?.user?.id) {
          renderDiscordConnect();
          return;
        }
        profileAuthenticated = true;
        const user = session.user;
        profileHref = `/perfil/${encodeURIComponent(user.id)}`;
        homeProfile.classList.remove('is-disconnected');
        homeProfile.classList.add('is-authenticated');
        if (homeProfileFallback) {
          homeProfileFallback.textContent = '♜';
        }
        homeProfileAvatar.src = user.profilePhoto || (user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=128`
          : defaultDiscordAvatar(user.id));
        homeProfileAvatar.alt = `Avatar de ${user.displayName || user.username}`;
        homeProfileAvatar.width = 128;
        homeProfileAvatar.height = 128;
        homeProfileAvatar.decoding = 'async';
        homeProfileAvatar.hidden = false;
        homeProfile.title = `Abrir menú de ${user.displayName || user.username}`;
        homeProfile.setAttribute('aria-label', `Abrir menú de ${user.displayName || user.username}`);
        if(accountMenu){
          const view=accountMenu.querySelector('[data-account-action="view"]'); if(view)view.href=profileHref;
          const edit=accountMenu.querySelector('[data-account-action="edit"]'); if(edit)edit.href='/perfil/editar';
          const img=accountMenu.querySelector('.topbar-profile-menu__head img'); if(img){img.src=homeProfileAvatar.src;img.alt='';}
          const small=accountMenu.querySelector('.topbar-profile-menu__head small'); if(small)small.textContent=`@${user.username||user.displayName||'usuario'}`;
        }
        if (notificationBell) {
          notificationBell.hidden = false;
          notificationCsrfToken = session.csrfToken || '';
          refreshNotifications();
          clearInterval(notificationRefreshTimer);
          notificationRefreshTimer = window.setInterval(refreshNotifications, 60000);
        }
      })
      .catch(renderDiscordConnect);
  }


  window.addEventListener('focus', () => refreshNotifications());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshNotifications(); });

  // Efectos decorativos no críticos: se crean en tiempo ocioso y en menor cantidad.
  const emberField = document.getElementById('embers');
  if (emberField && !reducedMotion) {
    onIdle(() => {
      const count = lowPower ? 8 : 16;
      const fragment = document.createDocumentFragment();
      const sides = ['left', 'right', 'top', 'bottom'];
      for (let i = 0; i < boltCount; i += 1) {
        const svg = document.createElementNS(svgNs, 'svg');
        const side = sides[Math.floor(Math.random() * sides.length)];
        svg.classList.add('hero-lightning', `hero-lightning--${side}`);
        svg.setAttribute('viewBox', '0 0 420 130');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.style.opacity = `0.1945268087423506`;
        svg.style.setProperty('--bolt-width', `368.7286819378263px`);
        svg.style.setProperty('--bolt-width-mobile', `181.70391425649635px`);
        svg.style.setProperty('--bolt-speed', `8.353652331601696s`);
        svg.style.setProperty('--bolt-delay', `-3.281882786300537s`);
        if (side === 'left') {
          svg.style.left = `-3.1430937666555523%`;
          svg.style.top = `47.56746411584599%`;
          svg.style.setProperty('--bolt-transform', `rotate(${-10 + Math.random() * 20}deg)`);
        } else if (side === 'right') {
          svg.style.right = `-1.087058386824554%`;
          svg.style.top = `15.725354647573319%`;
          svg.style.setProperty('--bolt-transform', `scaleX(-1) rotate(${-10 + Math.random() * 20}deg)`);
        } else if (side === 'top') {
          svg.style.left = `37.574128006307475%`;
          svg.style.top = `5.232883246733344%`;
          svg.style.setProperty('--bolt-transform', `rotate(${68 + Math.random() * 28}deg)`);
        } else {
          svg.style.left = `11.128624714311485%`;
          svg.style.top = `60.73682022656959%`;
          svg.style.setProperty('--bolt-transform', `rotate(${-96 + Math.random() * 28}deg)`);
        }

        const points = makePoints();
        const glow = document.createElementNS(svgNs, 'polyline');
        glow.classList.add('lightning-glow');
        glow.setAttribute('points', points);
        const core = document.createElementNS(svgNs, 'polyline');
        core.classList.add('lightning-core');
        core.setAttribute('points', points);
        svg.append(glow, core);
        fragment.appendChild(svg);
      }
      lightningField.appendChild(fragment);
    }, 1100);
  }

  // Parallax del logo agrupado a un solo cálculo por frame.
  const hero = document.querySelector('.hero');
  const logoWrap = document.querySelector('.hero__logo-wrap');
  if (hero && logoWrap && !reducedMotion && finePointer && !lowPower) {
    let heroRect = null;
    let pointerEvent = null;
    let pointerFrame = 0;
    const cacheHeroRect = () => { heroRect = hero.getBoundingClientRect(); };
    hero.addEventListener('pointerenter', cacheHeroRect, { passive: true });
    window.addEventListener('resize', cacheHeroRect, { passive: true });
    hero.addEventListener('pointermove', (event) => {
      pointerEvent = event;
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        if (!heroRect || !pointerEvent) return;
        const x = ((pointerEvent.clientX - heroRect.left) / heroRect.width - 0.5) * 20;
        const y = ((pointerEvent.clientY - heroRect.top) / heroRect.height - 0.5) * 14;
        logoWrap.style.translate = `${x}px ${y}px`;
        logoWrap.style.rotate = `${x * 0.03}deg`;
      });
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
      pointerEvent = null;
      logoWrap.style.translate = '';
      logoWrap.style.rotate = '';
    }, { passive: true });
  }

  const revealItems = document.querySelectorAll('.reveal');
  if (reducedMotion) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px 80px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  // El carrusel solo mantiene su temporizador cuando realmente está visible.
  const carousel = document.getElementById('showcaseCarousel');
  if (carousel) {
    const slides = Array.from(carousel.querySelectorAll('.showcase-slide'));
    const dots = Array.from(carousel.querySelectorAll('.carousel-dot'));
    const prev = carousel.querySelector('.carousel-arrow--prev');
    const next = carousel.querySelector('.carousel-arrow--next');
    const current = document.getElementById('carouselCurrent');
    const progress = carousel.querySelector('.carousel-progress span');
    let index = 0;
    let timer = 0;
    let carouselVisible = false;

    const restartProgress = () => {
      if (!progress || reducedMotion) return;
      progress.classList.remove('is-running');
      requestAnimationFrame(() => requestAnimationFrame(() => progress.classList.add('is-running')));
    };

    const showSlide = (nextIndex) => {
      index = (nextIndex + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
      dots.forEach((dot, dotIndex) => {
        const active = dotIndex === index;
        dot.classList.toggle('is-active', active);
        active ? dot.setAttribute('aria-current', 'true') : dot.removeAttribute('aria-current');
      });
      if (current) current.textContent = String(index + 1).padStart(2, '0');
      restartProgress();
    };

    const stopTimer = () => {
      if (timer) window.clearInterval(timer);
      timer = 0;
    };
    const startTimer = () => {
      stopTimer();
      if (reducedMotion || !carouselVisible || document.hidden) return;
      timer = window.setInterval(() => showSlide(index + 1), 5000);
    };
    const manualMove = (nextIndex) => { showSlide(nextIndex); startTimer(); };

    prev?.addEventListener('click', () => manualMove(index - 1));
    next?.addEventListener('click', () => manualMove(index + 1));
    dots.forEach((dot, dotIndex) => dot.addEventListener('click', () => manualMove(dotIndex)));

    let touchStartX = 0;
    carousel.addEventListener('touchstart', (event) => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
    carousel.addEventListener('touchend', (event) => {
      const diff = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) > 48) manualMove(index + (diff < 0 ? 1 : -1));
    }, { passive: true });

    if ('IntersectionObserver' in window) {
      const visibilityObserver = new IntersectionObserver(([entry]) => {
        carouselVisible = Boolean(entry?.isIntersecting);
        carouselVisible ? startTimer() : stopTimer();
      }, { rootMargin: '250px 0px', threshold: 0.01 });
      visibilityObserver.observe(carousel);
    } else {
      carouselVisible = true;
      startTimer();
    }
    document.addEventListener('visibilitychange', () => document.hidden ? stopTimer() : startTimer());
    restartProgress();
  }

  // Tarjetas 3D: se actualizan como máximo una vez por frame y sin medir el DOM en cada pointermove.
  if (!reducedMotion && finePointer && !lowPower) {
    document.querySelectorAll('.interactive-card').forEach((card) => {
      let rect = null;
      let lastEvent = null;
      let frame = 0;
      card.addEventListener('pointerenter', () => { rect = card.getBoundingClientRect(); }, { passive: true });
      card.addEventListener('pointermove', (event) => {
        lastEvent = event;
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (!rect || !lastEvent) return;
          const px = (lastEvent.clientX - rect.left) / rect.width;
          const py = (lastEvent.clientY - rect.top) / rect.height;
          const rotateY = (px - 0.5) * 2.1;
          const rotateX = (0.5 - py) * 2.1;
          card.style.setProperty('--mx', `${px * 100}%`);
          card.style.setProperty('--my', `${py * 100}%`);
          card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
        });
      }, { passive: true });
      card.addEventListener('pointerleave', () => {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        rect = null;
        lastEvent = null;
        card.style.transform = '';
      }, { passive: true });
    });
  }
})();

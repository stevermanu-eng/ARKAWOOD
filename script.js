(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer:fine)').matches;
  const lowPower = (navigator.deviceMemory && navigator.deviceMemory <= 4)
    || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
    || window.innerWidth < 700;

  const onIdle = (callback, timeout = 1000) => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(callback, { timeout });
    else window.setTimeout(callback, Math.min(timeout, 350));
  };

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
    window.location.href = '/construccion.html';
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

  // Perfil de Discord: conserva el botón existente, fuerza un avatar perfectamente circular
  // y, si no hay sesión, usa el propio botón para iniciar sesión con Discord.
  const homeProfile = document.getElementById('homeProfile');
  const homeProfileAvatar = document.getElementById('homeProfileAvatar');
  if (homeProfile && homeProfileAvatar) {
    const currentReturnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const discordLoginUrl = `/api/auth/discord?return=${encodeURIComponent(currentReturnPath)}`;
    let profileAuthenticated = false;

    homeProfile.addEventListener('click', () => {
      if (!profileAuthenticated) window.location.href = discordLoginUrl;
    });

    const defaultDiscordAvatar = (id) => {
      try { return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(id) >> 22n) % 6}.png`; }
      catch (_) { return 'https://cdn.discordapp.com/embed/avatars/0.png'; }
    };

    fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((session) => {
        if (!session?.authenticated || !session?.user?.id) {
          homeProfile.title = 'Iniciar sesión con Discord';
          homeProfile.setAttribute('aria-label', 'Iniciar sesión con Discord');
          return;
        }
        profileAuthenticated = true;
        const user = session.user;
        homeProfileAvatar.src = user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=128`
          : defaultDiscordAvatar(user.id);
        homeProfileAvatar.alt = `Avatar de ${user.displayName || user.username}`;
        homeProfileAvatar.width = 128;
        homeProfileAvatar.height = 128;
        homeProfileAvatar.decoding = 'async';
        homeProfileAvatar.hidden = false;
        homeProfile.classList.add('is-authenticated');
        homeProfile.title = `Discord: ${user.displayName || user.username}`;
        homeProfile.setAttribute('aria-label', `Sesión de Discord: ${user.displayName || user.username}`);
      })
      .catch(() => {
        homeProfile.title = 'Iniciar sesión con Discord';
        homeProfile.setAttribute('aria-label', 'Iniciar sesión con Discord');
      });
  }

  // Efectos decorativos no críticos: se crean en tiempo ocioso y en menor cantidad.
  const emberField = document.getElementById('embers');
  if (emberField && !reducedMotion) {
    onIdle(() => {
      const count = lowPower ? 8 : 16;
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < count; i += 1) {
        const ember = document.createElement('span');
        ember.className = 'ember';
        ember.style.left = `${Math.random() * 100}%`;
        ember.style.animationDuration = `${8 + Math.random() * 12}s`;
        ember.style.animationDelay = `${-Math.random() * 15}s`;
        ember.style.setProperty('--drift', `${-55 + Math.random() * 110}px`);
        ember.style.opacity = `${0.08 + Math.random() * 0.28}`;
        fragment.appendChild(ember);
      }
      emberField.appendChild(fragment);
    }, 850);
  }

  const lightningField = document.getElementById('heroLightning');
  if (lightningField && !reducedMotion) {
    onIdle(() => {
      const svgNs = 'http://www.w3.org/2000/svg';
      const boltCount = lowPower ? 2 : 5;
      const makePoints = () => {
        const points = [];
        const steps = 9 + Math.floor(Math.random() * 4);
        for (let i = 0; i <= steps; i += 1) {
          const x = (420 / steps) * i;
          const wave = Math.sin(i * 1.55) * (10 + Math.random() * 7);
          const jitter = (Math.random() - 0.5) * 22;
          const y = 65 + wave + jitter;
          points.push(`${x.toFixed(1)},${Math.max(8, Math.min(122, y)).toFixed(1)}`);
        }
        return points.join(' ');
      };

      const fragment = document.createDocumentFragment();
      for (let i = 0; i < boltCount; i += 1) {
        const svg = document.createElementNS(svgNs, 'svg');
        const direction = i % 2 === 0 ? 'left' : 'right';
        svg.classList.add('hero-lightning', `hero-lightning--${direction}`);
        svg.setAttribute('viewBox', '0 0 420 130');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.style.top = `${8 + Math.random() * 65}%`;
        svg.style.setProperty('--bolt-width', `${430 + Math.random() * 280}px`);
        svg.style.setProperty('--bolt-width-mobile', `${280 + Math.random() * 150}px`);
        svg.style.setProperty('--bolt-speed', `${10 + Math.random() * 7}s`);
        svg.style.setProperty('--bolt-delay', `${-Math.random() * 16}s`);
        svg.style.setProperty('--bolt-fall', `${-40 + Math.random() * 80}px`);
        svg.style.setProperty('--bolt-rotate', `${-6 + Math.random() * 12}deg`);

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

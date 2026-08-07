(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.dummy').forEach((element) => {
    element.addEventListener('click', (event) => {
      event.preventDefault();
      element.blur();
    });
  });

  const topbar = document.getElementById('topbar');
  const updateTopbar = () => {
    if (!topbar) return;
    topbar.classList.toggle('is-scrolled', window.scrollY > 20);
  };
  updateTopbar();
  window.addEventListener('scroll', updateTopbar, { passive: true });

  const emberField = document.getElementById('embers');
  if (emberField && !reducedMotion) {
    const count = window.innerWidth < 700 ? 16 : 30;
    for (let i = 0; i < count; i += 1) {
      const ember = document.createElement('span');
      ember.className = 'ember';
      ember.style.left = `${Math.random() * 100}%`;
      ember.style.animationDuration = `${7 + Math.random() * 11}s`;
      ember.style.animationDelay = `${-Math.random() * 15}s`;
      ember.style.setProperty('--drift', `${-65 + Math.random() * 130}px`);
      ember.style.opacity = `${0.1 + Math.random() * 0.38}`;
      emberField.appendChild(ember);
    }
  }

  const lightningField = document.getElementById('heroLightning');
  if (lightningField && !reducedMotion) {
    const svgNs = 'http://www.w3.org/2000/svg';
    const boltCount = window.innerWidth < 700 ? 4 : 8;

    const makePoints = () => {
      const points = [];
      const steps = 10 + Math.floor(Math.random() * 5);
      for (let i = 0; i <= steps; i += 1) {
        const x = (420 / steps) * i;
        const wave = Math.sin(i * 1.55) * (11 + Math.random() * 9);
        const jitter = (Math.random() - 0.5) * 26;
        const y = 65 + wave + jitter;
        points.push(`${x.toFixed(1)},${Math.max(8, Math.min(122, y)).toFixed(1)}`);
      }
      return points.join(' ');
    };

    for (let i = 0; i < boltCount; i += 1) {
      const svg = document.createElementNS(svgNs, 'svg');
      const direction = i % 2 === 0 ? 'left' : 'right';
      svg.classList.add('hero-lightning', `hero-lightning--${direction}`);
      svg.setAttribute('viewBox', '0 0 420 130');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.style.top = `${7 + Math.random() * 67}%`;
      svg.style.setProperty('--bolt-width', `${430 + Math.random() * 330}px`);
      svg.style.setProperty('--bolt-width-mobile', `${300 + Math.random() * 180}px`);
      svg.style.setProperty('--bolt-speed', `${8.5 + Math.random() * 7}s`);
      svg.style.setProperty('--bolt-delay', `${-Math.random() * 16}s`);
      svg.style.setProperty('--bolt-fall', `${-50 + Math.random() * 100}px`);
      svg.style.setProperty('--bolt-rotate', `${-7 + Math.random() * 14}deg`);

      const points = makePoints();
      const glow = document.createElementNS(svgNs, 'polyline');
      glow.classList.add('lightning-glow');
      glow.setAttribute('points', points);
      const core = document.createElementNS(svgNs, 'polyline');
      core.classList.add('lightning-core');
      core.setAttribute('points', points);
      svg.append(glow, core);
      lightningField.appendChild(svg);
    }
  }

  const hero = document.querySelector('.hero');
  const logoWrap = document.querySelector('.hero__logo-wrap');
  if (hero && logoWrap && !reducedMotion && window.matchMedia('(pointer:fine)').matches) {
    hero.addEventListener('pointermove', (event) => {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 22;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 16;
      logoWrap.style.translate = `${x}px ${y}px`;
      logoWrap.style.rotate = `${x * 0.035}deg`;
    });
    hero.addEventListener('pointerleave', () => {
      logoWrap.style.translate = '';
      logoWrap.style.rotate = '';
    });
  }

  const revealItems = document.querySelectorAll('.reveal');
  if (reducedMotion) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -35px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const carousel = document.getElementById('showcaseCarousel');
  if (carousel) {
    const slides = Array.from(carousel.querySelectorAll('.showcase-slide'));
    const dots = Array.from(carousel.querySelectorAll('.carousel-dot'));
    const prev = carousel.querySelector('.carousel-arrow--prev');
    const next = carousel.querySelector('.carousel-arrow--next');
    const current = document.getElementById('carouselCurrent');
    const progress = carousel.querySelector('.carousel-progress span');
    let index = 0;
    let timer = null;

    const restartProgress = () => {
      if (!progress || reducedMotion) return;
      progress.style.animation = 'none';
      void progress.offsetWidth;
      progress.style.animation = 'carousel-progress 5s linear infinite';
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

    const startTimer = () => {
      window.clearInterval(timer);
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

    if (!reducedMotion) startTimer();
  }

  if (!reducedMotion && window.matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.interactive-card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        const rotateY = (px - 0.5) * 2.4;
        const rotateX = (0.5 - py) * 2.4;
        card.style.setProperty('--mx', `${px * 100}%`);
        card.style.setProperty('--my', `${py * 100}%`);
        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }
})();

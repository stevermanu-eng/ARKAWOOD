
(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = document.getElementById('storeHero');
  const heroBg = document.getElementById('storeHeroBg');
  const particles = document.getElementById('storeParticles');
  if (particles && !reducedMotion) {
    const fragment = document.createDocumentFragment();
    const lowPower = window.innerWidth < 720 || navigator.connection?.saveData === true;
    const particleCount = lowPower ? 12 : 36;
    for (let i = 0; i < particleCount; i += 1) {
      const particle = document.createElement('i');
      particle.className = 'store-particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.setProperty('--dur', `${7 + Math.random() * 8}s`);
      particle.style.setProperty('--delay', `${-Math.random() * 13}s`);
      particle.style.setProperty('--drift', `${-55 + Math.random() * 110}px`);
      fragment.appendChild(particle);
    }
    particles.appendChild(fragment);
  }
  if (hero && heroBg && !reducedMotion) {
    let ticking = false;
    const updateHero = () => {
      const rect = hero.getBoundingClientRect();
      const progress = Math.min(Math.max((-rect.top) / Math.max(hero.offsetHeight, 1), 0), 1);
      heroBg.style.transform = `scale(${1.07 + progress * .05}) translateY(${progress * 26}px)`;
      ticking = false;
    };
    const schedule = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateHero);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    updateHero();
  }
  const revealItems = Array.from(document.querySelectorAll('.store-reveal'));
  if ('IntersectionObserver' in window && !reducedMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -4% 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!reducedMotion && finePointer) {
    document.querySelectorAll('[data-store-card]').forEach((card) => {
      card.addEventListener('mousemove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        card.style.transform = `perspective(1100px) rotateX(${(-y * 2.2).toFixed(2)}deg) rotateY(${(x * 2.8).toFixed(2)}deg) translateY(-4px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }
  const links = Array.from(document.querySelectorAll('[data-store-tab]'));
  const sections = Array.from(document.querySelectorAll('[data-store-section]'));
  const activateStoreSection = (key, updateHash = true) => {
    if (!sections.length) return;
    const exists = sections.some((section) => section.getAttribute('data-store-section') === key);
    if (!exists) return;
    sections.forEach((section) => {
      const active = section.getAttribute('data-store-section') === key;
      section.hidden = !active;
      section.setAttribute('aria-hidden', active ? 'false' : 'true');
      if (active) section.querySelectorAll('.store-reveal').forEach((item) => item.classList.add('is-visible'));
    });
    links.forEach((link) => {
      const active = link.getAttribute('data-store-tab') === key;
      link.classList.toggle('is-active', active);
      link.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (updateHash) history.replaceState(null, '', `#${key}`);
  };
  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      const key = link.getAttribute('data-store-tab');
      if (!key) return;
      event.preventDefault();
      activateStoreSection(key);
      document.querySelector('.store-catalog')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });
  if (sections.length) {
    const initialKey = location.hash === '#permanentes' ? 'permanentes' : 'temporales';
    activateStoreSection(initialKey, false);
    window.addEventListener('hashchange', () => {
      if (location.hash === '#permanentes' || location.hash === '#temporales') {
        activateStoreSection(location.hash.slice(1), false);
      }
    });
  }
})();

/* v8.35 — glow reactivo del hero y pulso de tarjetas */
(() => {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero=document.getElementById('storeHero');
  const fine=window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if(hero&&fine){
    hero.addEventListener('pointermove',(event)=>{
      const rect=hero.getBoundingClientRect();
      hero.style.setProperty('--store-glow-x',`${((event.clientX-rect.left)/Math.max(rect.width,1)*100).toFixed(1)}%`);
      hero.style.setProperty('--store-glow-y',`${((event.clientY-rect.top)/Math.max(rect.height,1)*100).toFixed(1)}%`);
    },{passive:true});
    hero.addEventListener('pointerleave',()=>{hero.style.setProperty('--store-glow-x','50%');hero.style.setProperty('--store-glow-y','42%');});
  }
  document.querySelectorAll('.store-rank-card').forEach((card,index)=>{
    card.style.setProperty('--motion-delay',`${index*60}ms`);
    card.addEventListener('pointerenter',()=>card.classList.add('is-motion-active'));
    card.addEventListener('pointerleave',()=>card.classList.remove('is-motion-active'));
  });
})();

/* v8.36 — acceso directo desde el bloque de apoyo a una categoría de la tienda. */
(() => {
  document.querySelectorAll('[data-support-store-tab]').forEach((link)=>{
    link.addEventListener('click',(event)=>{
      const key=link.getAttribute('data-support-store-tab');
      const tab=document.querySelector(`[data-store-tab="${CSS.escape(key||'')}"]`);
      if(!tab)return;
      event.preventDefault();
      tab.click();
    });
  });
})();

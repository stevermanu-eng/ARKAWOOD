(() => {
  'use strict';

  const heroImage = document.getElementById('membersHeroImage');
  const hero = document.getElementById('membersHero');
  const updateHeroFade = () => {
    if (!heroImage || !hero) return;
    const rect = hero.getBoundingClientRect();
    const height = Math.max(hero.offsetHeight, 1);
    const progress = Math.min(Math.max((-rect.top) / height, 0), 1);
    heroImage.style.opacity = String(Math.max(0.22, 1 - progress * 0.78));
    heroImage.style.transform = `scale(${1.035 + progress * 0.035}) translateY(${progress * 18}px)`;
  };
  let heroTicking = false;
  const scheduleHeroFade = () => {
    if (heroTicking) return;
    heroTicking = true;
    requestAnimationFrame(() => { updateHeroFade(); heroTicking = false; });
  };
  window.addEventListener('scroll', scheduleHeroFade, { passive: true });
  window.addEventListener('resize', scheduleHeroFade, { passive: true });
  updateHeroFade();

  const ownerData = [
    {
      handle: '@yadihel.idk',
      username: 'yadihel.idk',
      role: 'OWNER · DIRECCIÓN Y COMUNIDAD',
      description: 'Forma parte de la propiedad de ARKA WOOD y participa en la dirección general del proyecto, ayudando a mantener una visión común entre comunidad, identidad y decisiones de crecimiento.',
      url: 'https://www.instagram.com/yadihel.idk/'
    },
    {
      handle: '@joana.slgg',
      username: 'joana.slgg',
      role: 'OWNER · IDENTIDAD Y EXPERIENCIA',
      description: 'Forma parte de la propiedad de ARKA WOOD y apoya la construcción de una identidad consistente para el proyecto, aportando criterio a la experiencia de la comunidad y a la forma en la que el mundo se presenta.',
      url: 'https://www.instagram.com/joana.slgg'
    },
    {
      handle: '@stever_manu',
      username: 'stever_manu',
      role: 'OWNER · DIRECCIÓN DEL PROYECTO',
      description: 'Forma parte de la propiedad de ARKA WOOD y participa en la coordinación general de la Network, conectando la visión del proyecto con su organización, desarrollo técnico y preparación a largo plazo.',
      url: 'https://www.instagram.com/stever_manu/'
    }
  ];

  const showcase = document.getElementById('ownersShowcase');
  const avatars = Array.from(document.querySelectorAll('.owner-avatar'));
  const ownerIndex = document.getElementById('ownerIndex');
  const ownerRole = document.getElementById('ownerRole');
  const ownerName = document.getElementById('ownerName');
  const ownerDescription = document.getElementById('ownerDescription');
  const ownerInstagram = document.getElementById('ownerInstagram');
  const ownerFeaturedLink = document.getElementById('ownerFeaturedLink');
  const ownerFeaturedAvatar = document.getElementById('ownerFeaturedAvatar');

  let currentOwner = Math.floor(Math.random() * ownerData.length);
  let ownerTimer = null;
  let ownerPaused = false;

  const showOwner = (index) => {
    currentOwner = index;
    const owner = ownerData[index];
    avatars.forEach((avatar, avatarIndex) => {
      const active = avatarIndex === index;
      avatar.classList.toggle('is-active', active);
      avatar.setAttribute('aria-current', active ? 'true' : 'false');
    });
    if (ownerIndex) ownerIndex.textContent = String(index + 1).padStart(2, '0');
    if (ownerRole) ownerRole.textContent = owner.role;
    if (ownerName) ownerName.textContent = owner.handle;
    if (ownerDescription) ownerDescription.textContent = owner.description;
    if (ownerInstagram) {
      ownerInstagram.href = owner.url;
      ownerInstagram.setAttribute('aria-label', `Abrir Instagram de ${owner.handle}`);
    }
    if (ownerFeaturedLink) {
      ownerFeaturedLink.href = owner.url;
      ownerFeaturedLink.setAttribute('aria-label', `Instagram de ${owner.handle}`);
    }
    if (ownerFeaturedAvatar) {
      ownerFeaturedAvatar.hidden = false;
      ownerFeaturedAvatar.src = `https://unavatar.io/instagram/${encodeURIComponent(owner.username)}`;
      ownerFeaturedAvatar.alt = `Foto destacada de ${owner.handle}`;
    }
  };

  const chooseDifferentOwner = () => {
    if (ownerData.length < 2) return currentOwner;
    let next = currentOwner;
    while (next === currentOwner) next = Math.floor(Math.random() * ownerData.length);
    return next;
  };
  const startOwnerRotation = () => {
    clearInterval(ownerTimer);
    ownerTimer = window.setInterval(() => {
      if (!ownerPaused) showOwner(chooseDifferentOwner());
    }, 5200);
  };

  avatars.forEach((avatar, index) => {
    const activate = () => { ownerPaused = true; showOwner(index); };
    avatar.addEventListener('mouseenter', activate);
    avatar.addEventListener('focus', activate);
    avatar.addEventListener('mouseleave', () => { ownerPaused = false; });
    avatar.addEventListener('blur', () => { ownerPaused = false; });
  });
  showcase?.addEventListener('mouseenter', () => { ownerPaused = true; });
  showcase?.addEventListener('mouseleave', () => { ownerPaused = false; });

  document.querySelectorAll('.owner-avatar img, .donor-pill--profile img, .owner-info__portrait img').forEach((image) => {
    image.addEventListener('error', () => {
      image.hidden = true;
      image.closest('.owner-avatar, .donor-pill--profile, .owner-info__portrait')?.classList.add('avatar-load-failed');
    });
  });

  showOwner(currentOwner);
  startOwnerRotation();

  const donorMarquee = document.getElementById('donorMarquee');
  donorMarquee?.addEventListener('mouseenter', () => donorMarquee.classList.add('is-paused'));
  donorMarquee?.addEventListener('mouseleave', () => donorMarquee.classList.remove('is-paused'));
})();

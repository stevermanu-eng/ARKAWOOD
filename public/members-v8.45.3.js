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
      discordId: '1290118757888294912',
      handle: '@stever_manu',
      username: 'stever_manu',
      role: 'DEIDAD',
      divinity: '✧ DEIDAD DEL ÁRBOL SAGRADO ✧',
      theme: 'tree',
      frame: '/assets/member-frames/deidad-arbol-sagrado-frame-v8.43.0.webp',
      descriptionHtml: '',
      socialLinks: {},
      externalUrl: '',
      url: '/perfil/1290118757888294912',
      avatar: '/assets/member-stever-manu-v8.14.0.webp',
      profileUrl: '/perfil/1290118757888294912',
      registered: true
    },
    {
      discordId: '984129773179646003',
      handle: '',
      username: '',
      role: 'DEIDAD',
      divinity: '✦ DEIDAD SUPREMA ✦',
      theme: 'supreme',
      frame: '/assets/member-frames/deidad-suprema-frame-v8.43.0.webp',
      descriptionHtml: '',
      socialLinks: {},
      // El enlace de Instagram se conserva; el nombre/avatar/biografía se cargan únicamente desde el perfil web real.
      externalUrl: 'https://www.instagram.com/joana.slgg',
      url: 'https://www.instagram.com/joana.slgg',
      avatar: '',
      profileUrl: '/perfil/984129773179646003',
      registered: false
    },
    {
      discordId: '1052673571429810186',
      handle: '',
      username: '',
      role: 'DEIDAD',
      divinity: '✠ DEIDAD DEL INFRAMUNDO ✠',
      theme: 'demonic',
      frame: '/assets/member-frames/deidad-demoniaca-frame-v8.44.0.webp',
      descriptionHtml: '',
      socialLinks: {},
      // El enlace de Instagram se conserva; el nombre/avatar/biografía se cargan únicamente desde el perfil web real.
      externalUrl: 'https://www.instagram.com/yadihel.idk/',
      url: 'https://www.instagram.com/yadihel.idk/',
      avatar: '',
      profileUrl: '/perfil/1052673571429810186',
      registered: false
    }
  ];

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  const safeOwnerColor = (value) => {
    const color = String(value || '').trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(color)) return color;
    if (/^#[0-9a-f]{3}$/.test(color)) return `#${color.slice(1).split('').map((c) => c + c).join('')}`;
    const rgb = color.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
    if (!rgb) return '';
    const values = rgb.slice(1, 4).map((item) => Math.max(0, Math.min(255, Number(item))));
    return `#${values.map((item) => item.toString(16).padStart(2, '0')).join('')}`;
  };

  const sanitizeOwnerLegacyBio = (value) => {
    if (typeof DOMParser === 'undefined') return '';
    const documentFragment = new DOMParser().parseFromString(`<body>${String(value || '')}</body>`, 'text/html');
    const allowedBlocks = new Set(['p','div','blockquote','ul','ol','li','h3','h4']);
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent || '');
      if (node.nodeType !== Node.ELEMENT_NODE) return '';
      const tag = node.tagName.toLowerCase();
      const inner = Array.from(node.childNodes).map(walk).join('');
      if (tag === 'br') return '<br>';
      if (tag === 'strong' || tag === 'b') return `<strong>${inner}</strong>`;
      if (tag === 'em' || tag === 'i') return `<em>${inner}</em>`;
      if (tag === 'u') return `<u>${inner}</u>`;
      if (tag === 's' || tag === 'strike') return `<s>${inner}</s>`;
      if (tag === 'code') return `<code>${inner}</code>`;
      if (tag === 'a') {
        const href = safeSocialUrl(node.getAttribute('href'));
        const color = safeOwnerColor(node.style?.color || node.getAttribute('color'));
        const style = color ? ` style="color:${color}!important"` : '';
        return href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer nofollow"${style}>${inner}</a>` : inner;
      }
      if (tag === 'span' || tag === 'font') {
        const color = safeOwnerColor(node.style?.color || node.getAttribute('color'));
        return color ? `<span class="profile-text-color" style="color:${color}">${inner}</span>` : inner;
      }
      if (allowedBlocks.has(tag)) {
        const safeTag = tag === 'div' ? 'p' : tag;
        return `<${safeTag}>${inner}</${safeTag}>`;
      }
      return inner;
    };
    return Array.from(documentFragment.body.childNodes).map(walk).join('');
  };

  const renderOwnerBio = (value) => {
    const raw = String(value || '').replace(/\r\n?/g, '\n').trim();
    if (!raw) return '';
    // Compatibilidad con descripciones guardadas por editores anteriores que usaban HTML.
    if (/<\/?(?:p|div|span|font|a|strong|b|em|i|u|s|strike|blockquote|ul|ol|li|h3|h4|code|br)\b/i.test(raw)) {
      const legacy = sanitizeOwnerLegacyBio(raw);
      if (legacy) return legacy;
    }
    const shared = window.arkaProfileRichText?.render?.(raw);
    if (shared) return shared;
    // Respaldo seguro si el módulo compartido todavía no terminó de cargar.
    const links = [];
    const token = (label, url) => {
      const index = links.push({ label:String(label || url || ''), url:String(url || '') }) - 1;
      return `ARKAOWNERLINK${index}TOKEN`;
    };
    let prepared = raw.replace(/\[([^\]\n]+)\]\((https:\/\/[^)\s]+)\)/g, (_match, label, url) => token(label, url));
    prepared = prepared.replace(/https:\/\/[^\s<>"']+/g, (match) => token(match, match));
    const safe = escapeHtml(prepared)
      .replace(/\[fg=(#[0-9a-f]{6})\]/gi, '<span class="profile-text-color" style="color:$1">')
      .replace(/\[\/fg\]/gi, '</span>')
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>')
      .replace(/__([^_\n]+)__/g, '<u>$1</u>')
      .replace(/~~([^~\n]+)~~/g, '<s>$1</s>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/ARKAOWNERLINK(\d+)TOKEN/g, (_match, index) => {
        const item = links[Number(index)] || { label:'', url:'' };
        const href = safeSocialUrl(item.url);
        return href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(item.label)}</a>` : escapeHtml(item.label);
      });
    return safe.split('\n').map((line) => line ? `<p>${line}</p>` : '<div class="profile-rich-spacer"></div>').join('');
  };

  const defaultDiscordAvatar = (id) => {
    try { return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(id) >> 22n) % 6n)}.png`; }
    catch { return 'https://cdn.discordapp.com/embed/avatars/0.png'; }
  };
  const profileAvatar = (profile) => profile?.profilePhoto || (profile?.discordAvatar
    ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.discordAvatar}.webp?size=512`
    : defaultDiscordAvatar(profile?.id));

  const OWNER_SOCIALS = [
    { key:'instagram', label:'Instagram' },
    { key:'facebook', label:'Facebook' },
    { key:'youtube', label:'YouTube' },
    { key:'twitter', label:'X' }
  ];
  const safeSocialUrl = (value) => {
    try {
      const url = new URL(String(value || '').trim());
      if (url.protocol !== 'https:' || url.username || url.password) return '';
      return url.toString();
    } catch { return ''; }
  };

  async function fetchJson(url, options = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await window.fetch(url, { ...options, signal:controller.signal });
      const data = await response.json().catch(() => ({}));
      return { response, data };
    } finally {
      window.clearTimeout(timer);
    }
  }
  const socialIcon = (key) => {
    if (key === 'instagram') return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor"/></svg>';
    if (key === 'facebook') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.8 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.6 1.6-1.6H17V4.8c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.5V11H7v3h3v8h3.8Z"/></svg>';
    if (key === 'youtube') return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.2" y="5.2" width="19.6" height="13.6" rx="4" fill="currentColor"/><path d="M10 8.4 16.2 12 10 15.6Z" fill="#0b0908"/></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>';
  };

  const showcase = document.getElementById('ownersShowcase');
  const avatars = Array.from(document.querySelectorAll('.owner-avatar'));
  const ownerRole = document.getElementById('ownerRole');
  const ownerName = document.getElementById('ownerName');
  const ownerDescription = document.getElementById('ownerDescription');
  const ownerFeaturedLink = document.getElementById('ownerFeaturedLink');
  const ownerQuote = document.getElementById('ownerQuote');
  const ownerFeaturedAvatar = document.getElementById('ownerFeaturedAvatar');
  const ownerFeaturedFrame = document.getElementById('ownerFeaturedFrame');
  const ownerDivinity = document.getElementById('ownerDivinity');
  const ownerInfo = document.getElementById('ownerInfo');
  const ownerSocialLinks = document.getElementById('ownerSocialLinks');

  let currentOwner = 0;

  function updateOwnerRail(index) {
    const owner = ownerData[index];
    const rail = document.querySelector(`.owner-avatar[data-owner="${index}"]`);
    if (!rail) return;
    const railPhoto = rail.querySelector('.owner-avatar__photo');
    const railHandle = rail.querySelector('.owner-avatar__handle');
    if (railPhoto) {
      if (owner.avatar) {
        railPhoto.src = owner.avatar;
        railPhoto.alt = owner.handle ? `Foto de perfil de ${owner.handle}` : '';
        railPhoto.hidden = false;
      } else {
        railPhoto.hidden = true;
        railPhoto.removeAttribute('src');
        railPhoto.alt = '';
      }
    }
    if (railHandle) {
      railHandle.textContent = owner.handle || '';
      railHandle.hidden = !owner.handle;
    }
    rail.classList.toggle('is-profile-pending', !owner.registered);
    rail.setAttribute('aria-label', owner.handle ? `Mostrar información de ${owner.handle}` : 'Mostrar DEIDAD');
    rail.setAttribute('aria-controls', 'ownerInfo');
  }

  const showOwner = (index) => {
    currentOwner = index;
    const owner = ownerData[index];
    avatars.forEach((avatar, avatarIndex) => {
      const active = avatarIndex === index;
      avatar.classList.toggle('is-active', active);
      avatar.setAttribute('aria-current', active ? 'true' : 'false');
      avatar.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (ownerRole) ownerRole.textContent = owner.role;
    if (ownerName) {
      ownerName.textContent = owner.handle || '';
      ownerName.hidden = !owner.handle;
    }
    if (ownerDescription) {
      ownerDescription.innerHTML = owner.descriptionHtml || '<p class="owner-profile-bio__empty">Sin descripción pública.</p>';
      ownerDescription.classList.remove('is-empty');
    }
    if (ownerQuote) ownerQuote.classList.remove('is-empty');
    if (ownerSocialLinks) {
      const links = owner.socialLinks && typeof owner.socialLinks === 'object' ? owner.socialLinks : {};
      const buttons = OWNER_SOCIALS.map((platform) => {
        const href = safeSocialUrl(links[platform.key]);
        if (!href) return '';
        return `<a class="owner-social-button owner-social-button--${platform.key}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer nofollow" aria-label="Abrir ${escapeHtml(platform.label)} de ${escapeHtml(owner.handle || 'este perfil')}" title="${escapeHtml(platform.label)}"><span>${socialIcon(platform.key)}</span><b>${escapeHtml(platform.label)}</b></a>`;
      }).filter(Boolean);
      ownerSocialLinks.innerHTML = buttons.join('');
      ownerSocialLinks.hidden = !buttons.length;
    }
    if (ownerFeaturedLink) {
      const hasWebProfile = Boolean(owner.registered && owner.profileUrl);
      const destination = hasWebProfile ? owner.profileUrl : (owner.externalUrl || owner.url || '#');
      ownerFeaturedLink.href = destination;
      ownerFeaturedLink.setAttribute('aria-label', hasWebProfile
        ? (owner.handle ? `Abrir perfil de ${owner.handle}` : 'Abrir perfil')
        : 'Abrir enlace externo');
      if (hasWebProfile) {
        ownerFeaturedLink.removeAttribute('target');
        ownerFeaturedLink.removeAttribute('rel');
      } else {
        ownerFeaturedLink.target = '_blank';
        ownerFeaturedLink.rel = 'noopener noreferrer';
      }
    }
    if (ownerFeaturedAvatar) {
      if (owner.avatar) {
        ownerFeaturedAvatar.hidden = false;
        ownerFeaturedAvatar.src = owner.avatar;
        ownerFeaturedAvatar.alt = owner.handle ? `Foto destacada de ${owner.handle}` : '';
      } else {
        ownerFeaturedAvatar.hidden = true;
        ownerFeaturedAvatar.removeAttribute('src');
        ownerFeaturedAvatar.alt = '';
      }
    }
    if (ownerFeaturedFrame) {
      ownerFeaturedFrame.src = owner.frame;
      ownerFeaturedFrame.alt = '';
    }
    if (ownerDivinity) {
      ownerDivinity.textContent = owner.divinity;
      ownerDivinity.className = `owner-info__title-badge owner-info__title-badge--${owner.theme}`;
    }
    if (ownerInfo) {
      ownerInfo.setAttribute('data-theme', owner.theme);
      ownerInfo.classList.toggle('is-profile-pending', !owner.registered);
    }
    if (ownerFeaturedLink) ownerFeaturedLink.setAttribute('data-theme', owner.theme);
  };

  async function syncOwnerProfile(index) {
    const owner = ownerData[index];
    if (!owner?.discordId) return;
    try {
      const { response, data } = await fetchJson(`/api/profile/${encodeURIComponent(owner.discordId)}`, { credentials:'same-origin', cache:'no-store' }, 10000);
      if (!response.ok || !data.ok || !data.profile) {
        if (index !== 0 && response.status === 404) {
          owner.handle = '';
          owner.username = '';
          owner.avatar = '';
          owner.descriptionHtml = '';
          owner.socialLinks = {};
          owner.registered = false;
          updateOwnerRail(index);
          if (currentOwner === index) showOwner(index);
        }
        return;
      }
      const profile = data.profile;
      owner.username = String(profile.discordUsername || '').trim();
      owner.handle = owner.username ? `@${owner.username}` : '';
      owner.avatar = profileAvatar(profile);
      owner.descriptionHtml = profile.bio ? renderOwnerBio(profile.bio) : '';
      owner.socialLinks = profile.socialLinks && typeof profile.socialLinks === 'object' ? profile.socialLinks : {};
      owner.profileUrl = `/perfil/${encodeURIComponent(owner.discordId)}`;
      owner.registered = true;
      owner.url = owner.profileUrl;
      updateOwnerRail(index);
      if (currentOwner === index) showOwner(index);
    } catch (_) {
      // Un fallo transitorio de red no debe borrar un perfil que ya se cargó.
      // Si nunca se cargó, se conserva el estado inicial y se podrá recuperar
      // en la siguiente visita sin mostrar datos inventados.
    }
  }

  let ownerRotationTimer = 0;
  const scheduleOwnerRotation = () => {
    window.clearTimeout(ownerRotationTimer);
    const delay = 7000 + Math.floor(Math.random() * 4500);
    ownerRotationTimer = window.setTimeout(() => {
      if (!document.hidden && ownerData.length > 1) {
        const choices = ownerData.map((_, index) => index).filter((index) => index !== currentOwner);
        const next = choices[Math.floor(Math.random() * choices.length)];
        showOwner(next);
      }
      scheduleOwnerRotation();
    }, delay);
  };

  avatars.forEach((avatar, index) => {
    const activate = () => { showOwner(index); scheduleOwnerRotation(); };
    avatar.addEventListener('click', activate);
    avatar.addEventListener('focus', activate);
  });

  document.querySelectorAll('.owner-avatar__photo, #ownerFeaturedAvatar, .collaborator-featured img').forEach((image) => {
    image.addEventListener('error', () => {
      image.hidden = true;
      image.removeAttribute('src');
      image.closest('.owner-avatar, .owner-info__portrait, .collaborator-featured')?.classList.add('avatar-load-failed');
    });
  });

  ownerData.forEach((_, index) => updateOwnerRail(index));
  showOwner(currentOwner);
  ownerData.forEach((_, index) => syncOwnerProfile(index));
  scheduleOwnerRotation();

  const donorMarquee = document.getElementById('donorMarquee');
  const donorTrack = donorMarquee?.querySelector('.donor-marquee__track');
  const topDonorRoot = document.querySelector('.members-top-donors');
  const escapeDonor = (value) => String(value ?? '').replace(/[&<>'"]/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const safeDonorCss = (value) => String(value || '').replace(/[\"'()\\\n\r]/g,'');
  let donorResizeTimer = 0;
  let donorData = [];
  let topDonorData = [];

  function ensureDonorPopover(){
    let pop=document.getElementById('membersDonorPopover');
    if(pop) return pop;
    pop=document.createElement('aside');
    pop.id='membersDonorPopover';
    pop.className='members-donor-popover';
    pop.hidden=true;
    pop.setAttribute('aria-hidden','true');
    document.body.appendChild(pop);
    return pop;
  }

  function donorPopoverMarkup(donor,{top=0}={}){
    const premium=Array.isArray(donor?.premium)&&donor.premium.length?donor.premium.join(' · '):(top?'TOP DONADOR':'DONADOR');
    const mc=donor?.minecraftUsername?`Minecraft: ${escapeDonor(donor.minecraftUsername)}`:'Minecraft sin configurar';
    const thanks=top?`<strong>¡Muchas gracias por ser el #${top}!</strong>`:'<strong>¡Gracias por apoyar a ARKA WOOD!</strong>';
    const avatar=donor?.avatar?`<img src="${escapeDonor(donor.avatar)}" alt="">`:'<span>?</span>';
    const banner=donor?.banner?` style="--donor-popover-banner:url('${safeDonorCss(donor.banner)}')"`:'';
    return `<div class="members-donor-popover__banner"${banner}></div><div class="members-donor-popover__head"><div class="members-donor-popover__avatar">${avatar}</div><div><b>${escapeDonor(donor?.name||'Donador')}</b><small>${escapeDonor(premium)}</small></div></div>${thanks}<em>${mc}</em>${donor?.registered?'<i>ABRIR PERFIL</i>':''}`;
  }

  function positionDonorPopover(anchor,pop){
    const rect=anchor.getBoundingClientRect();
    const width=Math.min(300,Math.max(240,pop.offsetWidth||270));
    const gap=14;
    let left=rect.right+gap;
    let side='right';
    if(left+width>window.innerWidth-12){left=Math.max(12,rect.left-width-gap);side='left';}
    let top=rect.top+rect.height/2-(pop.offsetHeight||180)/2;
    top=Math.max(86,Math.min(top,window.innerHeight-(pop.offsetHeight||180)-14));
    pop.style.left=`${Math.round(left)}px`;
    pop.style.top=`${Math.round(top)}px`;
    pop.dataset.side=side;
  }

  function showDonorPopover(anchor,donor,top=0){
    if(!anchor||!donor)return;
    const pop=ensureDonorPopover();
    pop.innerHTML=donorPopoverMarkup(donor,{top});
    pop.hidden=false;
    pop.setAttribute('aria-hidden','false');
    requestAnimationFrame(()=>{positionDonorPopover(anchor,pop);pop.classList.add('is-visible');});
  }
  function hideDonorPopover(){const pop=document.getElementById('membersDonorPopover');if(!pop)return;pop.classList.remove('is-visible');pop.setAttribute('aria-hidden','true');setTimeout(()=>{if(!pop.classList.contains('is-visible'))pop.hidden=true;},160);}


  function renderTopDonors(){
    if(!topDonorRoot) return;
    if(!topDonorData.length){
      topDonorRoot.innerHTML='<div class="members-donor-empty">Los TOP DONADORES aparecerán aquí automáticamente cuando se sincronicen con Discord.</div>';
      return;
    }
    topDonorRoot.innerHTML=topDonorData.slice(0,6).map((donor,index)=>{
      const href=donor.profileUrl || '#';
      const cls=`members-placeholder-avatar members-top-donor-card${donor.registered?' is-profile':''}`;
      const avatar=donor.avatar?`<span class="members-top-donor-card__photo"><img src="${escapeDonor(donor.avatar)}" alt="Foto de ${escapeDonor(donor.name)}" loading="lazy"></span>`:'<span class="members-top-donor-card__photo">?</span>';
      return `<a class="${cls}" data-top-donor-index="${index}" href="${escapeDonor(href)}"${donor.registered?'':' aria-disabled="true"'}>${avatar}<small>TOP ${String(donor.top||index+1).padStart(2,'0')}</small><b>${escapeDonor(donor.name||'Donador')}</b></a>`;
    }).join('');
  }

  function donorPill(donor, index, clone=false){
    const href=donor.profileUrl || '#';
    const cls=`donor-pill donor-pill--profile donor-pill--live${donor.banner?' has-banner':''}`;
    const style=donor.banner?` style="--donor-banner:url('${safeDonorCss(donor.banner)}')"`:'';
    const avatar=donor.avatar?`<img src="${escapeDonor(donor.avatar)}" alt="${clone?'':`Foto de ${escapeDonor(donor.name)}`}" loading="lazy">`:'<span class="donor-pill__fallback">?</span>';
    return `<a class="${cls}" data-donor-index="${index}" href="${escapeDonor(href)}"${style}${clone?' aria-hidden="true" tabindex="-1"':''}${donor.registered?'':' aria-disabled="true"'}>${avatar}<b class="donor-pill__name">${escapeDonor(donor.name||'Donador')}</b></a>`;
  }

  const rebuildDonorMarquee = () => {
    if (!donorMarquee || !donorTrack) return;
    if(!donorData.length){
      donorTrack.innerHTML='<div class="members-donor-empty">Los DONADORES sincronizados aparecerán aquí.</div>';
      donorTrack.style.removeProperty('--donor-duration');
      return;
    }
    const minimumCards=10;
    const visualDonors=donorData.length>=minimumCards?donorData:Array.from({length:minimumCards},(_,index)=>donorData[index%donorData.length]);
    const segment=visualDonors.map((donor,index)=>donorPill(donor,donorData.indexOf(donor),false)).join('');
    const clone=visualDonors.map((donor,index)=>donorPill(donor,donorData.indexOf(donor),true)).join('');
    donorTrack.innerHTML=`<div class="donor-marquee__segment">${segment}</div><div aria-hidden="true" class="donor-marquee__segment">${clone}</div>`;
    const duration=Math.max(28,Math.min(180,visualDonors.length*2.5));
    donorTrack.style.setProperty('--donor-duration',`${duration}s`);
  };

  async function loadDonors(){
    try{
      const {response,data}=await fetchJson('/api/community/donors',{credentials:'same-origin',cache:'no-store'},10000);
      if(!response.ok||!data.ok) throw new Error('donors_unavailable');
      topDonorData=Array.isArray(data.top)?data.top:[];
      donorData=Array.isArray(data.donors)?data.donors:[];
      renderTopDonors();
      rebuildDonorMarquee();
    }catch{
      topDonorData=[];donorData=[];renderTopDonors();rebuildDonorMarquee();
    }
  }

  loadDonors();
  window.addEventListener('resize', () => {
    clearTimeout(donorResizeTimer);
    donorResizeTimer = window.setTimeout(rebuildDonorMarquee, 180);
  }, { passive: true });
  donorMarquee?.addEventListener('mouseenter', () => donorMarquee.classList.add('is-paused'));
  donorMarquee?.addEventListener('mouseleave', () => donorMarquee.classList.remove('is-paused'));

  function donorHostIndex(host){
    if (!host) return null;
    if (host.dataset?.topDonorIndex != null) return { dataset: topDonorData, index: Number(host.dataset.topDonorIndex), top: true };
    if (host.dataset?.donorIndex != null) return { dataset: donorData, index: Number(host.dataset.donorIndex), top: false };
    return null;
  }

  function donorTriggerFromHost(host){
    return host?.querySelector('.members-top-donor-card__photo, .donor-pill--live img, .donor-pill--live .donor-pill__fallback, .donor-pill__avatar, .donor-pill__fallback') || host;
  }

  document.addEventListener('pointerover',(event)=>{
    const host = event.target.closest('[data-top-donor-index],[data-donor-index]');
    if(!host) return;
    const previousHost = event.relatedTarget?.closest?.('[data-top-donor-index],[data-donor-index]');
    if(previousHost === host) return;
    const meta = donorHostIndex(host);
    if(!meta || !Number.isInteger(meta.index) || meta.index < 0) return;
    const donor = meta.dataset[meta.index];
    if(!donor) return;
    showDonorPopover(donorTriggerFromHost(host), donor, meta.top ? (donor.top || meta.index + 1) : 0);
  });

  document.addEventListener('pointerout',(event)=>{
    const host = event.target.closest('[data-top-donor-index],[data-donor-index]');
    if(!host) return;
    const nextHost = event.relatedTarget?.closest?.('[data-top-donor-index],[data-donor-index]');
    if(nextHost === host) return;
    hideDonorPopover();
  });

  document.addEventListener('focusin',(event)=>{
    const host = event.target.closest('[data-top-donor-index],[data-donor-index]');
    if(!host) return;
    const meta = donorHostIndex(host);
    if(!meta || !Number.isInteger(meta.index) || meta.index < 0) return;
    const donor = meta.dataset[meta.index];
    if(!donor) return;
    showDonorPopover(donorTriggerFromHost(host), donor, meta.top ? (donor.top || meta.index + 1) : 0);
  });

  document.addEventListener('focusout',(event)=>{
    const host = event.target.closest('[data-top-donor-index],[data-donor-index]');
    if(!host) return;
    const nextHost = event.relatedTarget?.closest?.('[data-top-donor-index],[data-donor-index]');
    if(nextHost === host) return;
    hideDonorPopover();
  });

  window.addEventListener('scroll',hideDonorPopover,{passive:true});
  window.addEventListener('resize',hideDonorPopover,{passive:true});

})();

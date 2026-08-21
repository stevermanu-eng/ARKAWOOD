(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const state = $('profilePublicState');
  const workspace = $('profilePublicWorkspace');
  const reportDialog = $('profileReportDialog');
  let targetId = '';
  let ownId = '';
  let csrfToken = '';
  const PROFILE_FRAMES = new Map([
    ['1290118757888294912',{theme:'tree',src:'/assets/member-frames/deidad-arbol-sagrado-frame-v8.43.0.webp'}],
    ['984129773179646003',{theme:'supreme',src:'/assets/member-frames/deidad-suprema-frame-v8.43.0.webp'}],
    ['1052673571429810186',{theme:'demonic',src:'/assets/member-frames/deidad-demoniaca-frame-v8.44.0.webp'}]
  ]);

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  const safeHttpsUrl = (value) => {
    try {
      const url = new URL(String(value || '').trim());
      if (url.protocol !== 'https:' || url.username || url.password) return '';
      return url.toString();
    } catch { return ''; }
  };
  async function fetchJson(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await window.fetch(url, { ...options, signal:controller.signal });
      const data = await response.json().catch(() => ({}));
      return { response, data };
    } catch (error) {
      if (error?.name === 'AbortError') {
        const timeoutError = new Error('request_timeout');
        timeoutError.code = 'request_timeout';
        throw timeoutError;
      }
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  }
  const formatDateTime = (value) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeStyle:'short'}).format(date); };
  const fallbackAvatar = (id) => { try { return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(id) >> 22n) % 6n)}.png`; } catch { return 'https://cdn.discordapp.com/embed/avatars/0.png'; } };
  const profileAvatar = (profile) => profile?.profilePhoto || (profile?.discordAvatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.discordAvatar}.webp?size=512` : fallbackAvatar(profile?.id));
  const postAvatar = (post) => post?.profile_photo || post?.author_avatar || (post?.discord_avatar ? `https://cdn.discordapp.com/avatars/${post.discord_user_id}/${post.discord_avatar}.webp?size=128` : fallbackAvatar(post?.discord_user_id));
  const richRender=(value)=>window.arkaProfileRichText?.render?.(value)||escapeHtml(value||'').replace(/\n/g,'<br>');
  function applyProfileFrame(id){
    const shell=$('publicProfileAvatarShell'), frame=$('publicProfileAvatarFrame');
    if(!shell||!frame)return;
    const item=PROFILE_FRAMES.get(String(id||''));
    shell.classList.remove('has-special-frame','has-special-frame--tree','has-special-frame--supreme','has-special-frame--demonic');
    if(!item){frame.hidden=true;frame.removeAttribute('src');return;}
    shell.classList.add('has-special-frame',`has-special-frame--${item.theme}`);frame.src=item.src;frame.hidden=false;
  }

  function brandSvg(key){
    if(key==='instagram') return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor"/></svg>';
    if(key==='facebook') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.8 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.6 1.6-1.6H17V4.8c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.5V11H7v3h3v8h3.8Z"/></svg>';
    if(key==='youtube') return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.2" y="5.2" width="19.6" height="13.6" rx="4" fill="currentColor"/><path d="M10 8.4 16.2 12 10 15.6Z" fill="#0b0908"/></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>';
  }
  const SOCIAL_PLATFORMS = [
    { key:'instagram', label:'Instagram' },
    { key:'facebook', label:'Facebook' },
    { key:'youtube', label:'YouTube' },
    { key:'twitter', label:'Twitter / X' }
  ];
  function socialMarkup(links){
    const source=links&&typeof links==='object'?links:{};
    return SOCIAL_PLATFORMS.map((platform)=>{const href=safeHttpsUrl(source[platform.key]);if(!href)return '';return `<a class="profile-social-link profile-social-link--${platform.key}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer nofollow" aria-label="${escapeHtml(platform.label)}" title="${escapeHtml(platform.label)}"><span class="profile-social-link__icon">${brandSvg(platform.key)}</span></a>`;}).filter(Boolean).join('');
  }
  function renderSocialLinks(links){
    const root=$('publicProfileSocials'); if(!root)return;
    const source=links&&typeof links==='object'?links:{};
    const items=SOCIAL_PLATFORMS.map((platform)=>{
      const href=safeHttpsUrl(source[platform.key]); if(!href)return '';
      return `<a class="profile-social-link profile-social-link--${platform.key}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer nofollow" aria-label="${escapeHtml(platform.label)}" title="${escapeHtml(platform.label)}"><span class="profile-social-link__icon">${brandSvg(platform.key)}</span></a>`;
    }).filter(Boolean);
    root.hidden=!items.length; root.innerHTML=items.join('');
  }
  const roleHtml = (value, fallback = 'MIEMBRO') => {
    const id = String(value?.discord_user_id ?? value?.id ?? '');
    const api = window.arkaRoleBadges;
    if (id === '1290118757888294912') {
      const fixed = [
        { id:'1538302102495825931', key:'DEIDAD', label:'DEIDAD', colors:['#8B6F47','#D4A63A'], order:0 },
        { id:'identity:deidad-arbol-sagrado', key:'DEIDAD_ARBOL_SAGRADO', label:'✧ DEIDAD DEL ÁRBOL SAGRADO ✧', colors:['#2E6F4A','#8DDC8D'], identity:true, order:1 }
      ];
      if (api?.badge) return fixed.map((role)=>api.badge(role)).join('');
      return '<span class="arka-role-badge">DEIDAD</span><span class="arka-role-badge is-identity">✧ DEIDAD DEL ÁRBOL SAGRADO ✧</span>';
    }
    if(!api?.fromItem||!api?.badge) return escapeHtml(value?.rank || value?.user_rank || fallback);
    const roles=api.fromItem(value);
    return roles.length ? roles.slice(0,2).map((role)=>api.badge(role)).join('') : `<span class="arka-role-badge arka-role-badge--fallback">${escapeHtml(value?.rank || value?.user_rank || fallback)}</span>`;
  };

  function requestedId() {
    const parts = location.pathname.split('/').filter(Boolean);
    const i = parts.findIndex((part) => part.toLowerCase() === 'perfil');
    const id = i >= 0 ? String(parts[i + 1] || '') : '';
    return /^\d{5,24}$/.test(id) ? id : '';
  }

  function showState(eyebrow, title, copy, showLogin = false) {
    workspace.hidden = true; state.hidden = false; state.querySelector('.profile-public-loader')?.setAttribute('hidden','');
    state.querySelector('small').textContent = eyebrow;
    state.querySelector('h2').textContent = title;
    state.querySelector('p').textContent = copy;
    $('profilePublicLogin').hidden = !showLogin;
  }

  function renderPosts(posts) {
    const root = $('profilePosts');
    if (!posts?.length) { root.innerHTML = '<div class="profile-empty">Todavía no hay publicaciones en este perfil.</div>'; return; }
    root.innerHTML = posts.map((post) => `<article class="profile-post"><a class="profile-post__avatar" href="/perfil/${encodeURIComponent(post.discord_user_id)}"><img src="${escapeHtml(postAvatar(post))}" alt=""></a><div><header><div><a href="/perfil/${encodeURIComponent(post.discord_user_id)}"><b>${escapeHtml(post.author_name || 'Usuario')}</b></a><div class="arka-role-stack arka-role-stack--compact">${roleHtml(post)}</div>${post.social_links?`<div class="profile-post__socials">${socialMarkup(post.social_links)}</div>`:''}</div><time>${escapeHtml(formatDateTime(post.created_at))}</time></header>${post.content?`<div class="profile-post__content profile-rich-text">${richRender(post.content)}</div>`:''}${post.image_url?`<a class="profile-post__image" href="${escapeHtml(post.image_url)}" target="_blank" rel="noopener"><img src="${escapeHtml(post.image_url)}" alt="Imagen de la publicación" loading="lazy"></a>`:''}</div></article>`).join('');
  }

  function render(profile) {
    targetId = String(profile.id);
    document.title = `${profile.displayName || profile.discordUsername || 'Perfil'} · ARKA WOOD`;
    $('profilePublicHeading').textContent = profile.displayName || profile.discordUsername || 'USUARIO';
    $('publicProfileAvatar').innerHTML = `<img src="${escapeHtml(profileAvatar(profile))}" alt="Foto de perfil de ${escapeHtml(profile.displayName || profile.discordUsername || 'usuario')}">`;
    $('publicProfileBanner').style.backgroundImage = profile.banner ? `url("${String(profile.banner).replace(/"/g,'%22')}")` : '';
    $('publicProfileName').textContent = profile.displayName || profile.discordUsername || 'Usuario';
    $('publicProfileDiscord').textContent = `@${profile.discordUsername || 'discord'} · ID ${profile.id}`;
    $('publicProfileMinecraft').textContent = `Minecraft: ${profile.minecraftUsername || 'sin configurar'}`;
    $('publicProfileBio').innerHTML = profile.bio ? richRender(profile.bio) : 'Sin descripción pública.';
    applyProfileFrame(profile.id);
    renderSocialLinks(profile.socialLinks || {});
    $('publicProfileRank').innerHTML = roleHtml(profile);
    $('profileStatTopics').textContent = String(profile.stats?.forumTopics || 0);
    $('profileStatReplies').textContent = String(profile.stats?.replies || 0);
    $('profileStatBirth').textContent = profile.birthDate || '—';
    renderPosts(profile.posts || []);
    const own = ownId && ownId === targetId;
    $('profileEditLink').hidden = !own;
    $('profileReportButton').hidden = own;
    workspace.hidden = false; state.hidden = true;
  }

  async function init() {
    targetId = requestedId();
    const sessionPromise = window.arkaSessionPromise || fetchJson('/api/auth/session',{credentials:'same-origin',cache:'no-store'},10000).then(({response,data})=>response.ok?data:null).catch(()=>null);
    const session = await sessionPromise;
    if (session?.authenticated && session?.user?.id) { ownId = String(session.user.id); csrfToken = session.csrfToken || ''; }
    if (!targetId) {
      if (ownId) { location.replace(`/perfil/${encodeURIComponent(ownId)}`); return; }
      showState('DISCORD REQUERIDO','CONECTA TU CUENTA','Inicia sesión para abrir tu propio perfil o visita una URL /perfil/<ID> para ver un perfil público.',true);
      $('profilePublicLogin').href = `/api/auth/discord?return=${encodeURIComponent('/perfil/')}`;
      return;
    }
    try {
      const {response,data} = await fetchJson(`/api/profile/${encodeURIComponent(targetId)}`,{credentials:'same-origin',cache:'no-store'},12000);
      if (!response.ok || !data.ok) throw new Error(data.error || 'profile_failed');
      render(data.profile);
    } catch (error) {
      const text = error.message === 'profile_not_found' ? 'Este usuario todavía no tiene un perfil comunitario.' : error.message === 'community_db_not_configured' ? 'El perfil no está disponible en este momento.' : error.message === 'request_timeout' ? 'La carga tardó demasiado. Revisa tu conexión e inténtalo nuevamente.' : 'No se pudo cargar este perfil.';
      showState('PERFIL NO DISPONIBLE','NO SE PUDO CARGAR',text,false);
    }
  }

  $('profileReportButton')?.addEventListener('click',()=>{
    if (!ownId) { location.assign(`/api/auth/discord?return=${encodeURIComponent(location.pathname)}`); return; }
    if (ownId === targetId) return;
    reportDialog?.showModal();
  });
  $('profileReportCancel')?.addEventListener('click',()=>reportDialog?.close());
  $('profileReportClose')?.addEventListener('click',()=>reportDialog?.close());
  $('profileReportForm')?.addEventListener('submit',async(event)=>{
    event.preventDefault(); const reason=$('profileReportReason').value.trim(); if(reason.length<10)return;
    const button=$('profileReportSubmit'); button.disabled=true;
    try { const {response,data}=await fetchJson('/api/profile/report',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken},body:JSON.stringify({targetId,reason})},12000); if(!response.ok||!data.ok)throw new Error(data.error||'report_failed'); $('profileReportReason').value=''; reportDialog.close(); $('profilePublicStatus').textContent='Denuncia enviada para revisión.'; }
    catch { $('profilePublicStatus').textContent='No se pudo enviar la denuncia.'; }
    finally { button.disabled=false; }
  });
  init();
})();

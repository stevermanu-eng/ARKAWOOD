(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const loginCard = $('profileLoginCard');
  const workspace = $('profileWorkspace');
  const editor = $('profileEditor');
  const cropDialog = $('profileCropDialog');
  const cropCanvas = $('profileCropCanvas');
  const cropResultCanvas = $('profileCropResultCanvas');
  const cropPreview = $('profileCropPreview');
  let csrfToken = '';
  let ownUserId = '';
  const FIXED_OWNER_PROFILE_IDS = new Set(['1290118757888294912','984129773179646003','1052673571429810186']);
  let profilePhotoData = '';
  let bannerData = '';
  let profilePhotoDirty = false;
  let bannerDirty = false;
  let profilePhotoRevision = 0;
  let bannerRevision = 0;
  let bannerIntroShown = false;
  let feedbackTimer = 0;
  let permissions = { bannerUpload:false, socialLinks:false, forumModeration:false, owner:false };
  const PROFILE_FRAMES = new Map([
    ['1290118757888294912',{theme:'tree',src:'/assets/member-frames/deidad-arbol-sagrado-frame-v8.43.0.webp'}],
    ['984129773179646003',{theme:'supreme',src:'/assets/member-frames/deidad-suprema-frame-v8.43.0.webp'}],
    ['1052673571429810186',{theme:'demonic',src:'/assets/member-frames/deidad-demoniaca-frame-v8.44.0.webp'}]
  ]);
  let availableRoles = [];
  let selectedRoleIds = [];
  let saveInFlight = null;
  let cropState = null;
  let profilePostImageData = '';
  let profilePostImageName = '';
  let savedSnapshot = '';
  let navigatingAfterConfirm = false;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const formatDateTime = (value) => { const date=new Date(value); return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeStyle:'short'}).format(date); };
  const fallbackAvatar = (id) => { try { return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(id) >> 22n) % 6n)}.png`; } catch { return 'https://cdn.discordapp.com/embed/avatars/0.png'; } };
  const avatarUrl = (profile) => profile?.profilePhoto || (profile?.discordAvatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.discordAvatar}.webp?size=512` : fallbackAvatar(profile?.id));
  const postAvatar = (post) => post?.profile_photo || post?.author_avatar || (post?.discord_avatar ? `https://cdn.discordapp.com/avatars/${post.discord_user_id}/${post.discord_avatar}.webp?size=128` : fallbackAvatar(post?.discord_user_id));
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
  function applyProfileFrame(id){
    const shell=$('publicProfileAvatarShell'), frame=$('publicProfileAvatarFrame');
    if(!shell||!frame)return;
    const item=PROFILE_FRAMES.get(String(id||''));
    shell.classList.remove('has-special-frame','has-special-frame--tree','has-special-frame--supreme','has-special-frame--demonic');
    if(!item){ frame.hidden=true; frame.removeAttribute('src'); return; }
    shell.classList.add('has-special-frame',`has-special-frame--${item.theme}`);
    frame.src=item.src; frame.hidden=false;
  }
  const richRender=(value)=>window.arkaProfileRichText?.render?.(value)||escapeHtml(value||'').replace(/\n/g,'<br>');
  const updateRichCounter=(textareaId,counterId)=>window.arkaProfileRichText?.updateCounter?.($(textareaId),$(counterId));
  const setStatus = (message,error=false) => { const root=$('profileStatus'); if(root){root.textContent=message||'';root.classList.toggle('is-error',error);} };

  function brandSvg(key){
    if(key==='instagram') return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor"/></svg>';
    if(key==='facebook') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.8 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.6 1.6-1.6H17V4.8c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.5V11H7v3h3v8h3.8Z"/></svg>';
    if(key==='youtube') return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.2" y="5.2" width="19.6" height="13.6" rx="4" fill="currentColor"/><path d="M10 8.4 16.2 12 10 15.6Z" fill="#0b0908"/></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>';
  }
  const SOCIAL_PLATFORMS = [
    { key:'instagram', id:'profileInstagram', label:'Instagram', hosts:['instagram.com'] },
    { key:'facebook', id:'profileFacebook', label:'Facebook', hosts:['facebook.com','fb.com'] },
    { key:'youtube', id:'profileYoutube', label:'YouTube', hosts:['youtube.com','youtu.be'] },
    { key:'twitter', id:'profileTwitter', label:'Twitter / X', hosts:['x.com','twitter.com'] }
  ];
  function socialUrlAllowed(platform, value){
    const raw=String(value||'').trim(); if(!raw)return '';
    try{
      const url=new URL(raw); if(url.protocol!=='https:'||url.username||url.password)return '';
      const host=url.hostname.toLowerCase().replace(/^www\./,'');
      if(!platform.hosts.some((domain)=>host===domain||host.endsWith(`.${domain}`)))return '';
      url.hash=''; return url.toString();
    }catch{return '';}
  }
  function readSocialInputs(){
    return Object.fromEntries(SOCIAL_PLATFORMS.map((platform)=>[platform.key,String($(platform.id)?.value||'').trim()]));
  }
  function socialMarkup(links){
    const source=links&&typeof links==='object'?links:{};
    return SOCIAL_PLATFORMS.map((platform)=>{const href=String(source[platform.key]||'').trim();if(!href)return '';return `<a class="profile-social-link profile-social-link--${platform.key}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer nofollow" aria-label="${escapeHtml(platform.label)}" title="${escapeHtml(platform.label)}"><span class="profile-social-link__icon">${brandSvg(platform.key)}</span></a>`;}).filter(Boolean).join('');
  }
  function renderSocialLinks(rootId, links){
    const root=$(rootId); if(!root)return;
    const source=links&&typeof links==='object'?links:{};
    const items=SOCIAL_PLATFORMS.map((platform)=>{
      const href=socialUrlAllowed(platform,source[platform.key]);
      if(!href)return '';
      return `<a class="profile-social-link profile-social-link--${platform.key}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer nofollow" aria-label="${escapeHtml(platform.label)}" title="${escapeHtml(platform.label)}"><span class="profile-social-link__icon">${brandSvg(platform.key)}</span></a>`;
    }).filter(Boolean);
    root.hidden=!items.length; root.innerHTML=items.join('');
  }

  async function fetchJson(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = window.setTimeout(()=>controller.abort('request_timeout'), timeoutMs);
    try {
      const response = await window.fetch(url, { ...options, signal:controller.signal });
      const data = await response.json().catch(()=>({}));
      return { response, data };
    } catch (error) {
      if(error?.name === 'AbortError') {
        const timeoutError = new Error('La operación está tardando más de lo esperado. Inténtalo nuevamente.');
        timeoutError.code='request_timeout';
        throw timeoutError;
      }
      throw error;
    } finally { window.clearTimeout(timer); }
  }

  function captureDraft(){
    return {
      minecraft:$('profileMinecraft')?.value||'', bio:window.arkaProfileRichText?.normalizeColorMarkup?.($('profileBio')?.value||'')||($('profileBio')?.value||''), birth:$('profileBirthDate')?.value||'', socials:readSocialInputs(),
      selectedRoleIds:[...selectedRoleIds], profilePhotoData, bannerData, profilePhotoDirty, bannerDirty,
      profilePhotoRevision, bannerRevision
    };
  }
  function restoreDraft(draft){
    if(!draft) return;
    $('profileMinecraft').value=draft.minecraft; $('profileBio').value=draft.bio; $('profileBirthDate').value=draft.birth; window.arkaProfileRichText?.refreshEditor?.($('profileBio'));
    $('publicProfileBio').innerHTML=draft.bio?richRender(draft.bio):'Sin descripción pública.'; updateRichCounter('profileBio','profileBioCount');
    for(const platform of SOCIAL_PLATFORMS){ if($(platform.id)) $(platform.id).value=String(draft.socials?.[platform.key]||''); }
    renderSocialLinks('publicProfileSocials',readSocialInputs());
    const availableIds=new Set(availableRoles.map((role)=>String(role?.id||'')));
    const validPrevious=draft.selectedRoleIds.filter((id)=>availableIds.has(String(id))).slice(0,2);
    if(validPrevious.length) selectedRoleIds=validPrevious;
    profilePhotoData=draft.profilePhotoData; bannerData=draft.bannerData;
    profilePhotoDirty=Boolean(draft.profilePhotoDirty); bannerDirty=Boolean(draft.bannerDirty);
    profilePhotoRevision=Number(draft.profilePhotoRevision||0); bannerRevision=Number(draft.bannerRevision||0);
    if(profilePhotoDirty&&profilePhotoData) $('publicProfileAvatar').innerHTML=`<img src="${profilePhotoData}" alt="Vista previa">`;
    if(bannerDirty&&bannerData) $('publicProfileBanner').style.backgroundImage=`url("${bannerData}")`;
    renderRoleSelector({id:ownUserId});
  }

  function renderPosts(posts) {
    const root=$('profilePosts');
    if(!posts?.length){root.innerHTML='<div class="profile-empty">Todavía no has publicado nada en tu perfil.</div>';return;}
    root.innerHTML=posts.map((post)=>`<article class="profile-post"><a class="profile-post__avatar" href="/perfil/${encodeURIComponent(post.discord_user_id)}"><img src="${escapeHtml(postAvatar(post))}" alt=""></a><div><header><div><a href="/perfil/${encodeURIComponent(post.discord_user_id)}"><b>${escapeHtml(post.author_name||'Usuario')}</b></a><div class="arka-role-stack arka-role-stack--compact">${roleHtml(post)}</div>${post.social_links?`<div class="profile-post__socials">${socialMarkup(post.social_links)}</div>`:''}</div><time>${escapeHtml(formatDateTime(post.created_at))}</time></header>${post.content?`<div class="profile-post__content profile-rich-text">${richRender(post.content)}</div>`:''}${post.image_url?`<a class="profile-post__image" href="${escapeHtml(post.image_url)}" target="_blank" rel="noopener"><img src="${escapeHtml(post.image_url)}" alt="Imagen de la publicación" loading="lazy"></a>`:''}</div></article>`).join('');
  }

  function applyPermissionState() {
    const input=$('profileBannerInput'), upload=$('profileBannerUpload'), label=$('profileBannerUploadLabel'), note=$('profileBannerPermissionNote');
    if(!input)return;
    input.disabled=!permissions.bannerUpload;
    upload?.classList.toggle('is-disabled',!permissions.bannerUpload);
    if(upload) upload.tabIndex=permissions.bannerUpload?-1:0;
    if(label) label.textContent=permissions.bannerUpload?'Subir y ajustar banner':'BANNER BLOQUEADO';
    if(note) {
      note.hidden = Boolean(permissions.bannerUpload);
      note.innerHTML = permissions.bannerUpload ? '' : '<a href="/tienda/">Adquiere tu rango en la tienda para desbloquear este beneficio</a>';
    }
    if(permissions.bannerUpload){ upload?.classList.remove('is-intro'); }
    else if(upload && !bannerIntroShown){
      bannerIntroShown=true;
      upload.classList.add('is-intro');
      window.setTimeout(()=>upload.classList.remove('is-intro'),5200);
    }
    const socialSection=$('profileSocialSection'), socialNote=$('profileSocialPermissionNote');
    socialSection?.classList.toggle('is-disabled',!permissions.socialLinks);
    if(socialSection) socialSection.tabIndex=permissions.socialLinks?-1:0;
    if(socialNote) socialNote.hidden=Boolean(permissions.socialLinks);
    for(const platform of SOCIAL_PLATFORMS){ const field=$(platform.id); if(field) field.disabled=!permissions.socialLinks; }
  }

  function currentSnapshot() {
    return JSON.stringify({
      minecraft:$('profileMinecraft')?.value||'',
      bio:window.arkaProfileRichText?.normalizeColorMarkup?.($('profileBio')?.value||'')||($('profileBio')?.value||''),
      birth:$('profileBirthDate')?.value||'',
      socials:readSocialInputs(),
      photoRevision:profilePhotoRevision,
      bannerRevision:bannerRevision,
      visibleRoles:[...selectedRoleIds]
    });
  }
  function markSaved(){ savedSnapshot=currentSnapshot(); }
  function hasUnsavedChanges(){ return Boolean(savedSnapshot && currentSnapshot()!==savedSnapshot); }

  function ensureFeedbackOverlay(){
    let overlay=$('profileSaveOverlay');
    if(overlay) return overlay;
    overlay=document.createElement('div');
    overlay.id='profileSaveOverlay';
    overlay.className='profile-save-overlay';
    overlay.hidden=true;
    overlay.innerHTML='<div class="profile-save-overlay__veil" data-feedback-close="true"></div><div class="profile-save-overlay__card"><span class="profile-feedback-icon">✓</span><small class="profile-feedback-kicker"></small><h2>PERFIL ACTUALIZADO</h2><p>Todos tus datos se guardaron correctamente.</p><div class="profile-feedback-actions"><button class="profile-button profile-button--primary" data-feedback-action="true" type="button" hidden></button><button class="profile-button" data-feedback-close="true" type="button">CERRAR</button></div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click',(event)=>{
      if(!event.target.closest('[data-feedback-close="true"]')) return;
      overlay.classList.remove('is-visible');
      window.setTimeout(()=>overlay.hidden=true,220);
    });
    return overlay;
  }
  function showFeedback({type='success',title='PERFIL ACTUALIZADO',message='Todos tus datos se guardaron correctamente.',kicker='',actionLabel='',onAction=null,autoClose=0}={}){
    const overlay=ensureFeedbackOverlay();
    window.clearTimeout(feedbackTimer);
    const card=overlay.querySelector('.profile-save-overlay__card');
    const icon=overlay.querySelector('.profile-feedback-icon');
    const action=overlay.querySelector('[data-feedback-action="true"]');
    overlay.classList.toggle('is-error',type==='error');
    overlay.classList.toggle('is-loading',type==='loading');
    if(card){card.querySelector('h2').textContent=title;card.querySelector('p').textContent=message;card.querySelector('.profile-feedback-kicker').textContent=kicker|| (type==='error'?'ATENCIÓN':'');}
    if(icon) icon.textContent=type==='error'?'!':type==='loading'?'':'✓';
    if(action){
      action.hidden=!actionLabel;
      action.textContent=actionLabel||'';
      action.onclick=async()=>{ if(typeof onAction==='function') await onAction(); };
    }
    overlay.hidden=false;
    requestAnimationFrame(()=>overlay.classList.add('is-visible'));
    if(autoClose>0) feedbackTimer=window.setTimeout(()=>{overlay.classList.remove('is-visible');window.setTimeout(()=>overlay.hidden=true,220);},autoClose);
    return overlay;
  }
  function showSaveOverlay(){ return showFeedback({type:'success',title:'PERFIL ACTUALIZADO',message:'Todos tus datos se guardaron correctamente.',autoClose:2300}); }
  function hideLoadingOverlay(){
    const loading=$('profileLoadingOverlay');
    if(!loading) return;
    loading.classList.add('is-hidden');
    window.setTimeout(()=>loading.hidden=true,260);
  }
  function showEditorError(message,{title='NO SE PUDO COMPLETAR',kicker='ERROR DE PERFIL',actionLabel='',onAction=null}={}){
    setStatus('');
    showFeedback({type:'error',title,message,kicker,actionLabel,onAction});
  }

  function ensureUnsavedDialog(){
    let dialog=$('profileUnsavedDialog');
    if(dialog) return dialog;
    dialog=document.createElement('dialog');
    dialog.id='profileUnsavedDialog';
    dialog.className='profile-unsaved-dialog';
    dialog.innerHTML='<form method="dialog"><small>CAMBIOS SIN GUARDAR</small><h2>¿SALIR SIN GUARDAR?</h2><p>Has modificado tu perfil. Guarda los cambios antes de salir para no perderlos.</p><div><button value="cancel" class="profile-button profile-button--primary">SEGUIR EDITANDO</button><button value="leave" class="profile-button profile-button--danger">SALIR SIN GUARDAR</button></div></form>';
    document.body.appendChild(dialog);
    return dialog;
  }

  function selectedRoles() {
    const map = new Map(availableRoles.map((role)=>[String(role?.id||''), role]));
    return selectedRoleIds.map((id)=>map.get(String(id))).filter(Boolean).slice(0,2);
  }

  function renderVisibleRoles(){
    const roles=selectedRoles();
    const api=window.arkaRoleBadges;
    const markup=roles.length && api?.badge ? roles.map((role)=>api.badge(role)).join('') : '<span class="arka-role-badge arka-role-badge--fallback">MIEMBRO</span>';
    if($('profileRank')) $('profileRank').innerHTML=markup;
    if($('profileRankMirror')) $('profileRankMirror').innerHTML=markup;
    if($('publicProfileRank')) $('publicProfileRank').innerHTML=markup;
    if($('profileRoleSelectionCount')) $('profileRoleSelectionCount').textContent=`${roles.length} / 2`;
  }

  function renderRoleSelector(profile){
    const root=$('profileRoleSelector');
    if(!root) return;
    const api=window.arkaRoleBadges;
    const fixed=FIXED_OWNER_PROFILE_IDS.has(String(profile?.id||''));
    if(!availableRoles.length){
      root.innerHTML='<div class="profile-role-selector__empty">No hay rangos de ARKA WOOD sincronizados.</div>';
      renderVisibleRoles();
      return;
    }
    root.innerHTML=availableRoles.map((role)=>{
      const id=String(role?.id||'');
      const active=selectedRoleIds.includes(id);
      const badge=api?.badge?api.badge(role):`<span class="arka-role-badge">${escapeHtml(role?.label||'RANGO')}</span>`;
      return `<button class="profile-role-choice${active?' is-selected':''}" data-role-id="${escapeHtml(id)}" type="button" aria-pressed="${active?'true':'false'}"${fixed?' disabled':''}>${badge}<span>${active?'VISIBLE':'MOSTRAR'}</span></button>`;
    }).join('');
    renderVisibleRoles();
  }

  function toggleVisibleRole(roleId){
    const id=String(roleId||'');
    if(!id||FIXED_OWNER_PROFILE_IDS.has(ownUserId)) return;
    const index=selectedRoleIds.indexOf(id);
    if(index>=0) selectedRoleIds.splice(index,1);
    else {
      if(selectedRoleIds.length>=2){
        showEditorError('Solo puedes mostrar dos rangos en tu perfil.',{title:'MÁXIMO DOS RANGOS',kicker:'RANGOS VISIBLES'});
        return;
      }
      selectedRoleIds.push(id);
    }
    setStatus('');
    renderRoleSelector({id:ownUserId});
  }

  function renderProfile(profile) {
    ownUserId=String(profile.id);
    profilePhotoData=''; bannerData=''; profilePhotoDirty=false; bannerDirty=false; profilePhotoRevision=0; bannerRevision=0;
    availableRoles=Array.isArray(profile.availableRoles)&&profile.availableRoles.length?profile.availableRoles:(Array.isArray(profile.roles)?profile.roles:[]);
    selectedRoleIds=(Array.isArray(profile.roles)?profile.roles:[]).map((role)=>String(role?.id||'')).filter(Boolean).slice(0,2);
    $('profileDiscordId').value=profile.id; $('profileDiscordAccount').value=`@${profile.discordUsername||''}`; $('profileMinecraft').value=profile.minecraftUsername||''; $('profileBio').value=window.arkaProfileRichText?.normalizeColorMarkup?.(profile.bio||'')||(profile.bio||''); $('profileBirthDate').value=profile.birthDate||'';
    for(const platform of SOCIAL_PLATFORMS){ if($(platform.id)) $(platform.id).value=String(profile.socialLinks?.[platform.key]||''); }
    renderRoleSelector(profile);
    $('profileViewPublic').href=`/perfil/${encodeURIComponent(profile.id)}`;
    $('publicProfileAvatar').innerHTML=`<img src="${escapeHtml(avatarUrl(profile))}" alt="Foto de perfil de ${escapeHtml(profile.displayName||profile.discordUsername||'usuario')}">`;
    $('publicProfileBanner').style.backgroundImage=profile.banner?`url("${String(profile.banner).replace(/"/g,'%22')}")`:'';
    $('publicProfileName').textContent=profile.displayName||profile.discordUsername||'Usuario'; $('publicProfileDiscord').textContent=`@${profile.discordUsername||'discord'} · ID ${profile.id}`; $('publicProfileMinecraft').textContent=`Minecraft: ${profile.minecraftUsername||'sin configurar'}`; $('publicProfileBio').innerHTML=profile.bio?richRender(profile.bio):'Sin descripción pública.'; renderSocialLinks('publicProfileSocials',profile.socialLinks||{}); renderVisibleRoles(); applyProfileFrame(profile.id); updateRichCounter('profileBio','profileBioCount'); updateRichCounter('profilePostContent','profilePostCount'); window.arkaProfileRichText?.refreshEditor?.($('profileBio')); window.arkaProfileRichText?.refreshEditor?.($('profilePostContent')); window.arkaProfileRichText?.resetHistory?.($('profileBio')); window.arkaProfileRichText?.resetHistory?.($('profilePostContent'));
    $('profileStatTopics').textContent=String(profile.stats?.forumTopics||0); $('profileStatReplies').textContent=String(profile.stats?.replies||0); $('profileStatBirth').textContent=profile.birthDate||'—'; renderPosts(profile.posts||[]); applyPermissionState();
    markSaved();
  }

  async function fetchOwn({preserveDraft=false}={}) {
    const draft=preserveDraft?captureDraft():null;
    const {response,data}=await fetchJson('/api/profile/me',{credentials:'same-origin',cache:'no-store'},10000);
    if(response.status===401)return null;
    if(!response.ok||!data.ok){const e=new Error(data.error||'profile_failed');e.code=data.error||'';throw e;}
    csrfToken=data.csrfToken||csrfToken; permissions=data.permissions||permissions; renderProfile(data.profile); if(draft){restoreDraft(draft);window.arkaProfileRichText?.resetHistory?.($('profileBio'));window.arkaProfileRichText?.resetHistory?.($('profilePostContent'));} return data.profile;
  }

  function showError(error) {
    workspace.hidden=true; loginCard.hidden=false; const small=loginCard.querySelector('small'), title=loginCard.querySelector('h2'), copy=loginCard.querySelector('p'), login=$('profileLoginButton');
    if(error?.code==='community_db_not_configured'||error?.message==='community_db_not_configured'){small.textContent='PERFIL TEMPORALMENTE NO DISPONIBLE';title.textContent='NO SE PUDO CARGAR';copy.textContent='No se pudo acceder a los datos de tu perfil en este momento.';login.hidden=true;}else{small.textContent='ERROR DE PERFIL';title.textContent='NO SE PUDO CARGAR';copy.textContent=error?.message||'Inténtalo nuevamente.';login.hidden=false;}
  }

  async function init(){ $('profileLoginButton').href=`/api/auth/discord?return=${encodeURIComponent('/perfil/editar')}`; try{const profile=await fetchOwn(); if(!profile){loginCard.hidden=false;workspace.hidden=true;return;}loginCard.hidden=true;workspace.hidden=false;}catch(error){showError(error);showEditorError('No se pudo cargar tu perfil. Inténtalo nuevamente.',{title:'NO SE PUDO CARGAR',kicker:'PERFIL'});}finally{hideLoadingOverlay();} }

  function loadImageFile(file){return new Promise((resolve,reject)=>{if(!file||!/^image\/(png|jpeg|webp)$/i.test(file.type))return reject(new Error('Usa una imagen PNG, JPG o WEBP.'));if(file.size>12*1024*1024)return reject(new Error('La imagen debe pesar menos de 12 MB.'));const reader=new FileReader();reader.onerror=()=>reject(new Error('No se pudo leer la imagen.'));reader.onload=()=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('La imagen no es válida.'));image.src=reader.result;};reader.readAsDataURL(file);});}

  async function saveProfile({showOverlay=true}={}){
    if(saveInFlight) return saveInFlight;
    const body={
      minecraftUsername:$('profileMinecraft')?.value||'',
      bio:window.arkaProfileRichText?.normalizeColorMarkup?.($('profileBio')?.value||'')||($('profileBio')?.value||''),
      birthDate:$('profileBirthDate')?.value||'',
      visibleRoleIds:[...selectedRoleIds]
    };
    if(profilePhotoDirty) body.profilePhoto=profilePhotoData;
    if(bannerDirty) body.banner=bannerData;
    if(permissions.socialLinks) body.socialLinks=readSocialInputs();

    saveInFlight=(async()=>{
      const {response,data}=await fetchJson('/api/profile/me',{
        method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken},body:JSON.stringify(body)
      }, profilePhotoDirty||bannerDirty||permissions.socialLinks ? 18000 : 9000);
      if(response.status===409&&data?.reconnect){
        const e=new Error('Discord necesita volver a autorizar la comprobación de tus permisos.');e.code='oauth_reconnect_required';e.reconnect=data.reconnect;throw e;
      }
      if(!response.ok||!data.ok){
        const messages={
          invalid_minecraft_username:'El nick de Minecraft debe tener entre 3 y 16 caracteres y usar letras, números o guion bajo.',
          invalid_birth_date:'La fecha de nacimiento no es válida.',
          bio_too_long:'La descripción no puede superar los 700 caracteres.',
          banner_permission_required:'Adquiere tu rango en la tienda para desbloquear este beneficio.',
          social_links_permission_required:'Las redes sociales del perfil son un beneficio premium. Adquiere un rango compatible en la tienda para desbloquearlo.',
          invalid_social_link:'Uno de los enlaces sociales no corresponde a la plataforma indicada o no usa HTTPS.',
          invalid_profile_photo:'La foto procesada es demasiado pesada.',
          invalid_banner:'El banner procesado es demasiado pesado.',
          invalid_visible_roles:'Los rangos seleccionados ya no coinciden con tus rangos actuales de Discord. Sincroniza tus datos con Discord para actualizar la lista y vuelve a elegir tus rangos.',
          discord_verification_unavailable:'Discord no pudo verificar tus beneficios premium en este momento. No se modificó tu perfil; inténtalo nuevamente.',
          csrf:'Tu sesión cambió. Recarga la página antes de volver a guardar.'
        };
        const e=new Error(messages[data.error]||'No se pudieron guardar los cambios.');e.code=data.error||'save_failed';e.resolution=data.resolution||'';throw e;
      }
      permissions=data.permissions||permissions;
      if(Array.isArray(data.visibleRoles)){
        selectedRoleIds=data.visibleRoles.map((role)=>String(role?.id||'')).filter(Boolean).slice(0,2);
        renderRoleSelector({id:ownUserId});
      }
      profilePhotoDirty=false;bannerDirty=false;
      setStatus(''); applyPermissionState(); markSaved();
      if(showOverlay) showSaveOverlay();
      return data;
    })();
    try{return await saveInFlight;}finally{saveInFlight=null;}
  }

  function handleEditorError(error,{fallback='No se pudo completar la operación.'}={}){
    const message=error?.message||fallback;
    if(error?.code==='invalid_visible_roles'){
      showEditorError(message,{title:'RANGOS DESACTUALIZADOS',kicker:'SINCRONIZACIÓN NECESARIA',actionLabel:'SINCRONIZAR DISCORD',onAction:async()=>{ensureFeedbackOverlay().hidden=true;await syncDiscordNow();}});
      return;
    }
    if(error?.code==='oauth_reconnect_required'&&error?.reconnect){
      showEditorError(message,{title:'RECONECTA DISCORD',kicker:'AUTORIZACIÓN',actionLabel:'RECONECTAR',onAction:()=>location.assign(error.reconnect)});
      return;
    }
    showEditorError(message,{title:'NO SE PUDO COMPLETAR',kicker:'ERROR'});
  }

  function cropGeometry(image,targetW,targetH){const zoom=Number($('profileCropZoom')?.value||100)/100;const base=Math.max(targetW/image.naturalWidth,targetH/image.naturalHeight);const scale=base*zoom;const drawW=image.naturalWidth*scale,drawH=image.naturalHeight*scale;const overflowX=Math.max(0,drawW-targetW),overflowY=Math.max(0,drawH-targetH);const dx=-overflowX/2-(cropState?.offsetX||0)*overflowX/2;const dy=-overflowY/2-(cropState?.offsetY||0)*overflowY/2;return{dx,dy,drawW,drawH};}
  function draw(canvas){if(!cropState||!canvas)return;const {image,width,height}=cropState;canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.fillStyle='#090807';ctx.fillRect(0,0,width,height);const g=cropGeometry(image,width,height);ctx.drawImage(image,g.dx,g.dy,g.drawW,g.drawH);}
  function paint(){draw(cropCanvas);draw(cropResultCanvas);}
  async function openCrop(file,mode){const image=await loadImageFile(file);cropState=mode==='banner'?{mode,image,width:1600,height:520,quality:.8,offsetX:0,offsetY:0}:{mode,image,width:512,height:512,quality:.84,offsetX:0,offsetY:0};$('profileCropZoom').value='100';$('profileCropTitle').textContent=mode==='banner'?'AJUSTAR BANNER':'AJUSTAR FOTO DE PERFIL';cropDialog.setAttribute('data-crop-mode',mode);$('profileCropResultHint').textContent=mode==='banner'?'Esta franja es exactamente el banner final.':'Este círculo es exactamente la foto final.';paint();cropDialog.showModal();}
  $('profileCropZoom')?.addEventListener('input',paint);
  if(cropPreview){let drag=null;const clamp=(v)=>Math.max(-1,Math.min(1,v));cropPreview.addEventListener('pointerdown',(event)=>{if(!cropState||event.button!==0)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,ox:cropState.offsetX,oy:cropState.offsetY};cropPreview.classList.add('is-dragging');cropPreview.setPointerCapture?.(event.pointerId);event.preventDefault();});cropPreview.addEventListener('pointermove',(event)=>{if(!drag||event.pointerId!==drag.id)return;const rect=cropPreview.getBoundingClientRect();cropState.offsetX=clamp(drag.ox-((event.clientX-drag.x)/Math.max(rect.width,1))*2);cropState.offsetY=clamp(drag.oy-((event.clientY-drag.y)/Math.max(rect.height,1))*2);paint();});const end=(event)=>{if(!drag||(event?.pointerId!=null&&event.pointerId!==drag.id))return;try{cropPreview.releasePointerCapture?.(drag.id);}catch{}drag=null;cropPreview.classList.remove('is-dragging');};cropPreview.addEventListener('pointerup',end);cropPreview.addEventListener('pointercancel',end);}
  $('profileCropClose')?.addEventListener('click',()=>cropDialog.close());$('profileCropCancel')?.addEventListener('click',()=>cropDialog.close());
  $('profileCropApply')?.addEventListener('click',async()=>{if(!cropState)return;const button=$('profileCropApply');button.disabled=true;paint();const data=cropCanvas.toDataURL('image/webp',cropState.quality);if(cropState.mode==='banner'){bannerData=data;bannerDirty=true;bannerRevision+=1;$('publicProfileBanner').style.backgroundImage=`url("${data}")`;}else{profilePhotoData=data;profilePhotoDirty=true;profilePhotoRevision+=1;$('publicProfileAvatar').innerHTML=`<img src="${data}" alt="Vista previa">`;}cropDialog.close();setStatus('Guardando imagen...');try{await saveProfile({showOverlay:true});}catch(e){handleEditorError(e,{fallback:'No se pudo guardar la imagen.'});}finally{button.disabled=false;}});
  $('profilePhotoInput')?.addEventListener('change',async(event)=>{try{await openCrop(event.target.files?.[0],'photo');}catch(e){handleEditorError(e,{fallback:'No se pudo abrir la imagen.'});}finally{event.target.value='';}});
  $('profileBannerInput')?.addEventListener('change',async(event)=>{if(!permissions.bannerUpload){showEditorError('Adquiere tu rango en la tienda para desbloquear este beneficio.',{title:'BANNER BLOQUEADO',kicker:'BENEFICIO DE RANGO'});event.target.value='';return;}try{await openCrop(event.target.files?.[0],'banner');}catch(e){handleEditorError(e,{fallback:'No se pudo abrir el banner.'});}finally{event.target.value='';}});

  async function prepareProfilePostImage(file){
    if(!file||!/^image\/(png|jpeg|webp)$/i.test(file.type)) throw new Error('Usa una imagen PNG, JPG o WEBP.');
    if(file.size>10*1024*1024) throw new Error('La imagen debe pesar menos de 10 MB.');
    const image=await loadImageFile(file);
    const max=1400, scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,canvas.width,canvas.height);
    let data=canvas.toDataURL('image/webp',.82);
    if(data.length>1500000) data=canvas.toDataURL('image/webp',.68);
    if(data.length>1500000) throw new Error('La imagen sigue siendo demasiado pesada después de optimizarla.');
    profilePostImageData=data;profilePostImageName=file.name||'imagen';
    const preview=$('profilePostImagePreview');if(preview){preview.hidden=false;preview.innerHTML=`<img src="${data}" alt="Vista previa"><button id="profilePostImageRemove" type="button" aria-label="Quitar imagen">×</button>`;preview.querySelector('button')?.addEventListener('click',()=>{profilePostImageData='';profilePostImageName='';preview.hidden=true;preview.innerHTML='';});}
  }
  $('profilePostImageInput')?.addEventListener('change',async(event)=>{try{await prepareProfilePostImage(event.target.files?.[0]);}catch(e){showEditorError(e.message,{title:'IMAGEN NO VÁLIDA',kicker:'PUBLICACIÓN'});}finally{event.target.value='';}});
  async function syncDiscordNow(){
    const button=$('profileSyncDiscord');
    if(button?.disabled) return;
    if(button){button.disabled=true;button.dataset.originalText=button.textContent;button.textContent='SINCRONIZANDO...';}
    setStatus('Sincronizando con Discord...');
    try{
      const {response,data}=await fetchJson('/api/auth/sync',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'X-CSRF-Token':csrfToken}},14500);
      if(response.status===409&&data?.reconnect){location.assign(data.reconnect);return;}
      if(!response.ok||!data?.ok){
        const messages={
          discord_temporarily_unavailable:'Discord no respondió a tiempo. Tus datos actuales no fueron modificados; espera unos segundos y vuelve a intentarlo.',
          guild_membership_required:'Tu cuenta no aparece actualmente dentro del servidor de Discord de ARKA WOOD.',
          login_required:'Tu sesión de Discord ya no está disponible.',
          csrf:'Tu sesión cambió. Recarga la página antes de volver a sincronizar.'
        };
        const e=new Error(messages[data?.error]||'No se pudo sincronizar Discord.');e.code=data?.error||'sync_failed';throw e;
      }
      await fetchOwn({preserveDraft:true});
      setStatus('');
      showFeedback({type:'success',title:'PERFIL ACTUALIZADO',message:'Tu nombre, avatar y rangos de Discord se sincronizaron correctamente.',autoClose:2500});
    }catch(e){handleEditorError(e,{fallback:'No se pudo sincronizar Discord.'});}
    finally{if(button){button.disabled=false;button.textContent=button.dataset.originalText||'SINCRONIZAR DISCORD';delete button.dataset.originalText;}}
  }
  $('profileSyncDiscord')?.addEventListener('click',syncDiscordNow);


  editor?.addEventListener('submit',async(event)=>{event.preventDefault();const button=$('profileSave');button.disabled=true;setStatus('Guardando...');try{await saveProfile({showOverlay:true});}catch(e){handleEditorError(e,{fallback:'No se pudieron guardar los cambios.'});}finally{button.disabled=false;}});


  $('profileRoleSelector')?.addEventListener('click',(event)=>{const button=event.target.closest('[data-role-id]');if(button&&!button.disabled)toggleVisibleRole(button.dataset.roleId);});

  $('profilePostSubmit')?.addEventListener('click',async()=>{
    const content=window.arkaProfileRichText?.normalizeColorMarkup?.($('profilePostContent').value.trim())||$('profilePostContent').value.trim();
    if(!content&&!profilePostImageData)return;
    const button=$('profilePostSubmit');button.disabled=true;
    try{
      const {response,data}=await fetchJson('/api/profile/posts',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken},body:JSON.stringify({content,imageData:profilePostImageData})},15000);
      if(!response.ok||!data.ok){const e=new Error(data?.error==='post_too_long'?'La publicación no puede superar los 1000 caracteres.':data?.error==='invalid_post_image'?'La imagen de la publicación no es válida o es demasiado pesada.':'No se pudo publicar.');e.code=data?.error||'post_failed';throw e;}
      $('profilePostContent').value=''; window.arkaProfileRichText?.refreshEditor?.($('profilePostContent')); profilePostImageData='';profilePostImageName='';const preview=$('profilePostImagePreview');if(preview){preview.hidden=true;preview.innerHTML='';}
      updateRichCounter('profilePostContent','profilePostCount');await fetchOwn({preserveDraft:true});showFeedback({type:'success',title:'PUBLICACIÓN GUARDADA',message:'Tu publicación ya aparece en tu perfil.',autoClose:2000});
    }catch(e){handleEditorError(e,{fallback:'No se pudo publicar.'});}finally{button.disabled=false;}
  });
  $('profileLogout')?.addEventListener('click',async()=>{
    const button=$('profileLogout');
    if(hasUnsavedChanges()){
      const dialog=ensureUnsavedDialog();
      dialog.showModal();
      const result=await new Promise((resolve)=>{const onClose=()=>{dialog.removeEventListener('close',onClose);resolve(dialog.returnValue);};dialog.addEventListener('close',onClose);});
      if(result!=='leave') return;
      navigatingAfterConfirm=true;
    }
    button.disabled=true;
    try{await fetchJson('/api/auth/logout',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':csrfToken}},8000);}
    finally{navigatingAfterConfirm=true;location.assign('/foro/');}
  });
  for(const platform of SOCIAL_PLATFORMS){
    $(platform.id)?.addEventListener('input',()=>renderSocialLinks('publicProfileSocials',readSocialInputs()));
  }
  // Formato visible como en el foro: el editor conserva la sintaxis y la vista previa la renderiza.
  window.arkaProfileRichText?.bindToolbar?.($('profileBioToolbar'),$('profileBio'));
  window.arkaProfileRichText?.bindToolbar?.($('profilePostToolbar'),$('profilePostContent'));
  $('profileBio')?.addEventListener('input',()=>{
    const value=$('profileBio').value;
    $('publicProfileBio').innerHTML=value?richRender(value):'Sin descripción pública.';
    updateRichCounter('profileBio','profileBioCount');
  });
  $('profilePostContent')?.addEventListener('input',()=>updateRichCounter('profilePostContent','profilePostCount'));
  updateRichCounter('profileBio','profileBioCount');
  updateRichCounter('profilePostContent','profilePostCount');

  // Aviso de cambios sin guardar: diálogo propio para navegación interna y
  // protección nativa del navegador al cerrar/recargar la pestaña.
  document.addEventListener('click',async(event)=>{
    const logout=event.target.closest('[data-account-action="logout"]');
    if(!logout||!hasUnsavedChanges()||navigatingAfterConfirm)return;
    event.preventDefault();event.stopImmediatePropagation();
    const dialog=ensureUnsavedDialog();dialog.showModal();
    const result=await new Promise((resolve)=>{const onClose=()=>{dialog.removeEventListener('close',onClose);resolve(dialog.returnValue);};dialog.addEventListener('close',onClose);});
    if(result!=='leave')return;
    navigatingAfterConfirm=true;
    try{await fetchJson('/api/auth/logout',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':csrfToken}},8000);}finally{location.assign('/');}
  },true);
  window.addEventListener('beforeunload',(event)=>{
    if(navigatingAfterConfirm||!hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue='';
  });
  document.addEventListener('click',async(event)=>{
    const link=event.target.closest('a[href]');
    if(!link||link.target==='_blank'||link.hasAttribute('download')||link.href.startsWith('javascript:')) return;
    if(!hasUnsavedChanges()||navigatingAfterConfirm) return;
    const url=new URL(link.href,location.href);
    if(url.href===location.href) return;
    event.preventDefault();
    const dialog=ensureUnsavedDialog();
    dialog.showModal();
    const result=await new Promise((resolve)=>{
      const onClose=()=>{dialog.removeEventListener('close',onClose);resolve(dialog.returnValue);};
      dialog.addEventListener('close',onClose);
    });
    if(result==='leave'){navigatingAfterConfirm=true;location.assign(url.href);}
  });

  const oauthError=new URL(location.href).searchParams.get('oauth_error');
  if(oauthError){
    showEditorError('No se pudo completar la sincronización con Discord. Tu sesión sigue abierta; inténtalo nuevamente.',{title:'DISCORD NO RESPONDIÓ',kicker:'SINCRONIZACIÓN'});
    const clean=new URL(location.href);clean.searchParams.delete('oauth_error');history.replaceState(null,'',clean.pathname+clean.search+clean.hash);
  }
  init();
})();

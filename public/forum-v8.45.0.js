(() => {
  'use strict';

  const fetchWithTimeout = window.arkaFetch || (async (input, init = {}, timeoutMs = 20000) => {
    if (!('AbortController' in window)) return window.fetch(input, init);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await window.fetch(input, { ...init, signal: controller.signal });
    } finally {
      window.clearTimeout(timer);
    }
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);
  const categoryData = {
    home: { title: 'HOME', description: 'Inicio general del foro de ARKA WOOD.' },
    actualizaciones: { title: 'ACTUALIZACIONES', description: 'Cambios, novedades y comunicaciones sobre la evolución de ARKA WOOD.' },
    anuncios: { title: 'ANUNCIOS', description: 'Comunicaciones oficiales y avisos importantes publicados por la administración.' },
    modalidades: { title: 'MODALIDADES', description: 'Ideas, dudas, guías y conversaciones relacionadas con las modalidades de la Network.' },
    comunidad: { title: 'COMUNIDAD', description: 'Conversaciones generales, sugerencias, presentaciones y temas creados por la comunidad.' },
    informacion: { title: 'INFORMACIÓN', description: 'Publicaciones de referencia y documentación fijada por el equipo de moderación.' }
  };
  const typeLabels = { off_topic:'OFF TOPIC', general:'GENERAL', network:'NETWORK', modality:'MODALIDAD', bugs:'BUGS', update:'ACTUALIZACIÓN', patch:'PARCHE', announcement:'ANUNCIO', maintenance:'MANTENIMIENTO', discussion:'DISCUSIÓN', question:'PREGUNTA', suggestion:'SUGERENCIA', guide:'GUÍA', report:'REPORTE', event:'EVENTO', help:'AYUDA', clans:'CLANES', rules:'NORMATIVA', faq:'FAQ', reference:'REFERENCIA' };
  const categoryTypes = {
    home: ['discussion'],
    actualizaciones: ['general','network','modality','bugs','update','patch'],
    anuncios: ['general','network','modality','event','announcement','maintenance'],
    modalidades: ['off_topic','help','question','suggestion','discussion','report','clans'],
    comunidad: ['off_topic','help','question','suggestion','discussion','report','clans'],
    informacion: ['general','guide','rules','faq','reference','announcement']
  };
  const imageTokenRe = /\[img\s+width=(\d{1,3})\s+align=(left|center|right)\s+alt="([^"\n]{0,140})"\](data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)\[\/img\]/gi;
  const validIdRe = /^[A-Za-z0-9_-]{30,80}$/;

  const shell = $('forumCategoryNav')?.closest('.forum-shell');
  const routeMain = $('forumRouteMain');
  const categoryView = $('forumCategoryView');
  const threadPage = $('forumThreadPage');
  const composerPage = $('forumComposerPage');
  const categoryTitle = $('forumCategoryTitle');
  const categoryDescription = $('forumCategoryDescription');
  const categoryCrumb = $('forumCategoryCrumb');
  const infoPosts = $('forumCategoryInfoPosts');
  const publicationList = $('forumPublicationList');
  const publicationCount = $('forumPublicationCount');
  const navCategories = Array.from(document.querySelectorAll('[data-forum-category]'));
  const navHome = document.querySelector('[data-forum-home]');
  const categoryPublish = $('forumCategoryPublishButton');
  const authHint = $('forumAuthHint');
  const searchInput = $('forumSearchInput');
  const typeFilter = $('forumTypeFilter');
  const sortFilter = $('forumSortFilter');
  const threadContent = $('forumThreadPageContent');
  const threadReplies = $('forumThreadReplies');
  const threadReplyCount = $('forumThreadReplyCount');
  const threadRepliesSection = $('forumThreadRepliesSection');
  const threadClosedEmpty = $('forumThreadClosedEmpty');
  const infoGroup = $('forumInfoGroup');
  const publicationsGroup = $('forumPublicationsGroup');
  const publicationsTitle = $('forumPublicationsTitle');
  const publicationsEyebrow = $('forumPublicationsEyebrow');
  const replyForm = $('forumReplyForm');
  const replyEditor = $('forumReplyEditor');
  const replySubmit = $('forumReplySubmit');
  const replyHint = $('forumReplyHint');
  const composeForm = $('forumComposeForm');
  const composeStatus = $('forumComposeStatus');
  const composePreview = $('forumComposePreview');
  const composePreviewPanel = $('forumComposePreviewPanel');
  const postEditor = $('forumPostEditor');
  const categoryInput = $('forumPostCategory');
  const typeInput = $('forumPostType');
  const titleInput = $('forumPostTitle');
  const searchDialog = $('forumSearchDialog');
  const uiDialog = $('forumUiDialog');
  const uiDialogTitle = $('forumUiDialogTitle');
  const uiDialogMessage = $('forumUiDialogMessage');
  const uiDialogInputWrap = $('forumUiDialogInputWrap');
  const uiDialogInput = $('forumUiDialogInput');
  const uiDialogInputLabel = $('forumUiDialogInputLabel');
  const uiDialogLinkWrap = $('forumUiDialogLinkWrap');
  const uiDialogLinkText = $('forumUiDialogLinkText');
  const uiDialogLinkUrl = $('forumUiDialogLinkUrl');
  const uiDialogConfirm = $('forumUiDialogConfirm');
  const uiDialogCancel = $('forumUiDialogCancel');
  const toastStack = $('forumToastStack');

  let activeCategory = '';
  let activeThreadId = '';
  let currentThread = null;
  let currentReplies = [];
  let currentThreadPermissions = { canManage: false, canModerate: false, canReply: false };
  let viewer = { id: null, forumModeration: false };
  let viewerPermissions = { forumPublishAll: false, forumPublishCommunity: false, forumPin: false, forumClose: false, forumDeleteThread: false, forumModerateReplies: false };
  let authenticated = false;
  let discordMember = false;
  let csrfToken = '';
  let sessionUser = null;
  let editingPostId = '';
  let editingReplyId = '';
  let replyParentId = '';
  let replyQuoteId = '';
  let searchTimer = 0;
  let globalSearchTimer = 0;
  let mentionTimer = 0;
  let searchMode = 'posts';

  const editorState = {
    post: { editor: postEditor, toolbar: $('forumEditorToolbar'), file: $('forumPostImageInput'), tools: $('forumPostImageTools'), mention: $('forumPostMentionSuggestions'), selectedImage: null, lastRange: null },
    reply: { editor: replyEditor, toolbar: $('forumReplyToolbar'), file: $('forumReplyImageInput'), tools: $('forumReplyImageTools'), mention: $('forumMentionSuggestions'), selectedImage: null, lastRange: null }
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const safeCssUrl = (value) => String(value || '').replace(/["\\\n\r]/g, '');
  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };
  const categoryUrl = (category) => category === 'home' ? '/foro/' : `/foro/${encodeURIComponent(category)}`;
  const publishUrl = (category) => category === 'home' ? '/foro/publicar' : `/foro/${encodeURIComponent(category)}/publicar`;
  const threadUrl = (post) => post.category === 'home' ? `/foro/${encodeURIComponent(post.post_id)}` : `/foro/${encodeURIComponent(post.category)}/${encodeURIComponent(post.post_id)}`;
  const editThreadUrl = (post) => `${threadUrl(post)}/editar`;
  const profileUrl = (id) => id ? `/perfil/${encodeURIComponent(id)}` : '/perfil/';
  const fallbackAvatar = (id) => {
    try { return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(id) >> 22n) % 6n)}.png`; }
    catch { return 'https://cdn.discordapp.com/embed/avatars/0.png'; }
  };
  const avatarUrl = (item) => item?.profile_photo || item?.profilePhoto || item?.author_avatar || (item?.discord_avatar && item?.discord_user_id ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(item.discord_user_id)}/${encodeURIComponent(item.discord_avatar)}.webp?size=256` : fallbackAvatar(item?.discord_user_id || item?.id || '0'));

  function typesForCategory(category) {
    return categoryTypes[category] || [];
  }

  function populateTypeSelect(select, category, { includeAll = false, selected = '' } = {}) {
    if (!select) return;
    const types = typesForCategory(category);
    const options = [];
    if (includeAll) options.push('<option value="">TODOS LOS TIPOS</option>');
    for (const type of types) options.push(`<option value="${escapeHtml(type)}">${escapeHtml(typeLabels[type] || type.toUpperCase())}</option>`);
    select.innerHTML = options.join('');
    const desired = selected && types.includes(selected) ? selected : (includeAll ? '' : (types[0] || ''));
    select.value = desired;
  }

  function canPublishCategory(category) {
    if (!authenticated || category === 'home') return false;
    if (category === 'modalidades' || category === 'comunidad') return Boolean(discordMember && (viewerPermissions.forumPublishCommunity || viewerPermissions.forumPublishAll));
    return Boolean(viewerPermissions.forumPublishAll);
  }

  let uiDialogResolver = null;

  function settleForumDialog(value) {
    if (!uiDialogResolver) return;
    const resolve = uiDialogResolver;
    uiDialogResolver = null;
    try { uiDialog?.close(); } catch {}
    resolve(value);
  }

  function forumDialog({ title = 'ARKA WOOD', message = '', confirmText = 'ACEPTAR', cancelText = 'CANCELAR', input = false, inputValue = '', inputPlaceholder = '', inputLabel = 'VALOR', inputReadonly = false, link = false, linkText = '', linkUrl = '', danger = false, cancelable = true } = {}) {
    if (!uiDialog) return Promise.resolve(link ? { label: String(linkText || ''), url: String(linkUrl || '') } : (input ? String(inputValue || '') : true));
    if (uiDialogResolver) settleForumDialog(null);
    uiDialogTitle.textContent = title;
    uiDialogMessage.textContent = message;
    uiDialogConfirm.textContent = confirmText;
    uiDialogConfirm.classList.toggle('is-danger', Boolean(danger));
    uiDialogCancel.textContent = cancelText;
    uiDialogCancel.hidden = !cancelable;
    uiDialogInputWrap.hidden = !input || link;
    uiDialogLinkWrap.hidden = !link;
    uiDialogInput.value = input && !link ? String(inputValue || '') : '';
    if (uiDialogInputLabel) uiDialogInputLabel.textContent = inputLabel;
    uiDialogInput.readOnly = Boolean(inputReadonly && input && !link);
    uiDialogInput.placeholder = inputPlaceholder;
    uiDialogLinkText.value = link ? String(linkText || '') : '';
    uiDialogLinkUrl.value = link ? String(linkUrl || '') : '';
    uiDialog.dataset.input = input && !link ? '1' : '0';
    uiDialog.dataset.link = link ? '1' : '0';
    return new Promise((resolve) => {
      uiDialogResolver = resolve;
      uiDialog.showModal();
      requestAnimationFrame(() => (link ? (uiDialogLinkText.value ? uiDialogLinkUrl : uiDialogLinkText) : (input ? uiDialogInput : uiDialogConfirm))?.focus());
    });
  }

  function showForumToast(message, tone = 'info') {
    if (!toastStack) return;
    const toast = document.createElement('div');
    toast.className = `forum-toast forum-toast--${tone}`;
    toast.setAttribute('role', tone === 'error' ? 'alert' : 'status');
    toast.innerHTML = `<span>${escapeHtml(message)}</span><button type="button" aria-label="Cerrar aviso">×</button>`;
    toast.querySelector('button')?.addEventListener('click', () => toast.remove());
    toastStack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 220);
    }, 4200);
  }

  uiDialogConfirm?.addEventListener('click', () => {
    const value = uiDialog?.dataset.link === '1'
      ? { label: uiDialogLinkText.value, url: uiDialogLinkUrl.value }
      : (uiDialog?.dataset.input === '1' ? uiDialogInput.value : true);
    settleForumDialog(value);
  });
  uiDialogCancel?.addEventListener('click', () => settleForumDialog(null));
  uiDialog?.addEventListener('cancel', (event) => { event.preventDefault(); settleForumDialog(null); });
  uiDialog?.addEventListener('click', (event) => { if (event.target === uiDialog) settleForumDialog(null); });
  uiDialogInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); settleForumDialog(uiDialogInput.value); }
  });
  uiDialogLinkText?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); uiDialogLinkUrl?.focus(); }
  });
  uiDialogLinkUrl?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); settleForumDialog({ label: uiDialogLinkText.value, url: uiDialogLinkUrl.value }); }
  });

  function normalizeColorMarkup(value) {
    const input = String(value || '');
    const tagRe = /\[fg=(#[0-9a-f]{6})\]|\[\/fg\]/gi;
    const stack = [];
    let out = '';
    let cursor = 0;
    let match;
    while ((match = tagRe.exec(input))) {
      out += input.slice(cursor, match.index);
      if (match[1]) {
        const color = match[1].toLowerCase();
        const redundant = stack.length > 0 && stack[stack.length - 1].color === color;
        stack.push({ color, emitted: !redundant });
        if (!redundant) out += `[fg=${color}]`;
      } else if (stack.length) {
        const item = stack.pop();
        if (item.emitted) out += '[/fg]';
      }
      cursor = tagRe.lastIndex;
    }
    out += input.slice(cursor);
    while (stack.length) {
      const item = stack.pop();
      if (item.emitted) out += '[/fg]';
    }
    return out;
  }

  function stripColorMarkup(value) {
    return String(value || '').replace(/\[fg=#[0-9a-f]{6}\]|\[\/fg\]/gi, '');
  }

  function inlineFormat(text) {
    const links = [];
    const token = (label, url) => {
      const index = links.push({ label: String(label || url || ''), url: String(url || '') }) - 1;
      return `FORUMLINKTOKEN${index}QZ`;
    };
    let raw = normalizeColorMarkup(String(text || ''));
    raw = raw.replace(/\[([^\]\n]+)\]\((https:\/\/[^)\s]+)\)/g, (_m, label, url) => token(label, url));
    raw = raw.replace(/https:\/\/[^\s<>"']+/g, (match) => {
      const parts = match.match(/^(.*?)([.,!?;:]*)$/);
      const url = parts?.[1] || match;
      return `${token(url, url)}${parts?.[2] || ''}`;
    });
    let safe = escapeHtml(raw);
    safe = safe.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    safe = safe.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>');
    safe = safe.replace(/__([^_\n]+)__/g, '<u>$1</u>');
    safe = safe.replace(/~~([^~\n]+)~~/g, '<s>$1</s>');
    safe = safe.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    safe = safe.replace(/(^|[\s>(])@([A-Za-z0-9_.]{2,32})/g, '$1<span class="forum-mention">@$2</span>');
    safe = safe.replace(/\[color=(?:gold|ember|red|violet|blue|green)\]([\s\S]*?)\[\/color\]/gi, '$1');
    safe = safe.replace(/\[fg=(#[0-9a-f]{6})\]/gi, (_m, color) => `<span class="forum-text-color" style="color:${color}">`);
    safe = safe.replace(/\[\/fg\]/gi, '</span>');
    safe = safe.replace(/FORUMLINKTOKEN(\d+)QZ/g, (_m, index) => {
      const item = links[Number(index)] || { label: '', url: '' };
      const escapedUrl = escapeHtml(item.url);
      const escapedLabel = escapeHtml(item.label);
      return `<a href="${escapedUrl}" rel="noopener noreferrer" target="_blank">${escapedLabel}</a>`;
    });
    return safe;
  }

  function renderTextSegment(value) {
    const lines = String(value || '').replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let ul = [];
    let ol = [];
    const flush = () => {
      if (ul.length) { out.push(`<ul>${ul.map((x) => `<li>${inlineFormat(x)}</li>`).join('')}</ul>`); ul = []; }
      if (ol.length) { out.push(`<ol>${ol.map((x) => `<li>${inlineFormat(x)}</li>`).join('')}</ol>`); ol = []; }
    };
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (/^[-*]\s+/.test(line)) { if (ol.length) flush(); ul.push(line.replace(/^[-*]\s+/, '')); continue; }
      if (/^\d+\.\s+/.test(line)) { if (ul.length) flush(); ol.push(line.replace(/^\d+\.\s+/, '')); continue; }
      flush();
      if (!line.trim()) out.push('<div class="forum-rich-spacer"></div>');
      else if (/^##\s+/.test(line)) out.push(`<h3>${inlineFormat(line.replace(/^##\s+/, ''))}</h3>`);
      else if (/^#\s+/.test(line)) out.push(`<h2>${inlineFormat(line.replace(/^#\s+/, ''))}</h2>`);
      else if (/^>\s?/.test(line)) out.push(`<blockquote>${inlineFormat(line.replace(/^>\s?/, ''))}</blockquote>`);
      else out.push(`<p>${inlineFormat(line)}</p>`);
    }
    flush();
    return out.join('');
  }

  function renderRichText(value, { editable = false } = {}) {
    const text = String(value || '');
    const out = [];
    let cursor = 0;
    let match;
    imageTokenRe.lastIndex = 0;
    while ((match = imageTokenRe.exec(text))) {
      if (match.index > cursor) out.push(renderTextSegment(text.slice(cursor, match.index)));
      const width = Math.max(20, Math.min(100, Number(match[1]) || 70));
      const align = ['left', 'center', 'right'].includes(match[2]) ? match[2] : 'center';
      const rawAlt = String(match[3] || 'Imagen adjunta');
      const alt = escapeHtml(rawAlt);
      const editableAttrs = editable ? ` contenteditable="false" tabindex="0" data-forum-image="1" data-source="${match[4]}" data-width="${width}" data-align="${align}" data-alt="${alt}"` : '';
      out.push(`<figure class="forum-inline-image forum-inline-image--${align}${editable ? ' forum-editor-image' : ''}" style="--forum-image-width:${width}%"${editableAttrs}><img src="${match[4]}" alt="${alt}" loading="lazy">${editable ? '<span class="forum-editor-image__hint">CLIC PARA AJUSTAR</span>' : ''}</figure>`);
      cursor = imageTokenRe.lastIndex;
    }
    if (cursor < text.length) out.push(renderTextSegment(text.slice(cursor)));
    return out.join('');
  }

  function plainMarkup(value, max = 240) {
    let text = stripColorMarkup(String(value || '').replace(imageTokenRe, ' [imagen] '));
    text = text.replace(/\[color=[^\]]+\]|\[\/color\]|\[u\]|\[\/u\]/gi, '').replace(/\[([^\]]+)\]\(https:\/\/[^)]+\)/g, '$1').replace(/[*_~`>#-]/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  }

  function roleBadges(item, fallback = 'MIEMBRO', compact = false) {
    const toolkit = window.arkaRoleBadges;
    const roles = toolkit?.fromItem ? toolkit.fromItem(item) : [];
    const html = toolkit?.render ? toolkit.render(roles, item?.user_rank || item?.rank || fallback) : `<span class="arka-role-badge arka-role-badge--fallback">${escapeHtml(item?.user_rank || item?.rank || fallback)}</span>`;
    return `<div class="arka-role-stack${compact ? ' arka-role-stack--compact' : ''}">${html}</div>`;
  }


  function brandSvg(key){
    if(key==='instagram') return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor"/></svg>';
    if(key==='facebook') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.8 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.6 1.6-1.6H17V4.8c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.5V11H7v3h3v8h3.8Z"/></svg>';
    if(key==='youtube') return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.2" y="5.2" width="19.6" height="13.6" rx="4" fill="currentColor"/><path d="M10 8.4 16.2 12 10 15.6Z" fill="#0b0908"/></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>';
  }
  const FORUM_SOCIALS = [
    { key:'instagram', label:'Instagram' },
    { key:'facebook', label:'Facebook' },
    { key:'youtube', label:'YouTube' },
    { key:'twitter', label:'Twitter / X' }
  ];
  function forumSocialLinks(item){
    const links=item?.social_links || item?.socialLinks || {};
    const markup=FORUM_SOCIALS.map((platform)=>{
      const href=String(links?.[platform.key]||'').trim();
      if(!href)return '';
      return `<a class="forum-author-social forum-author-social--${platform.key}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer nofollow" aria-label="${escapeHtml(platform.label)} de ${escapeHtml(item?.author_name || item?.display_name || 'usuario')}"><span>${brandSvg(platform.key)}</span></a>`;
    }).filter(Boolean).join('');
    return markup ? `<div class="forum-author-socials">${markup}</div>` : '';
  }

  function authorPanel(item, { number = '', compact = false } = {}) {
    const id = item.discord_user_id || item.id || '';
    const name = item.author_name || item.display_name || item.displayName || item.discord_username || item.username || 'Usuario';
    const rank = item.user_rank || item.rank || 'MIEMBRO';
    const discord = item.discord_username || item.username || '';
    const minecraft = item.minecraft_username || '';
    const avatar = avatarUrl(item);
    const bannerStyle = item.banner ? ` style="background-image:linear-gradient(180deg,rgba(7,6,5,.16),rgba(7,6,5,.88)),url('${safeCssUrl(item.banner)}')"` : '';
    return `<aside class="forum-post-author${compact ? ' forum-post-author--compact' : ''}">
      <a class="forum-post-author__banner" href="${profileUrl(id)}" aria-label="Abrir perfil de ${escapeHtml(name)}"${bannerStyle}></a>
      <a class="forum-post-author__avatar" href="${profileUrl(id)}"><img src="${escapeHtml(avatar)}" alt="Foto de perfil de ${escapeHtml(name)}" loading="lazy"></a>
      <a class="forum-post-author__name" href="${profileUrl(id)}">${escapeHtml(name)}</a>
      ${roleBadges(item, rank)}
      ${discord ? `<small>@${escapeHtml(discord)}</small>` : ''}
      ${minecraft ? `<em>Minecraft: ${escapeHtml(minecraft)}</em>` : '<em>Minecraft sin configurar</em>'}
      ${forumSocialLinks(item)}
      ${number ? `<b class="forum-post-number">#${escapeHtml(number)}</b>` : ''}
    </aside>`;
  }

  function postBadges(post) {
    return `${Number(post.is_pinned) ? '<span class="forum-state-badge forum-state-badge--pinned">FIJADO</span>' : ''}${Number(post.is_locked) ? '<span class="forum-state-badge forum-state-badge--locked">CERRADO</span>' : ''}`;
  }

  function threadRow(post, { pinned = false } = {}) {
    const replies = Number(post.reply_count || 0);
    const lastName = post.last_reply_author_name || post.author_name || 'Usuario';
    const lastId = post.last_reply_author_id || post.discord_user_id;
    const lastAvatar = post.last_reply_author_avatar || avatarUrl(post);
    const lastAt = post.last_reply_at || post.updated_at || post.created_at;
    const hasBanner = Boolean(Number(post.has_banner || 0));
    const bannerUrl = hasBanner && post.discord_user_id ? `/api/profile/banner/${encodeURIComponent(post.discord_user_id)}` : '';
    const bannerStyle = bannerUrl ? ` style="--forum-thread-banner:url('${safeCssUrl(bannerUrl)}')"` : '';
    return `<article class="forum-thread-row${pinned || Number(post.is_pinned) ? ' is-pinned' : ''}${hasBanner ? ' has-profile-banner' : ''}"${bannerStyle}>
      <a class="forum-thread-row__avatar" href="${profileUrl(post.discord_user_id)}"><img src="${escapeHtml(avatarUrl(post))}" alt="" loading="lazy"></a>
      <div class="forum-thread-row__subject">
        <div class="forum-thread-row__badges"><span>${escapeHtml(typeLabels[post.post_type] || 'DISCUSIÓN')}</span>${postBadges(post)}</div>
        <h4><a href="${threadUrl(post)}">${escapeHtml(post.title)}</a></h4>
        <p><a href="${profileUrl(post.discord_user_id)}">${escapeHtml(post.author_name || 'Usuario')}</a> · ${escapeHtml(formatDate(post.created_at))}</p>${roleBadges(post, post.user_rank || 'MIEMBRO', true)}
      </div>
      <div class="forum-thread-row__stats"><span>RESPUESTAS <b>${replies}</b></span></div>
      <div class="forum-thread-row__last"><div><time>${escapeHtml(formatDate(lastAt))}</time><a href="${profileUrl(lastId)}">${escapeHtml(lastName)}</a></div><a href="${profileUrl(lastId)}"><img src="${escapeHtml(lastAvatar)}" alt="" loading="lazy"></a></div>
    </article>`;
  }

  async function loadPinned(category) {
    if (!infoPosts || !category) return;
    infoPosts.innerHTML = '<div class="forum-publication-empty"><span>Cargando publicaciones fijadas...</span></div>';
    try {
      const params = category === 'informacion'
        ? new URLSearchParams({ all: '1', pinned: '1', sort: 'latest', limit: '12' })
        : new URLSearchParams({ category, pinned: '1', sort: 'latest', limit: '12' });
      const response = await fetchWithTimeout(`/api/forum/posts?${params}`, { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'load_failed');
      if (category !== activeCategory) return;
      if (!data.configured || !data.posts?.length) {
        infoPosts.innerHTML = '<div class="forum-publication-empty"><span>No hay publicaciones fijadas todavía.</span></div>';
        return;
      }
      infoPosts.innerHTML = data.posts.map((post) => threadRow(post, { pinned: true })).join('');
    } catch (error) {
      infoPosts.innerHTML = `<div class="forum-publication-empty"><span>${escapeHtml(error.message || 'No se pudo cargar la información fijada.')}</span></div>`;
    }
  }

  function renderPublications(posts, configured = true) {
    if (!publicationList) return;
    if (!configured) {
      publicationList.innerHTML = '<div class="forum-publication-empty"><b>PUBLICACIONES NO DISPONIBLES</b><span>No se pudo acceder al historial del foro en este momento.</span></div>';
      if (publicationCount) publicationCount.textContent = '0 TEMAS';
      return;
    }
    const regular = activeCategory === 'informacion' ? (posts || []) : (posts || []).filter((post) => !Number(post.is_pinned));
    if (publicationCount) publicationCount.textContent = `${regular.length} ${regular.length === 1 ? 'TEMA' : 'TEMAS'}`;
    if (!regular.length) {
      publicationList.innerHTML = '<div class="forum-publication-empty"><b>NO HAY RESULTADOS</b><span>No hay publicaciones que coincidan con los filtros actuales.</span></div>';
      return;
    }
    publicationList.innerHTML = regular.map((post) => threadRow(post)).join('');
  }

  async function loadPublications(category = activeCategory) {
    if (!publicationList || !category) return;
    publicationList.innerHTML = '<div class="forum-publication-empty"><span>Cargando publicaciones...</span></div>';
    const query = searchInput?.value.trim();
    const type = typeFilter?.value || '';
    const sort = sortFilter?.value || 'latest';
    const buildParams = (base = {}) => {
      const params = new URLSearchParams({ ...base, sort, limit: '80' });
      if (query) params.set('search', query);
      if (type) params.set('type', type);
      return params;
    };
    try {
      let posts = [];
      let configured = true;
      if (category === 'informacion') {
        const [directResponse, pinnedResponse] = await Promise.all([
          fetchWithTimeout(`/api/forum/posts?${buildParams({ category: 'informacion' })}`, { credentials: 'same-origin', cache: 'no-store' }),
          fetchWithTimeout(`/api/forum/posts?${buildParams({ all: '1', pinned: '1' })}`, { credentials: 'same-origin', cache: 'no-store' })
        ]);
        const [directData, pinnedData] = await Promise.all([directResponse.json().catch(() => ({})), pinnedResponse.json().catch(() => ({}))]);
        if (!directResponse.ok || !directData.ok) throw new Error(directData.error || 'load_failed');
        if (!pinnedResponse.ok || !pinnedData.ok) throw new Error(pinnedData.error || 'load_failed');
        if (category !== activeCategory) return;
        configured = directData.configured !== false && pinnedData.configured !== false;
        const unique = new Map();
        [...(pinnedData.posts || []), ...(directData.posts || [])].forEach((post) => unique.set(String(post.post_id), post));
        posts = [...unique.values()];
        if (sort === 'oldest') posts.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
        else if (sort === 'replies') posts.sort((a,b) => Number(b.reply_count || 0) - Number(a.reply_count || 0) || new Date(b.created_at) - new Date(a.created_at));
        else posts.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
      } else {
        const params = buildParams({ category });
        const response = await fetchWithTimeout(`/api/forum/posts?${params}`, { credentials: 'same-origin', cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || 'load_failed');
        if (category !== activeCategory) return;
        posts = data.posts || [];
        configured = data.configured !== false;
      }
      renderPublications(posts, configured);
    } catch (error) {
      if (category !== activeCategory) return;
      publicationList.innerHTML = '<div class="forum-publication-empty"><b>NO SE PUDO CARGAR</b><span>El historial del foro no está disponible en este momento.</span></div>';
    }
  }

  async function loadHomeCategoryHighlights(category, rootId, limit = 3) {
    const root = document.getElementById(rootId);
    if (!root) return;
    root.innerHTML = '<div class="forum-publication-empty"><span>Cargando publicaciones...</span></div>';
    try {
      let posts = [];
      let configured = true;
      if (category === 'informacion') {
        const [directResponse, pinnedResponse] = await Promise.all([
          fetchWithTimeout('/api/forum/posts?category=informacion&sort=latest&limit=80', { credentials: 'same-origin', cache: 'no-store' }),
          fetchWithTimeout('/api/forum/posts?all=1&pinned=1&sort=latest&limit=80', { credentials: 'same-origin', cache: 'no-store' })
        ]);
        const [directData, pinnedData] = await Promise.all([directResponse.json().catch(() => ({})), pinnedResponse.json().catch(() => ({}))]);
        if (!directResponse.ok || !directData.ok || !pinnedResponse.ok || !pinnedData.ok) throw new Error('load_failed');
        configured = directData.configured !== false && pinnedData.configured !== false;
        const unique = new Map();
        [...(pinnedData.posts || []), ...(directData.posts || [])].forEach((post) => unique.set(String(post.post_id), post));
        posts = [...unique.values()];
      } else {
        const params = new URLSearchParams({ category, sort: 'latest', limit: '80' });
        const response = await fetchWithTimeout(`/api/forum/posts?${params}`, { credentials: 'same-origin', cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || 'load_failed');
        configured = data.configured !== false;
        posts = data.posts || [];
      }
      if (!configured) {
        root.innerHTML = '<div class="forum-publication-empty"><span>Las publicaciones no están disponibles en este momento.</span></div>';
        return;
      }
      posts = posts.slice().sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
      root.innerHTML = posts.length
        ? posts.map((post) => threadRow(post, { pinned: Number(post.is_pinned) === 1 })).join('')
        : `<div class="forum-publication-empty"><span>No hay publicaciones en ${escapeHtml(categoryData[category]?.title || category)}.</span></div>`;
    } catch {
      root.innerHTML = '<div class="forum-publication-empty"><span>No se pudieron cargar las publicaciones.</span></div>';
    }
  }

  function loadHomeHighlights() {
    loadHomeCategoryHighlights('actualizaciones', 'forumLatestUpdates', 3);
    loadHomeCategoryHighlights('anuncios', 'forumHomeAnnouncements', 3);
    loadHomeCategoryHighlights('modalidades', 'forumHomeModalities', 3);
    loadHomeCategoryHighlights('comunidad', 'forumHomeCommunity', 3);
    loadHomeCategoryHighlights('informacion', 'forumHomeInformation', 3);
  }

  async function loadHomeActivity() {
    const root = document.querySelector('#actividad .forum-activity-list');
    if (!root) return;
    try {
      const response = await fetchWithTimeout('/api/forum/posts?all=1&sort=latest&limit=10', { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok || data.configured === false) throw new Error('load_failed');
      if (!data.posts?.length) {
        root.innerHTML = '<div class="forum-publication-empty"><span>No hay actividad reciente.</span></div>';
        return;
      }
      root.innerHTML = data.posts.map((post) => `<a class="forum-activity forum-activity--live" href="${threadUrl(post)}"><div class="forum-activity__avatar"><img src="${escapeHtml(avatarUrl(post))}" alt="" loading="lazy"></div><div><small>${escapeHtml(categoryData[post.category]?.title || post.category)}</small><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.author_name)} · ${escapeHtml(post.user_rank || 'MIEMBRO')} · ${escapeHtml(formatDate(post.created_at))}</p></div><span>${Number(post.reply_count || 0)}</span></a>`).join('');
    } catch {
      root.innerHTML = '<div class="forum-publication-empty"><span>No se pudo cargar la actividad reciente.</span></div>';
    }
  }

  function routeParts() {
    const parts = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    const index = parts.indexOf('foro');
    return index >= 0 ? parts.slice(index + 1) : [];
  }

  function navigateForum(href, { replace = false } = {}) {
    const target = new URL(href, location.origin);
    if (target.origin !== location.origin || !target.pathname.startsWith('/foro/')) { location.assign(target.href); return; }
    const next = `${target.pathname}${target.search}${target.hash}`;
    if (replace) history.replaceState({ forumRoute: true }, '', next);
    else if (`${location.pathname}${location.search}${location.hash}` !== next) history.pushState({ forumRoute: true }, '', next);
    if (searchDialog?.open) searchDialog.close();
    initRoute();
    const top = $('forumCategoryNav') || shell;
    if (top) window.scrollTo({ top: Math.max(0, top.getBoundingClientRect().top + scrollY - 88), behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  function markNav(category, home = false) {
    navHome?.classList.toggle('is-active', home);
    if (home) navHome?.setAttribute('aria-current', 'page'); else navHome?.removeAttribute('aria-current');
    navCategories.forEach((link) => {
      const active = link.dataset.forumCategory === category;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
  }

  function updatePublishAvailability() {
    const allowed = canPublishCategory(activeCategory);
    if (categoryPublish) {
      categoryPublish.hidden = !allowed;
      categoryPublish.disabled = !allowed;
      categoryPublish.title = allowed ? 'Publicar tema' : (authenticated && !discordMember && ['modalidades','comunidad'].includes(activeCategory) ? 'Debes pertenecer al Discord de ARKA WOOD para publicar aquí.' : 'No tienes permiso para crear temas en esta sección.');
    }
    if (authHint) {
      if (activeCategory === 'home' || allowed) {
        authHint.hidden = true;
        authHint.textContent = '';
      } else {
        authHint.hidden = false;
        authHint.textContent = !authenticated
          ? 'Conecta tu cuenta de Discord para participar.'
          : !discordMember && ['modalidades','comunidad'].includes(activeCategory)
            ? 'Debes pertenecer al servidor de Discord de ARKA WOOD para publicar en esta sección.'
            : 'Esta sección solo permite nuevas publicaciones a los rangos autorizados.';
      }
    }
  }

  function hideRouteViews() {
    if (categoryView) categoryView.hidden = true;
    if (threadPage) threadPage.hidden = true;
    if (composerPage) composerPage.hidden = true;
  }

  function showHomeRoute() {
    activeCategory = 'home';
    activeThreadId = '';
    currentThread = null;
    editingPostId = '';
    shell?.classList.remove('is-route-view', 'is-thread-route', 'is-composer-route');
    if (routeMain) routeMain.hidden = true;
    hideRouteViews();
    markNav('home', true);
    document.title = 'Foro · ARKA WOOD';
    updatePublishAvailability();
    loadHomeHighlights();
    loadHomeActivity();
  }

  function showCategoryRoute(category) {
    if (!categoryData[category]) return showNotFound('La categoría solicitada no existe.');
    activeCategory = category;
    activeThreadId = '';
    currentThread = null;
    editingPostId = '';
    shell?.classList.add('is-route-view');
    shell?.classList.remove('is-thread-route', 'is-composer-route');
    if (routeMain) routeMain.hidden = false;
    hideRouteViews();
    categoryView.hidden = false;
    markNav(category, false);
    categoryTitle.textContent = categoryData[category].title;
    categoryCrumb.textContent = categoryData[category].title;
    categoryDescription.textContent = categoryData[category].description;
    if (searchInput) searchInput.value = '';
    populateTypeSelect(typeFilter, category, { includeAll: true });
    if (sortFilter) sortFilter.value = 'latest';
    const informationOnly = category === 'informacion';
    if (infoGroup) infoGroup.hidden = informationOnly;
    if (publicationsGroup) publicationsGroup.hidden = false;
    if (publicationsTitle) publicationsTitle.textContent = informationOnly ? 'INFORMACIÓN' : 'PUBLICACIONES';
    if (publicationsEyebrow) publicationsEyebrow.textContent = informationOnly ? 'CONTENIDO OFICIAL' : 'CONVERSACIONES';
    document.title = `${categoryData[category].title} · Foro · ARKA WOOD`;
    updatePublishAvailability();
    if (category !== 'informacion') loadPinned(category);
    loadPublications(category);
  }

  function showNotFound(message) {
    activeCategory = '';
    activeThreadId = '';
    shell?.classList.add('is-route-view');
    shell?.classList.remove('is-composer-route');
    if (routeMain) routeMain.hidden = false;
    hideRouteViews();
    threadPage.hidden = false;
    threadContent.innerHTML = `<div class="forum-publication-empty forum-route-error"><b>RUTA NO ENCONTRADA</b><span>${escapeHtml(message)}</span><a class="forum-publish-button" href="/foro/">VOLVER AL FORO</a></div>`;
    threadReplies.innerHTML = '';
    if (threadRepliesSection) threadRepliesSection.hidden = true;
    if (threadClosedEmpty) threadClosedEmpty.hidden = true;
    replyForm.hidden = true;
    markNav('', false);
    updatePublishAvailability();
  }

  function renderThread(post, permissions) {
    const ownerManagement = `${permissions?.canManage ? '<button type="button" data-thread-edit>EDITAR</button>' : ''}${permissions?.canDelete ? '<button type="button" data-thread-delete>ELIMINAR</button>' : ''}`;
    const moderation = `${permissions?.canPin ? `<button type="button" data-thread-action="${Number(post.is_pinned) ? 'unpin' : 'pin'}">${Number(post.is_pinned) ? 'QUITAR FIJADO' : 'FIJAR EN INFORMACIÓN'}</button>` : ''}${permissions?.canClose ? `<button type="button" data-thread-action="${Number(post.is_locked) ? 'unlock' : 'lock'}">${Number(post.is_locked) ? 'REABRIR TEMA' : 'CERRAR TEMA'}</button>` : ''}`;
    threadContent.innerHTML = `<article class="forum-message-card forum-message-card--original" id="publicacion-${escapeHtml(post.post_id)}">
      ${authorPanel(post, { number: '1' })}
      <div class="forum-message-body">
        <div class="forum-message-topic-header">
          <div><div class="forum-topic-heading__badges"><span>${escapeHtml(typeLabels[post.post_type] || 'DISCUSIÓN')}</span>${postBadges(post)}</div><h1>${escapeHtml(post.title)}</h1><p>Por <a href="${profileUrl(post.discord_user_id)}">${escapeHtml(post.author_name || 'Usuario')}</a> · ${escapeHtml(formatDate(post.created_at))}</p></div>
          <button class="forum-share-topic" type="button" data-share-thread>COMPARTIR</button>
        </div>
        <header class="forum-message-meta"><time>${escapeHtml(formatDate(post.created_at))}</time><span>#1</span></header>
        <div class="forum-rich-text forum-thread-post__body">${renderRichText(post.content)}</div>
        <footer><div>${Number(post.is_locked) && Number(post.reply_count || 0) === 0 ? '<span>Tema cerrado</span>' : `<span>${Number(post.reply_count || 0)} respuestas</span>`}${post.updated_at && post.updated_at !== post.created_at ? `<span>Editado ${escapeHtml(formatDate(post.updated_at))}</span>` : ''}</div>${ownerManagement || moderation ? `<div class="forum-thread-management">${ownerManagement}${moderation}</div>` : ''}</footer>
      </div>
    </article>`;
  }

  function replyQuote(reply) {
    if (!reply.quoted_reply_id) return '';
    const name = reply.quoted_author_name || 'Usuario';
    const body = plainMarkup(reply.quoted_content || '', 280);
    return `<a class="forum-reply-quote" href="#respuesta-${escapeHtml(reply.quoted_reply_id)}"><small>CITA DE ${escapeHtml(name)}</small><p>${escapeHtml(body)}</p></a>`;
  }

  function renderReplies(replies) {
    currentReplies = replies || [];
    threadReplyCount.textContent = String(currentReplies.length);
    if (!currentReplies.length) {
      const closedWithoutReplies = Boolean(currentThread?.is_locked);
      if (threadRepliesSection) threadRepliesSection.hidden = closedWithoutReplies;
      if (threadClosedEmpty) threadClosedEmpty.hidden = !closedWithoutReplies;
      threadReplies.innerHTML = closedWithoutReplies ? '' : '<div class="forum-publication-empty forum-no-replies"><span>Todavía no hay respuestas. Sé la primera persona en participar.</span></div>';
      return;
    }
    if (threadRepliesSection) threadRepliesSection.hidden = false;
    if (threadClosedEmpty) threadClosedEmpty.hidden = true;
    threadReplies.innerHTML = currentReplies.map((reply, index) => {
      const canManage = Boolean(viewer.id && (String(viewer.id) === String(reply.discord_user_id) || viewer.forumModeration));
      const parent = reply.parent_reply_id ? `<a class="forum-reply-parent" href="#respuesta-${escapeHtml(reply.parent_reply_id)}">↳ En respuesta a ${escapeHtml(reply.parent_author_name || 'otro comentario')}</a>` : '';
      const actions = `<div class="forum-reply-tools"><button data-reply-action="reply" data-reply-id="${escapeHtml(reply.reply_id)}" type="button">RESPONDER</button><button data-reply-action="share" data-reply-id="${escapeHtml(reply.reply_id)}" type="button">COMPARTIR</button>${canManage ? `<button data-reply-action="edit" data-reply-id="${escapeHtml(reply.reply_id)}" type="button">EDITAR</button><button data-reply-action="delete" data-reply-id="${escapeHtml(reply.reply_id)}" type="button">ELIMINAR</button>` : ''}</div>`;
      return `<article class="forum-message-card forum-message-card--reply${reply.parent_reply_id ? ' is-child' : ''}" id="respuesta-${escapeHtml(reply.reply_id)}">
        ${authorPanel(reply, { number: String(index + 2) })}
        <div class="forum-message-body">${parent}${replyQuote(reply)}<header><time>${escapeHtml(formatDate(reply.created_at))}</time><a href="#respuesta-${escapeHtml(reply.reply_id)}">#${index + 2}</a></header><div class="forum-rich-text">${renderRichText(reply.content)}</div><footer><div class="forum-reply-meta"><code>ID ${escapeHtml(reply.reply_id)}</code>${reply.updated_at && reply.updated_at !== reply.created_at ? `<span>Editado ${escapeHtml(formatDate(reply.updated_at))}</span>` : ''}</div>${actions}</footer></div>
      </article>`;
    }).join('');
    if (location.hash.startsWith('#respuesta-')) requestAnimationFrame(() => {
      const node = document.getElementById(location.hash.slice(1));
      if (node) {
        node.classList.add('is-targeted');
        node.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
        setTimeout(() => node.classList.remove('is-targeted'), 1800);
      }
    });
  }

  function setEditorEnabled(editor, enabled) {
    if (!editor) return;
    editor.setAttribute('contenteditable', enabled ? 'true' : 'false');
    editor.setAttribute('aria-disabled', enabled ? 'false' : 'true');
  }

  function updateReplyAvailability() {
    if (!replyForm || !replyEditor) return;
    const locked = Boolean(currentThread?.is_locked);
    const enabled = authenticated && !locked;
    replyForm.hidden = locked;
    setEditorEnabled(replyEditor, enabled);
    replySubmit.disabled = !enabled;
    replyForm.classList.toggle('is-locked', locked);
    replyHint.textContent = authenticated ? (editingReplyId ? 'Editando tu comentario.' : 'Usa @usuario para mencionar, cita respuestas o inserta imágenes directamente.') : 'Conecta Discord para responder.';
  }

  async function showThreadRoute(category, postId) {
    if (!categoryData[category] || !validIdRe.test(postId || '')) return showNotFound('La publicación solicitada no es válida.');
    activeCategory = category;
    activeThreadId = postId;
    editingPostId = '';
    shell?.classList.add('is-route-view', 'is-thread-route');
    shell?.classList.remove('is-composer-route');
    if (routeMain) routeMain.hidden = false;
    hideRouteViews();
    threadPage.hidden = false;
    replyForm.hidden = true;
    markNav(category, category === 'home');
    $('forumThreadBreadcrumb').innerHTML = `<a href="/foro/">FOROS</a><span>›</span><a href="${categoryUrl(category)}">${escapeHtml(categoryData[category].title)}</a><span>›</span><b>PUBLICACIÓN</b>`;
    threadContent.innerHTML = '<div class="forum-publication-empty"><span>Cargando publicación...</span></div>';
    threadReplies.innerHTML = '';
    if (threadRepliesSection) threadRepliesSection.hidden = false;
    if (threadClosedEmpty) threadClosedEmpty.hidden = true;
    updatePublishAvailability();
    try {
      const response = await fetchWithTimeout(`/api/forum/thread/${encodeURIComponent(postId)}`, { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'thread_failed');
      if (data.post.category !== category) { navigateForum(threadUrl(data.post), { replace: true }); return; }
      currentThread = data.post;
      currentThreadPermissions = data.permissions || {};
      viewer = data.viewer || viewer;
      renderThread(data.post, currentThreadPermissions);
      renderReplies(data.replies || []);
      updateReplyAvailability();
      document.title = `${data.post.title} · ${categoryData[category].title} · Foro`;
    } catch (error) {
      threadContent.innerHTML = `<div class="forum-publication-empty forum-route-error"><b>NO SE PUDO ABRIR EL TEMA</b><span>${escapeHtml(error.message || 'Error temporal.')}</span><a class="forum-publish-button" href="${categoryUrl(category)}">VOLVER</a></div>`;
      threadReplies.innerHTML = '';
      if (threadRepliesSection) threadRepliesSection.hidden = true;
      if (threadClosedEmpty) threadClosedEmpty.hidden = true;
      replyForm.hidden = true;
    }
  }

  function resetComposer(category) {
    editingPostId = '';
    if (composeForm) composeForm.reset();
    categoryInput.value = category || 'comunidad';
    titleInput.value = '';
    populateTypeSelect(typeInput, category || 'comunidad');
    clearEditor(postEditor);
    composeStatus.textContent = '';
    composePreviewPanel.hidden = true;
    $('forumComposeSubmit').textContent = 'PUBLICAR TEMA';
  }

  async function showComposerRoute(category, postId = '') {
    if (!categoryData[category]) return showNotFound('La categoría solicitada no existe.');
    if (!postId && category === 'home') return showNotFound('HOME es el inicio del foro y no admite publicaciones directas.');
    if (!postId && authenticated && !canPublishCategory(category)) return showNotFound('No tienes permiso para crear publicaciones en esta sección.');
    if (postId && !validIdRe.test(postId)) return showNotFound('La publicación que intentas editar no es válida.');
    activeCategory = category;
    activeThreadId = postId || '';
    currentThread = null;
    shell?.classList.add('is-route-view', 'is-composer-route');
    shell?.classList.remove('is-thread-route');
    if (routeMain) routeMain.hidden = false;
    hideRouteViews();
    composerPage.hidden = false;
    composerPage.dataset.permissionLocked = '0';
    markNav(category, category === 'home');
    updatePublishAvailability();
    const isEdit = Boolean(postId);
    $('forumComposerBreadcrumb').innerHTML = `<a href="/foro/">FOROS</a><span>›</span><a href="${categoryUrl(category)}">${escapeHtml(categoryData[category].title)}</a><span>›</span><b>${isEdit ? 'EDITAR TEMA' : 'PUBLICAR TEMA'}</b>`;
    $('forumComposeCancel').href = isEdit ? (category === 'home' ? `/foro/${encodeURIComponent(postId)}` : `/foro/${encodeURIComponent(category)}/${encodeURIComponent(postId)}`) : categoryUrl(category);
    resetComposer(category);
    $('forumComposeTitle').textContent = isEdit ? 'EDITAR TEMA' : 'PUBLICAR TEMA';
    $('forumComposeSubtitle').textContent = isEdit ? 'Modifica el contenido conservando la URL y el historial del tema.' : `Publicando en ${categoryData[category].title}. Las imágenes aparecerán directamente dentro del editor.`;
    if (!authenticated) {
      composeStatus.textContent = 'Debes conectar tu cuenta de Discord para publicar.';
      setEditorEnabled(postEditor, false);
      $('forumComposeSubmit').disabled = true;
    } else if (!isEdit && !canPublishCategory(category)) {
      composeStatus.textContent = !discordMember && ['modalidades','comunidad'].includes(category) ? 'Debes pertenecer al servidor de Discord de ARKA WOOD para publicar aquí.' : 'No tienes permiso para crear publicaciones en esta sección.';
      setEditorEnabled(postEditor, false);
      $('forumComposeSubmit').disabled = true;
      composerPage.dataset.permissionLocked = '1';
    } else {
      setEditorEnabled(postEditor, true);
      $('forumComposeSubmit').disabled = false;
    }
    if (isEdit) {
      composeStatus.textContent = 'Cargando publicación...';
      try {
        const response = await fetchWithTimeout(`/api/forum/thread/${encodeURIComponent(postId)}`, { credentials: 'same-origin', cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || 'thread_failed');
        if (!data.permissions?.canManage) throw new Error('forbidden');
        if (data.post.category !== category) { navigateForum(editThreadUrl(data.post), { replace: true }); return; }
        currentThread = data.post;
        currentThreadPermissions = data.permissions;
        editingPostId = postId;
        titleInput.value = data.post.title || '';
        populateTypeSelect(typeInput, data.post.category, { selected: data.post.post_type || '' });
        categoryInput.value = data.post.category;
        loadMarkupIntoEditor(postEditor, data.post.content || '');
        $('forumComposeSubmit').textContent = 'GUARDAR CAMBIOS';
        composeStatus.textContent = '';
      } catch (error) {
        composeStatus.textContent = error.message === 'forbidden' ? 'No tienes permiso para editar esta publicación.' : 'No se pudo cargar la publicación.';
        composerPage.dataset.permissionLocked = '1';
        setEditorEnabled(postEditor, false);
        $('forumComposeSubmit').disabled = true;
      }
    }
    document.title = `${isEdit ? 'Editar' : 'Publicar'} · ${categoryData[category].title} · Foro`;
    requestAnimationFrame(() => (isEdit ? titleInput : titleInput)?.focus());
  }

  function initRoute() {
    const parts = routeParts();
    if (!parts.length) return showHomeRoute();
    if (parts.length === 1 && parts[0].toLowerCase() === 'publicar') return showNotFound('HOME no admite publicaciones directas.');
    if (parts.length === 1 && validIdRe.test(parts[0])) return showThreadRoute('home', parts[0]);
    if (parts.length === 2 && validIdRe.test(parts[0]) && parts[1].toLowerCase() === 'editar') return showComposerRoute('home', parts[0]);
    const category = String(parts[0] || '').toLowerCase();
    if (parts.length === 1) return showCategoryRoute(category);
    if (parts.length === 2 && parts[1].toLowerCase() === 'publicar') return showComposerRoute(category);
    if (parts.length === 2) return showThreadRoute(category, parts[1]);
    if (parts.length === 3 && parts[2].toLowerCase() === 'editar') return showComposerRoute(category, parts[1]);
    return showNotFound('La dirección del foro no es válida.');
  }

  // ---------- Editor visual ----------
  function rgbToHex(color) {
    const value = String(color || '').trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
    const match = value.match(/rgba?\((\d+)\D+(\d+)\D+(\d+)/i);
    if (!match) return '';
    return `#${[match[1], match[2], match[3]].map((x) => Math.max(0, Math.min(255, Number(x))).toString(16).padStart(2, '0')).join('')}`;
  }

  function colorForNode(node) {
    if (!(node instanceof HTMLElement)) return '';
    if (node.tagName === 'FONT' && node.getAttribute('color')) return rgbToHex(node.getAttribute('color'));
    const inline = rgbToHex(node.style?.color || '');
    return inline;
  }

  function serializeImageFigure(figure) {
    const source = String(figure.dataset.source || figure.querySelector('img')?.src || '');
    const width = Math.max(20, Math.min(100, Number(figure.dataset.width || 70)));
    const align = ['left', 'center', 'right'].includes(figure.dataset.align) ? figure.dataset.align : 'center';
    const alt = String(figure.dataset.alt || figure.querySelector('img')?.alt || 'Imagen adjunta').replace(/["\n\r]/g, "'").slice(0, 120);
    if (!/^data:image\/(?:png|jpeg|webp);base64,/i.test(source)) return '';
    return `[img width=${width} align=${align} alt="${alt}"]${source}[/img]`;
  }

  function serializeSourceNode(node, inheritedColor = '') {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = String(node.nodeValue || '').replace(/\u00a0/g, ' ');
      if (!inheritedColor || !text) return text;
      return text.split('\n').map((part) => part ? `[fg=${inheritedColor}]${part}[/fg]` : '').join('\n');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node;
    if (el.matches('figure[data-forum-image]')) return `\n${serializeImageFigure(el)}\n`;
    if (el.tagName === 'BR') return '\n';
    let effectiveColor = inheritedColor;
    if (el.dataset?.forumColorReset === '1') effectiveColor = '';
    else {
      const ownColor = String(el.dataset?.forumColor || colorForNode(el) || '').toLowerCase();
      if (/^#[0-9a-f]{6}$/.test(ownColor)) effectiveColor = ownColor;
    }
    let inner = Array.from(el.childNodes).map((child) => serializeSourceNode(child, effectiveColor)).join('');
    if ((el.tagName === 'DIV' || el.tagName === 'P') && !inner.endsWith('\n')) inner += '\n';
    return inner;
  }

  function serializeEditor(editor) {
    if (!editor) return '';
    return normalizeColorMarkup(Array.from(editor.childNodes).map((node) => serializeSourceNode(node, '')).join(''))
      .replace(/\u200b/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();
  }

  function appendSourceText(parent, value) {
    const text = normalizeColorMarkup(String(value || ''));
    const tagRe = /\[fg=(#[0-9a-f]{6})\]|\[\/fg\]/gi;
    const stack = [parent];
    let cursor = 0;
    let match;
    while ((match = tagRe.exec(text))) {
      if (match.index > cursor) stack[stack.length - 1].appendChild(document.createTextNode(text.slice(cursor, match.index)));
      if (match[1]) {
        const span = document.createElement('span');
        span.dataset.forumColor = String(match[1]).toLowerCase();
        span.style.color = String(match[1]).toLowerCase();
        stack[stack.length - 1].appendChild(span);
        stack.push(span);
      } else if (stack.length > 1) stack.pop();
      cursor = tagRe.lastIndex;
    }
    if (cursor < text.length) stack[stack.length - 1].appendChild(document.createTextNode(text.slice(cursor)));
  }

  function loadMarkupIntoEditor(editor, markup) {
    if (!editor) return;
    editor.innerHTML = '';
    const text = String(markup || '');
    let cursor = 0;
    let match;
    imageTokenRe.lastIndex = 0;
    while ((match = imageTokenRe.exec(text))) {
      if (match.index > cursor) appendSourceText(editor, text.slice(cursor, match.index));
      editor.appendChild(buildImageFigure(match[4], { width: Number(match[1]) || 70, align: match[2], alt: match[3] || 'Imagen adjunta' }));
      cursor = imageTokenRe.lastIndex;
    }
    if (cursor < text.length) appendSourceText(editor, text.slice(cursor));
  }

  function clearEditor(editor) {
    if (editor) editor.innerHTML = '';
  }

  function editorName(editor) {
    return editor === replyEditor ? 'reply' : 'post';
  }

  function stateForEditor(editor) {
    return editorState[editorName(editor)];
  }

  function selectionInside(editor) {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    return editor && (editor === range.commonAncestorContainer || editor.contains(range.commonAncestorContainer)) ? range : null;
  }

  function saveSelection(editor) {
    const range = selectionInside(editor);
    if (range) stateForEditor(editor).lastRange = range.cloneRange();
  }

  function restoreSelection(editor) {
    const state = stateForEditor(editor);
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    if (state.lastRange && document.contains(state.lastRange.commonAncestorContainer)) selection.addRange(state.lastRange);
    else {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.addRange(range);
    }
  }

  function insertText(editor, text) {
    restoreSelection(editor);
    editor.focus({ preventScroll: true });
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    saveSelection(editor);
  }

  function sanitizeUrlInput(input) {
    let url = String(input || '').trim();
    if (!url) return '';
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    return /^https:\/\//i.test(url) ? url : '';
  }

  function replaceRangeWithText(editor, text, { selectInnerStart = null, selectInnerEnd = null, resetColor = false } = {}) {
    restoreSelection(editor);
    editor.focus({ preventScroll: true });
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    let inserted = textNode;
    if (resetColor) {
      const span = document.createElement('span');
      span.dataset.forumColorReset = '1';
      span.className = 'forum-color-reset';
      span.appendChild(textNode);
      inserted = span;
    }
    range.insertNode(inserted);
    const next = document.createRange();
    if (Number.isInteger(selectInnerStart) && Number.isInteger(selectInnerEnd)) {
      next.setStart(textNode, Math.max(0, Math.min(text.length, selectInnerStart)));
      next.setEnd(textNode, Math.max(0, Math.min(text.length, selectInnerEnd)));
    } else {
      next.setStartAfter(inserted);
      next.collapse(true);
    }
    selection.removeAllRanges();
    selection.addRange(next);
    saveSelection(editor);
  }

  function wrapSelectionWithSyntax(editor, prefix, suffix = prefix) {
    restoreSelection(editor);
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const selected = selection.toString();
    const text = `${prefix}${selected}${suffix}`;
    if (selected) replaceRangeWithText(editor, text, { selectInnerStart: prefix.length, selectInnerEnd: prefix.length + selected.length });
    else replaceRangeWithText(editor, text, { selectInnerStart: prefix.length, selectInnerEnd: prefix.length });
  }

  function prefixSelectedLines(editor, prefix, ordered = false) {
    restoreSelection(editor);
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const selected = selection.toString();
    if (!selected) { replaceRangeWithText(editor, ordered ? '1. ' : prefix); return; }
    const lines = selected.split(/\r?\n/).map((line, index) => `${ordered ? `${index + 1}. ` : prefix}${line}`);
    replaceRangeWithText(editor, lines.join('\n'));
  }

  function stripSourceFormatting(value) {
    return stripColorMarkup(String(value || ''))
      .replace(/\[color=[^\]]+\]|\[\/color\]|\[u\]|\[\/u\]/gi, '')
      .replace(/\[([^\]\n]+)\]\(https:\/\/[^)\s]+\)/g, '$1')
      .replace(/`([^`\n]+)`/g, '$1')
      .replace(/\*\*([^*\n]+)\*\*/g, '$1')
      .replace(/__([^_\n]+)__/g, '$1')
      .replace(/~~([^~\n]+)~~/g, '$1')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2')
      .replace(/^#{1,2}\s+/gm, '')
      .replace(/^>\s?/gm, '')
      .replace(/^[-*]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '');
  }

  function clearSelectedFormatting(editor) {
    restoreSelection(editor);
    const selection = window.getSelection();
    if (!selection?.rangeCount || selection.isCollapsed) {
      showForumToast('Selecciona el texto cuyo formato quieres limpiar.', 'info');
      return;
    }
    replaceRangeWithText(editor, stripSourceFormatting(selection.toString()), { resetColor: true });
  }

  function applyColorToSavedSelection(name, color) {
    const state = editorState[name];
    const editor = state.editor;
    const hex = rgbToHex(color);
    if (!editor || !hex || !state.lastRange || !document.contains(state.lastRange.commonAncestorContainer)) return;
    const selection = window.getSelection();
    const range = state.lastRange.cloneRange();
    if (range.collapsed || !editor.contains(range.commonAncestorContainer)) {
      showForumToast('Selecciona primero el texto que quieres colorear.', 'info');
      return;
    }
    const selected = range.toString();
    if (!selected) return;
    range.deleteContents();
    const span = document.createElement('span');
    span.dataset.forumColor = hex;
    span.style.color = hex;
    span.textContent = selected;
    range.insertNode(span);
    const next = document.createRange();
    next.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(next);
    state.lastRange = next.cloneRange();
    editor.focus({ preventScroll: true });
  }

  async function execEditorCommand(name, command, value = '') {
    const state = editorState[name];
    const editor = state.editor;
    if (!editor || editor.getAttribute('contenteditable') !== 'true') return;
    if (command === 'mention') {
      editor.focus();
      restoreSelection(editor);
      insertText(editor, '@');
      queueMentionSuggestions(editor, true);
      return;
    }
    if (command === 'image') {
      saveSelection(editor);
      state.file?.click();
      return;
    }
    if (command === 'createLink') {
      saveSelection(editor);
      const saved = state.lastRange && document.contains(state.lastRange.commonAncestorContainer) ? state.lastRange.cloneRange() : null;
      const selectedText = saved && !saved.collapsed ? saved.toString() : '';
      const result = await forumDialog({
        title: 'INSERTAR ENLACE',
        message: 'Define el texto visible y la dirección. El foro guardará el formato [texto](https://destino).',
        confirmText: 'INSERTAR',
        link: true,
        linkText: selectedText,
        linkUrl: ''
      });
      if (result == null) return;
      const url = sanitizeUrlInput(result.url);
      if (!url) { showForumToast('El enlace debe usar HTTPS y ser válido.', 'error'); return; }
      const label = String(result.label || selectedText || url).replace(/[\]\r\n]/g, ' ').trim() || url;
      state.lastRange = saved || state.lastRange;
      restoreSelection(editor);
      const markup = `[${label}](${url})`;
      replaceRangeWithText(editor, markup, { selectInnerStart: 1, selectInnerEnd: 1 + label.length });
      return;
    }
    if (command === 'bold') wrapSelectionWithSyntax(editor, '**');
    else if (command === 'italic') wrapSelectionWithSyntax(editor, '*');
    else if (command === 'underline') wrapSelectionWithSyntax(editor, '__');
    else if (command === 'strikeThrough') wrapSelectionWithSyntax(editor, '~~');
    else if (command === 'formatBlock' && value === 'h2') prefixSelectedLines(editor, '# ');
    else if (command === 'formatBlock' && value === 'h3') prefixSelectedLines(editor, '## ');
    else if (command === 'formatBlock' && value === 'blockquote') prefixSelectedLines(editor, '> ');
    else if (command === 'insertUnorderedList') prefixSelectedLines(editor, '- ');
    else if (command === 'insertOrderedList') prefixSelectedLines(editor, '', true);
    else if (command === 'removeFormat') clearSelectedFormatting(editor);
    else if (command === 'undo' || command === 'redo') {
      editor.focus();
      document.execCommand(command, false, null);
      saveSelection(editor);
    }
  }

  function directRangeText(editor, range, text, { selectStart = null, selectEnd = null } = {}) {
    if (!editor || !range) return;
    const selection = window.getSelection();
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    const next = document.createRange();
    if (Number.isInteger(selectStart) && Number.isInteger(selectEnd)) {
      next.setStart(node, Math.max(0, Math.min(text.length, selectStart)));
      next.setEnd(node, Math.max(0, Math.min(text.length, selectEnd)));
    } else {
      next.setStartAfter(node);
      next.collapse(true);
    }
    selection?.removeAllRanges();
    selection?.addRange(next);
    stateForEditor(editor).lastRange = next.cloneRange();
  }

  function textLineAtCaret(editor) {
    const range = selectionInside(editor);
    if (!range || !range.collapsed || range.startContainer.nodeType !== Node.TEXT_NODE) return null;
    const node = range.startContainer;
    const value = String(node.nodeValue || '');
    const offset = range.startOffset;
    const lineStart = offset > 0 ? value.lastIndexOf('\n', offset - 1) + 1 : 0;
    const nextBreak = value.indexOf('\n', offset);
    const lineEnd = nextBreak < 0 ? value.length : nextBreak;
    return {
      range,
      node,
      offset,
      lineStart,
      lineEnd,
      before: value.slice(lineStart, offset),
      after: value.slice(offset, lineEnd)
    };
  }

  function handleEditorListKeydown(editor, event) {
    if (!editor || editor.getAttribute('contenteditable') !== 'true' || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== 'Enter' && event.key !== 'Backspace') return;
    const info = textLineAtCaret(editor);
    if (!info) {
      if (event.key === 'Enter') {
        const range = selectionInside(editor);
        if (range) { event.preventDefault(); directRangeText(editor, range, '\n'); }
      }
      return;
    }

    const bullet = info.before.match(/^(\s*)([-*])\s+(.*)$/);
    const ordered = info.before.match(/^(\s*)(\d+)\.\s+(.*)$/);

    if (event.key === 'Backspace') {
      const emptyBulletPrefix = info.before.match(/^(\s*[-*]\s+)$/);
      const emptyOrderedPrefix = info.before.match(/^(\s*\d+\.\s+)$/);
      const prefix = emptyOrderedPrefix?.[0] || emptyBulletPrefix?.[0] || '';
      if (!prefix) return;
      event.preventDefault();
      const remove = document.createRange();
      remove.setStart(info.node, info.lineStart);
      remove.setEnd(info.node, info.offset);
      directRangeText(editor, remove, '');
      return;
    }

    event.preventDefault();
    if (!info.range.collapsed) { directRangeText(editor, info.range, '\n'); return; }

    if (ordered) {
      const bodyBefore = ordered[3] || '';
      const lineBody = `${bodyBefore}${info.after}`.trim();
      if (!lineBody) {
        const remove = document.createRange();
        remove.setStart(info.node, info.lineStart);
        remove.setEnd(info.node, info.offset);
        directRangeText(editor, remove, '');
        return;
      }
      const nextNumber = Math.max(1, Number(ordered[2]) + 1);
      directRangeText(editor, info.range, `\n${ordered[1]}${nextNumber}. `);
      return;
    }

    if (bullet) {
      const bodyBefore = bullet[3] || '';
      const lineBody = `${bodyBefore}${info.after}`.trim();
      if (!lineBody) {
        const remove = document.createRange();
        remove.setStart(info.node, info.lineStart);
        remove.setEnd(info.node, info.offset);
        directRangeText(editor, remove, '');
        return;
      }
      directRangeText(editor, info.range, `\n${bullet[1]}- `);
      return;
    }

    directRangeText(editor, info.range, '\n');
  }

  function setupToolbar(name) {
    const state = editorState[name];
    if (!state.toolbar || !state.editor) return;
    state.toolbar.addEventListener('mousedown', (event) => {
      if (event.target.closest('button')) event.preventDefault();
      if (event.target.closest('.forum-color-control')) saveSelection(state.editor);
    });
    state.toolbar.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-command]');
      if (!button) return;
      execEditorCommand(name, button.dataset.command, button.dataset.value || '');
    });
    const color = name === 'post' ? $('forumPostColor') : $('forumReplyColor');
    color?.addEventListener('pointerdown', () => saveSelection(state.editor));
    color?.addEventListener('change', () => applyColorToSavedSelection(name, color.value));
    ['keyup', 'mouseup', 'focus', 'touchend'].forEach((eventName) => state.editor.addEventListener(eventName, () => saveSelection(state.editor)));
    state.editor.addEventListener('input', () => {
      saveSelection(state.editor);
      queueMentionSuggestions(state.editor);
    });
    state.editor.addEventListener('keydown', (event) => handleEditorListKeydown(state.editor, event));
    state.editor.addEventListener('paste', (event) => {
      const hasImage = Array.from(event.clipboardData?.files || []).some((file) => /^image\//i.test(file.type));
      if (hasImage) return;
      const text = event.clipboardData?.getData('text/plain');
      if (text == null) return;
      event.preventDefault();
      saveSelection(state.editor);
      const selected = state.lastRange && !state.lastRange.collapsed ? state.lastRange.toString() : '';
      const trimmed = String(text).trim();
      const pastedUrl = /^https:\/\/[^\s]+$/i.test(trimmed) ? sanitizeUrlInput(trimmed) : '';
      if (selected && pastedUrl) {
        const label = selected.replace(/[\]\r\n]/g, ' ').trim();
        const markup = `[${label}](${pastedUrl})`;
        replaceRangeWithText(state.editor, markup, { selectInnerStart: 1, selectInnerEnd: 1 + label.length });
        showForumToast('Enlace aplicado sin borrar el texto seleccionado.', 'success');
        return;
      }
      insertText(state.editor, text);
    });
    state.editor.addEventListener('click', (event) => {
      const figure = event.target.closest('figure[data-forum-image]');
      if (figure) selectEditorImage(name, figure);
      else hideImageTools(name);
    });
  }

  document.addEventListener('selectionchange', () => {
    for (const state of Object.values(editorState)) {
      if (state.editor && selectionInside(state.editor)) saveSelection(state.editor);
    }
  });

  async function decodeForumImage(file) {
    if (typeof window.createImageBitmap === 'function') {
      try {
        const bitmap = await window.createImageBitmap(file);
        return { drawable: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close?.() };
      } catch (_) {}
    }
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const candidate = new Image();
        candidate.onload = () => resolve(candidate);
        candidate.onerror = () => reject(new Error('No pude leer la imagen seleccionada.'));
        candidate.src = objectUrl;
      });
      return { drawable: image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(objectUrl) };
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
  }

  async function compressInlineImage(file) {
    if (!file || !/^image\/(png|jpeg|webp)$/i.test(file.type)) throw new Error('Usa PNG, JPG o WEBP.');
    if (file.size > 10 * 1024 * 1024) throw new Error('La imagen supera 10 MB.');
    const source = await decodeForumImage(file);
    let max = 1500;
    let quality = 0.8;
    let data = '';
    try {
      for (let attempt = 0; attempt < 7; attempt += 1) {
        const ratio = Math.min(1, max / Math.max(source.width, source.height));
        const width = Math.max(1, Math.round(source.width * ratio));
        const height = Math.max(1, Math.round(source.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('Tu navegador no permite procesar esta imagen.');
        ctx.fillStyle = '#0a0908';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(source.drawable, 0, 0, width, height);
        data = canvas.toDataURL('image/webp', quality);
        if (!data.startsWith('data:image/webp')) throw new Error('Tu navegador no permite convertir imágenes a WEBP.');
        if (data.length <= 330000) break;
        quality = Math.max(0.48, quality - 0.07);
        max = Math.round(max * 0.84);
      }
    } finally {
      source.close?.();
    }
    if (data.length > 350000) throw new Error('No pude reducir la imagen lo suficiente.');
    return data;
  }

  function buildImageFigure(data, { width = 70, align = 'center', alt = 'Imagen adjunta' } = {}) {
    const figure = document.createElement('figure');
    figure.className = `forum-inline-image forum-inline-image--${align} forum-editor-image`;
    figure.contentEditable = 'false';
    figure.tabIndex = 0;
    figure.dataset.forumImage = '1';
    figure.dataset.source = data;
    figure.dataset.width = String(width);
    figure.dataset.align = align;
    figure.dataset.alt = alt;
    figure.style.setProperty('--forum-image-width', `${width}%`);
    const img = document.createElement('img');
    img.src = data;
    img.alt = alt;
    const hint = document.createElement('span');
    hint.className = 'forum-editor-image__hint';
    hint.textContent = 'CLIC PARA AJUSTAR';
    figure.append(img, hint);
    return figure;
  }

  function insertImageAtSelection(name, data) {
    const state = editorState[name];
    const editor = state.editor;
    if (!editor) return;
    restoreSelection(editor);
    editor.focus({ preventScroll: true });
    const selection = window.getSelection();
    const figure = buildImageFigure(data);
    if (selection?.rangeCount) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(figure);
      const spacer = document.createElement('p');
      spacer.innerHTML = '<br>';
      figure.after(spacer);
      range.setStart(spacer, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else editor.append(figure);
    selectEditorImage(name, figure);
    saveSelection(editor);
  }

  function hideImageTools(name) {
    const state = editorState[name];
    if (state.tools) state.tools.hidden = true;
    state.selectedImage?.classList.remove('is-selected');
    state.selectedImage = null;
  }

  function selectEditorImage(name, figure) {
    const state = editorState[name];
    if (!state.tools || !figure) return;
    state.selectedImage?.classList.remove('is-selected');
    state.selectedImage = figure;
    figure.classList.add('is-selected');
    state.tools.hidden = false;
    const slider = state.tools.querySelector('[data-image-width]');
    const label = state.tools.querySelector('[data-image-width-value]');
    const width = Number(figure.dataset.width || 70);
    if (slider) slider.value = String(width);
    if (label) label.textContent = `${width}%`;
    state.tools.querySelectorAll('[data-image-align]').forEach((button) => button.classList.toggle('is-active', button.dataset.imageAlign === figure.dataset.align));
  }

  function setupImageTools(name) {
    const state = editorState[name];
    const insertFile = async (file) => {
      if (!file) return;
      try {
        const data = await compressInlineImage(file);
        insertImageAtSelection(name, data);
      } catch (error) {
        showForumToast(error.message || 'No se pudo procesar la imagen.', 'error');
      }
    };
    state.file?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      await insertFile(file);
    });
    state.editor?.addEventListener('paste', async (event) => {
      const image = Array.from(event.clipboardData?.files || []).find((file) => /^image\//i.test(file.type));
      if (!image) return;
      event.preventDefault();
      saveSelection(state.editor);
      await insertFile(image);
    });
    state.editor?.addEventListener('dragover', (event) => {
      if (Array.from(event.dataTransfer?.items || []).some((item) => item.kind === 'file' && /^image\//i.test(item.type))) {
        event.preventDefault();
        state.editor.classList.add('is-image-dragover');
      }
    });
    state.editor?.addEventListener('dragleave', () => state.editor.classList.remove('is-image-dragover'));
    state.editor?.addEventListener('drop', async (event) => {
      state.editor.classList.remove('is-image-dragover');
      const image = Array.from(event.dataTransfer?.files || []).find((file) => /^image\//i.test(file.type));
      if (!image) return;
      event.preventDefault();
      state.editor.focus();
      const selection = window.getSelection();
      let range = document.caretRangeFromPoint?.(event.clientX, event.clientY) || null;
      if (!range && document.caretPositionFromPoint) {
        const position = document.caretPositionFromPoint(event.clientX, event.clientY);
        if (position) {
          range = document.createRange();
          range.setStart(position.offsetNode, position.offset);
          range.collapse(true);
        }
      }
      if (selection && range && state.editor.contains(range.startContainer)) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      saveSelection(state.editor);
      await insertFile(image);
    });
    const attach = name === 'post' ? $('forumPostAttach') : $('forumReplyAttach');
    attach?.addEventListener('click', () => { saveSelection(state.editor); state.file?.click(); });
    const slider = state.tools?.querySelector('[data-image-width]');
    slider?.addEventListener('input', () => {
      const figure = state.selectedImage;
      if (!figure) return;
      const width = Math.max(20, Math.min(100, Number(slider.value || 70)));
      figure.dataset.width = String(width);
      figure.style.setProperty('--forum-image-width', `${width}%`);
      const label = state.tools.querySelector('[data-image-width-value]');
      if (label) label.textContent = `${width}%`;
    });
    state.tools?.addEventListener('click', (event) => {
      const figure = state.selectedImage;
      if (!figure) return;
      const alignButton = event.target.closest('[data-image-align]');
      if (alignButton) {
        const align = alignButton.dataset.imageAlign;
        figure.dataset.align = align;
        figure.classList.remove('forum-inline-image--left', 'forum-inline-image--center', 'forum-inline-image--right');
        figure.classList.add(`forum-inline-image--${align}`);
        state.tools.querySelectorAll('[data-image-align]').forEach((button) => button.classList.toggle('is-active', button === alignButton));
      }
      if (event.target.closest('[data-image-remove]')) {
        figure.remove();
        hideImageTools(name);
      }
    });
  }

  function mentionContext(editor) {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) return null;
    const node = selection.anchorNode;
    if (node.nodeType !== Node.TEXT_NODE) return null;
    const offset = selection.anchorOffset;
    const before = String(node.nodeValue || '').slice(0, offset);
    const match = before.match(/@([A-Za-z0-9_.]{1,32})$/);
    if (!match) return null;
    return { node, start: offset - match[0].length, end: offset, query: match[1] };
  }

  function queueMentionSuggestions(editor, force = false) {
    clearTimeout(mentionTimer);
    const state = stateForEditor(editor);
    const context = mentionContext(editor);
    if (!context || (!force && context.query.length < 2)) { if (state.mention) state.mention.hidden = true; return; }
    mentionTimer = setTimeout(() => loadMentionSuggestions(editor, context), 170);
  }

  async function loadMentionSuggestions(editor, context) {
    const state = stateForEditor(editor);
    if (!state.mention) return;
    try {
      const response = await fetchWithTimeout(`/api/forum/users?search=${encodeURIComponent(context.query)}`, { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok || !data.users?.length) { state.mention.hidden = true; return; }
      state.mention.innerHTML = data.users.slice(0, 7).map((user) => `<button type="button" data-mention-user="${escapeHtml(user.discord_username)}"><img src="${escapeHtml(avatarUrl({ ...user, discord_user_id: user.id }))}" alt=""><span><b>${escapeHtml(user.display_name || user.discord_username)}</b><small>@${escapeHtml(user.discord_username)} · ${escapeHtml(user.user_rank || 'MIEMBRO')}</small></span></button>`).join('');
      state.mention.hidden = false;
      state.mention.onclick = (event) => {
        const button = event.target.closest('[data-mention-user]');
        if (!button) return;
        const fresh = mentionContext(editor);
        if (!fresh) return;
        const range = document.createRange();
        range.setStart(fresh.node, fresh.start);
        range.setEnd(fresh.node, fresh.end);
        range.deleteContents();
        const node = document.createTextNode(`@${button.dataset.mentionUser} `);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        state.mention.hidden = true;
        saveSelection(editor);
        editor.focus();
      };
    } catch { state.mention.hidden = true; }
  }

  setupToolbar('post');
  setupToolbar('reply');
  setupImageTools('post');
  setupImageTools('reply');

  $('forumComposePreviewButton')?.addEventListener('click', () => {
    const content = serializeEditor(postEditor);
    composePreview.innerHTML = content ? renderRichText(content) : '<p>Escribe contenido para generar la vista previa.</p>';
    composePreviewPanel.hidden = false;
    composePreviewPanel.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
  });
  $('forumComposePreviewClose')?.addEventListener('click', () => { composePreviewPanel.hidden = true; });

  composeForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!authenticated) { composeStatus.textContent = 'Conecta Discord para publicar.'; return; }
    const title = titleInput?.value.trim();
    const content = serializeEditor(postEditor);
    const category = categoryInput?.value || activeCategory;
    const type = typeInput?.value || 'discussion';
    if (!title || !content || !categoryData[category]) return;
    const submit = $('forumComposeSubmit');
    submit.disabled = true;
    composeStatus.textContent = editingPostId ? 'Guardando cambios...' : 'Publicando tema...';
    try {
      const endpoint = editingPostId ? `/api/forum/thread/${encodeURIComponent(editingPostId)}` : '/api/forum/posts';
      const response = await fetchWithTimeout(endpoint, { method: editingPostId ? 'PUT' : 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ category, title, content, type }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'publish_failed');
      const postId = editingPostId || data.postId;
      const finalCategory = editingPostId ? (currentThread?.category || category) : (data.category || category);
      navigateForum(data.url || (finalCategory === 'home' ? `/foro/${postId}` : `/foro/${finalCategory}/${postId}`), { replace: true });
    } catch (error) {
      const messages = { forum_role_required: 'No tienes permiso para crear publicaciones en esta sección.', guild_membership_required: 'Debes pertenecer al servidor de Discord de ARKA WOOD para publicar aquí.', invalid_type_for_category: 'El tipo seleccionado no pertenece a esta sección.', category_read_only: 'Esta categoría es de solo lectura.', csrf: 'La sesión cambió. Recarga la página.', title_too_short: 'El título debe tener al menos 4 caracteres.', content_too_short: 'El contenido debe tener al menos 10 caracteres.', invalid_forum_content: 'El contenido o alguna imagen supera los límites del foro.', forbidden: 'No tienes permiso para administrar esta publicación.' };
      composeStatus.textContent = messages[error.message] || 'No se pudo guardar la publicación.';
    } finally { submit.disabled = false; }
  });

  // ---------- Respuestas ----------
  function clearReplyContext() {
    replyParentId = '';
    replyQuoteId = '';
    editingReplyId = '';
    $('forumReplyContext').hidden = true;
    $('forumReplyContextType').textContent = 'RESPONDIENDO A';
    replySubmit.textContent = 'RESPONDER';
    updateReplyAvailability();
  }

  $('forumReplyContextClear')?.addEventListener('click', clearReplyContext);

  function setReplyContext(reply) {
    if (!reply) return;
    editingReplyId = '';
    replyParentId = reply.reply_id;
    replyQuoteId = '';
    $('forumReplyContextType').textContent = 'RESPONDIENDO A';
    $('forumReplyContextName').textContent = reply.author_name || 'Usuario';
    $('forumReplyContextText').textContent = plainMarkup(reply.content || '', 180);
    $('forumReplyContext').hidden = false;
    replyEditor.focus();
    if (reply.discord_username && !replyEditor.textContent.includes(`@${reply.discord_username}`)) insertText(replyEditor, `@${reply.discord_username} `);
    updateReplyAvailability();
  }

  function editReply(reply) {
    editingReplyId = reply.reply_id;
    replyParentId = '';
    replyQuoteId = '';
    loadMarkupIntoEditor(replyEditor, reply.content || '');
    $('forumReplyContextType').textContent = 'EDITANDO COMENTARIO';
    $('forumReplyContextName').textContent = `ID ${reply.reply_id}`;
    $('forumReplyContextText').textContent = 'Guarda los cambios o pulsa × para cancelar.';
    $('forumReplyContext').hidden = false;
    replySubmit.textContent = 'GUARDAR RESPUESTA';
    replyEditor.focus();
    updateReplyAvailability();
  }

  async function showShareLink(title, url) {
    const result = await forumDialog({
      title,
      message: 'Este es el enlace directo. Puedes revisarlo antes de copiarlo.',
      confirmText: 'COPIAR ENLACE',
      cancelText: 'CERRAR',
      input: true,
      inputValue: url,
      inputLabel: 'ENLACE PARA COMPARTIR',
      inputReadonly: true
    });
    if (result == null) return;
    try {
      await navigator.clipboard.writeText(url);
      showForumToast('Enlace copiado al portapapeles.', 'success');
    } catch {
      await forumDialog({ title, message: 'No se pudo acceder al portapapeles automáticamente. Selecciona y copia el enlace manualmente.', confirmText: 'CERRAR', cancelable: false, input: true, inputValue: url, inputLabel: 'ENLACE PARA COMPARTIR' });
    }
  }

  threadReplies?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-reply-action]');
    if (!button) return;
    const reply = currentReplies.find((item) => String(item.reply_id) === String(button.dataset.replyId));
    if (!reply) return;
    const action = button.dataset.replyAction;
    if (action === 'reply') setReplyContext(reply);
    else if (action === 'share') {
      const url = `${location.origin}${location.pathname}#respuesta-${reply.reply_id}`;
      await showShareLink('COMPARTIR RESPUESTA', url);
    } else if (action === 'edit') editReply(reply);
    else if (action === 'delete') {
      const confirmed = await forumDialog({ title: 'ELIMINAR RESPUESTA', message: '¿Quieres eliminar definitivamente este comentario?', confirmText: 'ELIMINAR', danger: true });
      if (!confirmed) return;
      button.disabled = true;
      try {
        const response = await fetchWithTimeout(`/api/forum/reply/${encodeURIComponent(reply.reply_id)}`, { method: 'DELETE', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrfToken } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error();
        await showThreadRoute(activeCategory, activeThreadId);
      } catch { showForumToast('No se pudo eliminar el comentario.', 'error'); button.disabled = false; }
    }
  });

  replyForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!authenticated || !activeThreadId || currentThread?.is_locked) return;
    const content = serializeEditor(replyEditor);
    if (!content) return;
    const wasEditing = Boolean(editingReplyId);
    const editedReplyId = editingReplyId;
    replySubmit.disabled = true;
    replyHint.textContent = wasEditing ? 'Guardando comentario...' : 'Publicando respuesta...';
    try {
      const endpoint = wasEditing ? `/api/forum/reply/${encodeURIComponent(editedReplyId)}` : `/api/forum/thread/${encodeURIComponent(activeThreadId)}`;
      const response = await fetchWithTimeout(endpoint, { method: wasEditing ? 'PUT' : 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ content, tone: 'neutral', parentReplyId: replyParentId || null }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'reply_failed');
      const hash = wasEditing ? `#respuesta-${editedReplyId}` : `#respuesta-${data.replyId}`;
      clearEditor(replyEditor);
      clearReplyContext();
      history.replaceState(history.state, '', `${location.pathname}${hash}`);
      await showThreadRoute(activeCategory, activeThreadId);
      replyHint.textContent = wasEditing ? 'Comentario actualizado.' : 'Respuesta publicada.';
    } catch (error) {
      const messages = { thread_locked: 'Este tema está cerrado.', csrf: 'La sesión cambió. Recarga la página.', invalid_forum_content: 'La respuesta o alguna imagen supera los límites.', forbidden: 'No tienes permiso para modificar este comentario.' };
      replyHint.textContent = messages[error.message] || 'No se pudo guardar la respuesta.';
    } finally { updateReplyAvailability(); }
  });

  threadContent?.addEventListener('click', async (event) => {
    if (event.target.closest('[data-share-thread]') && currentThread) {
      const url = `${location.origin}${threadUrl(currentThread)}`;
      await showShareLink('COMPARTIR PUBLICACIÓN', url);
      return;
    }
    if (event.target.closest('[data-thread-edit]') && currentThreadPermissions.canManage && currentThread) { navigateForum(editThreadUrl(currentThread)); return; }
    if (event.target.closest('[data-thread-delete]') && currentThreadPermissions.canDelete && currentThread) {
      const confirmed = await forumDialog({ title: 'ELIMINAR PUBLICACIÓN', message: 'Esta acción eliminará la publicación y todas sus respuestas. No se puede deshacer.', confirmText: 'ELIMINAR', danger: true });
      if (!confirmed) return;
      const button = event.target.closest('[data-thread-delete]');
      button.disabled = true;
      try {
        const response = await fetchWithTimeout(`/api/forum/thread/${encodeURIComponent(currentThread.post_id)}`, { method: 'DELETE', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrfToken } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error();
        navigateForum(categoryUrl(currentThread.category));
      } catch { showForumToast('No se pudo eliminar la publicación.', 'error'); button.disabled = false; }
      return;
    }
    const actionButton = event.target.closest('[data-thread-action]');
    if (actionButton && currentThread) {
      actionButton.disabled = true;
      try {
        const response = await fetchWithTimeout(`/api/forum/thread/${encodeURIComponent(currentThread.post_id)}`, { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ action: actionButton.dataset.threadAction }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error();
        await showThreadRoute(activeCategory, activeThreadId);
      } catch { showForumToast('No se pudo aplicar la acción de moderación.', 'error'); actionButton.disabled = false; }
    }
  });

  categoryPublish?.addEventListener('click', () => {
    if (canPublishCategory(activeCategory)) navigateForum(publishUrl(activeCategory));
  });
  searchInput?.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => loadPublications(), 250); });
  typeFilter?.addEventListener('change', () => loadPublications());
  sortFilter?.addEventListener('change', () => loadPublications());

  // ---------- Búsqueda global ----------
  $('forumGlobalSearchButton')?.addEventListener('click', () => { searchDialog?.showModal(); setTimeout(() => $('forumGlobalSearchInput')?.focus(), 40); });
  $('forumSearchClose')?.addEventListener('click', () => searchDialog?.close());
  $('forumSearchModes')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-search-mode]');
    if (!button) return;
    searchMode = button.dataset.searchMode === 'users' ? 'users' : 'posts';
    $('forumSearchModes').querySelectorAll('[data-search-mode]').forEach((item) => item.classList.toggle('is-active', item === button));
    const input = $('forumGlobalSearchInput');
    input.placeholder = searchMode === 'users' ? 'Nombre de Discord, usuario o Minecraft...' : 'Título, contenido o palabras clave...';
    runGlobalSearch(input.value.trim());
  });
  $('forumGlobalSearchInput')?.addEventListener('input', (event) => { clearTimeout(globalSearchTimer); globalSearchTimer = setTimeout(() => runGlobalSearch(event.target.value.trim()), 220); });

  async function runGlobalSearch(query) {
    const root = $('forumGlobalSearchResults');
    if (query.length < 2) { root.innerHTML = `<div class="forum-publication-empty"><span>Escribe al menos dos caracteres para buscar ${searchMode === 'users' ? 'usuarios' : 'publicaciones'}.</span></div>`; return; }
    root.innerHTML = '<div class="forum-publication-empty"><span>Buscando...</span></div>';
    try {
      if (searchMode === 'users') {
        const response = await fetchWithTimeout(`/api/forum/users?search=${encodeURIComponent(query)}`, { credentials: 'same-origin', cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || 'search_failed');
        if (!data.users?.length) { root.innerHTML = '<div class="forum-publication-empty"><b>SIN RESULTADOS</b><span>No encontramos usuarios con ese nombre.</span></div>'; return; }
        root.innerHTML = data.users.map((user) => `<a class="forum-user-result" href="${profileUrl(user.id)}"><img src="${escapeHtml(avatarUrl({ ...user, discord_user_id: user.id }))}" alt=""><span><b>${escapeHtml(user.display_name || user.discord_username)}</b><small>@${escapeHtml(user.discord_username)}</small>${roleBadges(user, user.user_rank || 'MIEMBRO', true)}<em>${user.minecraft_username ? `Minecraft: ${escapeHtml(user.minecraft_username)}` : 'Minecraft sin configurar'}</em></span></a>`).join('');
        return;
      }
      const params = new URLSearchParams({ all: '1', search: query, sort: 'latest', limit: '40' });
      const response = await fetchWithTimeout(`/api/forum/posts?${params}`, { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'search_failed');
      if (!data.posts?.length) { root.innerHTML = '<div class="forum-publication-empty"><b>SIN RESULTADOS</b><span>No encontramos publicaciones con esas palabras.</span></div>'; return; }
      root.innerHTML = data.posts.map((post) => `<a class="forum-search-result" href="${threadUrl(post)}"><img src="${escapeHtml(avatarUrl(post))}" alt=""><span><small>${escapeHtml(categoryData[post.category]?.title || post.category)} · ${escapeHtml(typeLabels[post.post_type] || 'DISCUSIÓN')}</small><b>${escapeHtml(post.title)}</b><em>${escapeHtml(post.author_name)} · ${escapeHtml(post.user_rank || 'MIEMBRO')} · ${Number(post.reply_count || 0)} respuestas</em></span></a>`).join('');
    } catch (error) { root.innerHTML = `<div class="forum-publication-empty"><b>ERROR DE BÚSQUEDA</b><span>${escapeHtml(error.message)}</span></div>`; }
  }

  // ---------- Donadores y sesión ----------
  const revealItems = Array.from(document.querySelectorAll('.forum-reveal'));
  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), { threshold: 0.07 });
    revealItems.forEach((item) => observer.observe(item));
  } else revealItems.forEach((item) => item.classList.add('is-visible'));

  const topDonorSlots = $('forumTopDonorSlots');
  const donorSlots = $('forumDonorSlots');
  const donorBoard = $('forumDonorBoard');
  let donorData = [];
  let topDonors = [];
  let regularDonors = [];
  let donorOffset = 0;
  let donorPaused = false;

  function donorAvatar(donor){
    return donor?.avatar ? `<img src="${escapeHtml(donor.avatar)}" alt="Foto de ${escapeHtml(donor.name || 'donador')}" loading="lazy">` : '<span>?</span>';
  }
  function donorProfileHref(donor){
    return donor?.profileUrl || '#';
  }
  function donorHover(donor, topNumber=0){
    const premium = Array.isArray(donor?.premium) && donor.premium.length ? donor.premium.join(' · ') : (donor?.topDonor ? 'TOP DONADOR' : 'DONADOR');
    const mc = donor?.minecraftUsername ? `Minecraft: ${escapeHtml(donor.minecraftUsername)}` : 'Minecraft sin configurar';
    const thanks = topNumber ? `¡Muchas gracias por ser el #${topNumber}!` : '¡Gracias por apoyar a ARKA WOOD!';
    const style = donor?.banner ? ` style="--forum-donor-hover-banner:url('${safeCssUrl(donor.banner)}')"` : '';
    return `<span class="forum-donor-hover"${style}><i class="forum-donor-hover__banner"></i><span class="forum-donor-hover__title"><b>${escapeHtml(donor.name || 'Donador')}</b><small>${escapeHtml(premium)}</small></span><strong>${escapeHtml(thanks)}</strong><em>${mc}</em>${donor?.registered?'<u>ABRIR PERFIL</u>':''}</span>`;
  }
  const renderTopDonors = () => {
    if (!topDonorSlots) return;
    if (!topDonors.length) {
      topDonorSlots.innerHTML='<div class="forum-publication-empty"><span>Los TOP DONADORES aparecerán aquí automáticamente.</span></div>';
      return;
    }
    topDonorSlots.innerHTML = topDonors.slice(0,6).map((donor, index) => `<a class="forum-sidebar-top-donor" href="${donorProfileHref(donor)}"${donor.profileUrl?'':' aria-disabled="true"'}>
      <span class="forum-sidebar-top-donor__avatar">${donorAvatar(donor)}</span>
      <div><small>TOP ${donor.top || index + 1}</small><b>${escapeHtml(donor.name || 'Donador')}</b></div>${donorHover(donor, donor.top || index + 1)}
    </a>`).join('');
  };
  const renderDonors = () => {
    if (!donorSlots) return;
    if (!regularDonors.length) {
      donorSlots.innerHTML='<div class="forum-publication-empty"><span>Los donadores sincronizados aparecerán aquí.</span></div>';
      return;
    }
    donorSlots.innerHTML = '';
    const visible = regularDonors.length ? 4 : 0;
    for (let index = 0; index < visible; index += 1) {
      const donor = regularDonors[(donorOffset + index) % regularDonors.length];
      const card = document.createElement(donor.profileUrl ? 'a' : 'article');
      card.className = 'forum-donor-card is-entering';
      if (donor.profileUrl) card.href = donor.profileUrl;
      if (donor.banner) card.style.setProperty('--donor-banner', `url('${safeCssUrl(donor.banner)}')`);
      card.innerHTML = `<div class="forum-donor-card__avatar">${donorAvatar(donor)}</div><b>${escapeHtml(donor.name || 'Donador')}</b>${donorHover(donor)}`;
      donorSlots.appendChild(card);
      requestAnimationFrame(() => card.classList.remove('is-entering'));
    }
  };
  async function loadDonors(){
    try{
      const response=await fetchWithTimeout('/api/community/donors',{credentials:'same-origin',cache:'no-store'});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.ok) throw new Error('donors_unavailable');
      topDonors=Array.isArray(data.top)?data.top:[];
      regularDonors=Array.isArray(data.donors)?data.donors:[];
      donorData=[...topDonors,...regularDonors];
      donorOffset=0;
      renderTopDonors();
      renderDonors();
    }catch{
      topDonors=[];regularDonors=[];renderTopDonors();renderDonors();
    }
  }
  loadDonors();
  setInterval(() => { if (!donorPaused && regularDonors.length > 4) { donorOffset = (donorOffset + 1) % regularDonors.length; renderDonors(); } }, 3800);
  donorBoard?.addEventListener('mouseenter', () => { donorPaused = true; });
  donorBoard?.addEventListener('mouseleave', () => { donorPaused = false; });

  function renderViewerIdentity(target, user) {
    if (!target) return;
    if (!user?.id) { target.innerHTML = '<div class="forum-composer-author__avatar">?</div><b>INICIA SESIÓN</b><small>Discord requerido</small>'; return; }
    const avatar = user.profilePhoto || (user.avatar ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(user.id)}/${encodeURIComponent(user.avatar)}.webp?size=256` : fallbackAvatar(user.id));
    target.innerHTML = `<a class="forum-composer-author__avatar" href="${profileUrl(user.id)}"><img src="${escapeHtml(avatar)}" alt=""></a><a class="forum-composer-author__name" href="${profileUrl(user.id)}">${escapeHtml(user.displayName || user.username || 'Usuario')}</a>${roleBadges(user, user.rank || 'MIEMBRO', true)}<small>@${escapeHtml(user.username || '')}</small>`;
  }

  const sessionPromise = window.arkaSessionPromise || fetchWithTimeout('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' }).then((response) => response.ok ? response.json() : null).catch(() => null);
  window.arkaSessionPromise = sessionPromise;
  sessionPromise.then((session) => {
    authenticated = Boolean(session?.authenticated && session?.user?.id);
    discordMember = Boolean(session?.member);
    csrfToken = session?.csrfToken || '';
    sessionUser = session?.user || null;
    viewerPermissions = { ...viewerPermissions, ...(session?.permissions || {}) };
    viewer = { id: session?.user?.id || null, forumModeration: Boolean(session?.permissions?.forumModerateReplies) };
    if (session?.authenticated && session?.roleSync?.requiresReconnect && !sessionStorage.getItem('arkaForumRoleOauthUpgrade')) {
      sessionStorage.setItem('arkaForumRoleOauthUpgrade', '1');
      location.assign(`/api/auth/discord?return=${encodeURIComponent(location.pathname + location.search + location.hash)}`);
      return;
    }
    renderViewerIdentity($('forumComposeViewer'), sessionUser);
    renderViewerIdentity($('forumReplyViewer'), sessionUser);
    updatePublishAvailability();
    updateReplyAvailability();
    if (composerPage && !composerPage.hidden && composerPage.dataset.permissionLocked !== '1') {
      const canUseComposer = authenticated && (Boolean(editingPostId) || canPublishCategory(activeCategory));
      setEditorEnabled(postEditor, canUseComposer);
      const submit = $('forumComposeSubmit');
      if (submit) {
        submit.disabled = !canUseComposer;
        submit.hidden = Boolean(authenticated && !editingPostId && !canPublishCategory(activeCategory));
      }
      if (canUseComposer && composeStatus.textContent === 'Debes conectar tu cuenta de Discord para publicar.') composeStatus.textContent = '';
      if (authenticated && !editingPostId && !canPublishCategory(activeCategory)) {
        composeStatus.textContent = !discordMember && ['modalidades','comunidad'].includes(activeCategory) ? 'Debes pertenecer al servidor de Discord de ARKA WOOD para publicar aquí.' : 'No tienes permiso para crear publicaciones en esta sección.';
      }
    }
  });

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href^="/foro/"]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    event.preventDefault();
    navigateForum(link.getAttribute('href') || '/foro/');
  });
  window.addEventListener('popstate', initRoute);

  initRoute();
})();

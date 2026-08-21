(() => {
  'use strict';
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const COLOR_TAG_RE = /\[fg=(#[0-9a-f]{6})\]|\[\/fg\]/gi;
  const historyMap = new WeakMap();

  function normalizeColorMarkup(value) {
    const input = String(value || '');
    const stack = [];
    const segments = [];
    let cursor = 0;
    let match;
    const append = (text) => {
      if (!text) return;
      const color = stack.length ? stack[stack.length - 1] : '';
      const last = segments[segments.length - 1];
      if (last && last.color === color) last.text += text;
      else segments.push({ color, text });
    };
    COLOR_TAG_RE.lastIndex = 0;
    while ((match = COLOR_TAG_RE.exec(input))) {
      append(input.slice(cursor, match.index));
      if (match[1]) stack.push(match[1].toLowerCase());
      else if (stack.length) stack.pop();
      cursor = COLOR_TAG_RE.lastIndex;
    }
    append(input.slice(cursor));
    return segments.map((segment) => segment.color ? `[fg=${segment.color}]${segment.text}[/fg]` : segment.text).join('');
  }

  function stripColorMarkup(value) {
    return String(value || '').replace(COLOR_TAG_RE, '');
  }

  function safeHttpsUrl(value) {
    try {
      const url = new URL(String(value || '').trim());
      if (url.protocol !== 'https:' || url.username || url.password) return '';
      return url.toString();
    } catch { return ''; }
  }

  function inlineFormat(text) {
    const links = [];
    const token = (label, url) => {
      const index = links.push({ label:String(label || url || ''), url:String(url || '') }) - 1;
      return `ARKAPROFILELINK${index}TOKEN`;
    };
    let raw = normalizeColorMarkup(String(text || ''));
    // Compatibilidad con texto guardado por la versión visual anterior, que
    // podía producir [[fg=#rrggbb]texto[/fg]](https://...) y dejar el enlace
    // sin renderizar. Lo normalizamos sin perder ni el color ni el destino.
    raw = raw.replace(/\[\[fg=(#[0-9a-f]{6})\]([^\]\n]+)\[\/fg\]\]\((https:\/\/[^)\s]+)\)/gi, (_m, color, label, url) => `[fg=${color}]${token(label, url)}[/fg]`);
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
    safe = safe.replace(/\[fg=(#[0-9a-f]{6})\]/gi, (_m, color) => `<span class="profile-text-color" style="color:${color}">`);
    safe = safe.replace(/\[\/fg\]/gi, '</span>');
    safe = safe.replace(/ARKAPROFILELINK(\d+)TOKEN/g, (_m, index) => {
      const item = links[Number(index)] || { label:'', url:'' };
      const url = safeHttpsUrl(item.url);
      return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(item.label)}</a>` : escapeHtml(item.label);
    });
    return safe;
  }

  function render(value) {
    const normalized = normalizeColorMarkup(value);
    const lines = String(normalized || '').replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let ul = [], ol = [];
    const flush = () => {
      if (ul.length) { out.push(`<ul>${ul.map((item) => `<li>${inlineFormat(item)}</li>`).join('')}</ul>`); ul = []; }
      if (ol.length) { out.push(`<ol>${ol.map((item) => `<li>${inlineFormat(item)}</li>`).join('')}</ol>`); ol = []; }
    };
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (/^[-*]\s+/.test(line)) { if (ol.length) flush(); ul.push(line.replace(/^[-*]\s+/,'')); continue; }
      if (/^\d+\.\s+/.test(line)) { if (ul.length) flush(); ol.push(line.replace(/^\d+\.\s+/,'')); continue; }
      flush();
      if (!line.trim()) out.push('<div class="profile-rich-spacer"></div>');
      else if (/^##\s+/.test(line)) out.push(`<h4>${inlineFormat(line.replace(/^##\s+/,''))}</h4>`);
      else if (/^#\s+/.test(line)) out.push(`<h3>${inlineFormat(line.replace(/^#\s+/,''))}</h3>`);
      else if (/^>\s?/.test(line)) out.push(`<blockquote>${inlineFormat(line.replace(/^>\s?/,''))}</blockquote>`);
      else out.push(`<p>${inlineFormat(line)}</p>`);
    }
    flush();
    return out.join('');
  }

  function stripFormatting(value) {
    return stripColorMarkup(String(value || ''))
      .replace(/\[u\]|\[\/u\]/gi,'')
      .replace(/\[([^\]]+)\]\(https:\/\/[^)]+\)/g,'$1')
      .replace(/\*\*|__|~~|`/g,'')
      .replace(/(^|\s)\*([^*\n]+)\*/g,'$1$2')
      .replace(/^#{1,2}\s+/gm,'')
      .replace(/^>\s?/gm,'')
      .replace(/^[-*]\s+/gm,'')
      .replace(/^\d+\.\s+/gm,'');
  }

  function selectionRange(textarea) {
    const start = Number(textarea.selectionStart || 0);
    const end = Number(textarea.selectionEnd || start);
    return { start, end, selected:textarea.value.slice(start,end) };
  }

  function snapshot(textarea) {
    return { value:textarea.value, start:Number(textarea.selectionStart||0), end:Number(textarea.selectionEnd||0) };
  }
  function ensureHistory(textarea) {
    let state = historyMap.get(textarea);
    if (!state) {
      state = { items:[snapshot(textarea)], index:0, timer:0, applying:false };
      historyMap.set(textarea,state);
      textarea.addEventListener('input',()=>{
        if (state.applying) return;
        clearTimeout(state.timer);
        state.timer=setTimeout(()=>recordHistory(textarea),180);
      });
      textarea.addEventListener('keydown',(event)=>{
        if (!(event.ctrlKey||event.metaKey) || event.altKey) return;
        const key=event.key.toLowerCase();
        if(key==='z'){
          event.preventDefault();
          if(event.shiftKey) redo(textarea); else undo(textarea);
        }else if(key==='y'){
          event.preventDefault();redo(textarea);
        }
      });
    }
    return state;
  }
  function recordHistory(textarea, force=false) {
    const state=ensureHistory(textarea);
    clearTimeout(state.timer);
    const next=snapshot(textarea);
    const current=state.items[state.index];
    if(current && current.value===next.value){ current.start=next.start;current.end=next.end;return; }
    state.items=state.items.slice(0,state.index+1);
    state.items.push(next);
    if(state.items.length>80) state.items.shift();
    state.index=state.items.length-1;
  }
  function applyHistory(textarea,item){
    const state=ensureHistory(textarea);state.applying=true;
    textarea.value=item.value;
    textarea.focus({preventScroll:true});
    textarea.setSelectionRange(Math.min(item.value.length,item.start),Math.min(item.value.length,item.end));
    textarea.dispatchEvent(new Event('input',{bubbles:true}));
    state.applying=false;
  }
  function undo(textarea){const state=ensureHistory(textarea);recordHistory(textarea);if(state.index<=0)return;state.index-=1;applyHistory(textarea,state.items[state.index]);}
  function redo(textarea){const state=ensureHistory(textarea);if(state.index>=state.items.length-1)return;state.index+=1;applyHistory(textarea,state.items[state.index]);}


  function resetHistory(textarea){
    if(!textarea)return;
    const state=historyMap.get(textarea);
    if(state){if(state.timer)clearTimeout(state.timer);state.items=[snapshot(textarea)];state.index=0;state.timer=0;state.applying=false;return;}
    historyMap.set(textarea,{items:[snapshot(textarea)],index:0,timer:0,applying:false});
  }

  function replaceSelection(textarea, replacement, selectionStart = null, selectionEnd = null) {
    const { start, end } = selectionRange(textarea);
    const before = textarea.value.slice(0,start), after = textarea.value.slice(end);
    const max = Number(textarea.maxLength || -1);
    const value = before + replacement + after;
    if (max > 0 && value.length > max) {
      textarea.focus({preventScroll:true});
      return false;
    }
    recordHistory(textarea,true);
    textarea.value = value;
    const base = before.length;
    const nextStart = selectionStart == null ? base + replacement.length : base + selectionStart;
    const nextEnd = selectionEnd == null ? nextStart : base + selectionEnd;
    textarea.focus({preventScroll:true});
    textarea.setSelectionRange(Math.min(value.length,nextStart), Math.min(value.length,nextEnd));
    textarea.dispatchEvent(new Event('input',{bubbles:true}));
    recordHistory(textarea,true);
    return true;
  }

  function wrap(textarea, token) {
    const { selected } = selectionRange(textarea);
    const replacement = `${token}${selected}${token}`;
    replaceSelection(textarea,replacement,token.length,token.length+selected.length);
  }

  function prefixLines(textarea, prefix, ordered = false) {
    const { start, end } = selectionRange(textarea);
    const value = textarea.value;
    const lineStart = value.lastIndexOf('\n', Math.max(0,start-1)) + 1;
    const lineEndRaw = value.indexOf('\n',end);
    const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;
    const block = value.slice(lineStart,lineEnd);
    const lines = block.split('\n');
    const next = lines.map((line,index)=>`${ordered ? `${index+1}. ` : prefix}${line}`).join('\n');
    textarea.setSelectionRange(lineStart,lineEnd);
    replaceSelection(textarea,next,0,next.length);
  }

  function ensureLinkDialog() {
    let dialog = document.getElementById('profileRichLinkDialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'profileRichLinkDialog';
    dialog.className = 'profile-rich-dialog';
    dialog.innerHTML = `<form method="dialog"><button class="profile-rich-dialog__close" value="cancel" aria-label="Cerrar" type="submit">×</button><small>FORMATO DE TEXTO</small><h2>INSERTAR ENLACE</h2><label>TEXTO VISIBLE<input id="profileRichLinkText" maxlength="160"></label><label>DESTINO HTTPS<input id="profileRichLinkUrl" type="url" maxlength="500" placeholder="https://..."></label><div><button class="profile-button" value="cancel" type="submit">CANCELAR</button><button class="profile-button profile-button--primary" id="profileRichLinkApply" value="apply" type="submit">INSERTAR</button></div></form>`;
    document.body.appendChild(dialog);
    return dialog;
  }

  async function insertLink(textarea) {
    const dialog = ensureLinkDialog();
    const textInput = dialog.querySelector('#profileRichLinkText');
    const urlInput = dialog.querySelector('#profileRichLinkUrl');
    const { selected } = selectionRange(textarea);
    textInput.value = selected || '';
    urlInput.value = '';
    dialog.showModal();
    const result = await new Promise((resolve) => {
      const onClose = () => { dialog.removeEventListener('close',onClose); resolve(dialog.returnValue); };
      dialog.addEventListener('close',onClose);
    });
    if (result !== 'apply') return;
    const url = safeHttpsUrl(urlInput.value);
    if (!url) return;
    const label = String(textInput.value || selected || url).replace(/[\]\r\n]/g,' ').trim() || url;
    const markup = `[${label}](${url})`;
    replaceSelection(textarea,markup,1,1+label.length);
  }

  function clearSelection(textarea) {
    const { selected } = selectionRange(textarea);
    if (!selected) return;
    const clean = stripFormatting(selected);
    replaceSelection(textarea,clean,0,clean.length);
  }

  function bindToolbar(toolbar, textarea) {
    if (!toolbar || !textarea || toolbar.dataset.bound === '1') return;
    toolbar.dataset.bound = '1';
    ensureHistory(textarea);
    toolbar.addEventListener('mousedown',(event)=>{
      if (event.target.closest('button')) event.preventDefault();
    });
    toolbar.addEventListener('click',async(event)=>{
      const button = event.target.closest('button[data-rich-command]');
      if (!button) return;
      const cmd = button.dataset.richCommand;
      if (cmd === 'bold') wrap(textarea,'**');
      else if (cmd === 'italic') wrap(textarea,'*');
      else if (cmd === 'underline') wrap(textarea,'__');
      else if (cmd === 'strike') wrap(textarea,'~~');
      else if (cmd === 'heading') prefixLines(textarea,'# ');
      else if (cmd === 'quote') prefixLines(textarea,'> ');
      else if (cmd === 'unordered') prefixLines(textarea,'- ');
      else if (cmd === 'ordered') prefixLines(textarea,'',true);
      else if (cmd === 'link') await insertLink(textarea);
      else if (cmd === 'clear') clearSelection(textarea);
    });
    const color = toolbar.querySelector('input[type="color"][data-rich-color]');
    let savedSelection = null;
    const saveColorSelection=()=>{savedSelection=selectionRange(textarea);};
    color?.addEventListener('pointerdown',saveColorSelection);
    color?.addEventListener('focus',()=>{if(!savedSelection)saveColorSelection();});
    color?.addEventListener('change',()=>{
      if(savedSelection){textarea.focus({preventScroll:true});textarea.setSelectionRange(savedSelection.start,savedSelection.end);}
      const { selected } = selectionRange(textarea);
      if (!selected) return;
      const hex = /^#[0-9a-f]{6}$/i.test(color.value) ? color.value.toLowerCase() : '#ffffff';
      const cleanSelected = stripColorMarkup(selected);
      const prefix = `[fg=${hex}]`, suffix='[/fg]';
      replaceSelection(textarea,`${prefix}${cleanSelected}${suffix}`,prefix.length,prefix.length+cleanSelected.length);
      savedSelection=null;
    });
  }

  function updateCounter(textarea, counter) {
    if (!textarea || !counter) return;
    const max = Number(textarea.maxLength || 0);
    counter.textContent = max > 0 ? `${textarea.value.length} / ${max} caracteres` : `${textarea.value.length} caracteres`;
    counter.classList.toggle('is-near-limit', max > 0 && textarea.value.length >= Math.max(1,max-60));
  }

  window.arkaProfileRichText = { render, inlineFormat, stripFormatting, stripColorMarkup, normalizeColorMarkup, bindToolbar, updateCounter, safeHttpsUrl, undo, redo, resetHistory };
})();

/* v8.44.2 visual editor enhancement */
(() => {
  'use strict';
  const api = window.arkaProfileRichText;
  if (!api || api.__visualEnhanced) return;
  api.__visualEnhanced = true;

  const surfaceState = new WeakMap();
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
  const safeText = (value) => String(value || '').replace(/\u00a0/g, ' ');
  const rgbToHex = (value) => {
    const input = String(value || '').trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(input)) return input;
    const match = input.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return '';
    return '#' + match.slice(1, 4).map((item) => Math.max(0, Math.min(255, Number(item))).toString(16).padStart(2, '0')).join('');
  };

  function editorHtmlFromValue(value) {
    const html = api.render(String(value || ''));
    return html || '<p><br></p>';
  }

  function inlineToMarkup(node) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) return safeText(node.textContent);
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName.toLowerCase();
    const inner = Array.from(node.childNodes).map(inlineToMarkup).join('');
    if (tag === 'br') return '\n';
    if (tag === 'strong' || tag === 'b') return `**${inner}**`;
    if (tag === 'em' || tag === 'i') return `*${inner}*`;
    if (tag === 'u') return `__${inner}__`;
    if (tag === 's' || tag === 'strike') return `~~${inner}~~`;
    if (tag === 'code') return `\`${inner}\``;
    if (tag === 'a') {
      const href = api.safeHttpsUrl(node.getAttribute('href') || '');
      // El texto de un enlace debe ser plano dentro de [texto](url). Si se
      // serializan etiquetas [fg] dentro de los corchetes, el parser ya no
      // puede reconocer el enlace. Conservamos un color uniforme envolviendo
      // el enlace completo en lugar de insertarlo dentro de su etiqueta.
      const label = safeText(node.textContent).replace(/[\]\r\n]/g, ' ').trim() || href;
      const link = href ? `[${label}](${href})` : label;
      const ownColor = rgbToHex(node.style?.color || node.getAttribute('color') || '');
      const childColors = Array.from(node.querySelectorAll?.('span[style],font[color]') || [])
        .map((child) => rgbToHex(child.style?.color || child.getAttribute?.('color') || ''))
        .filter(Boolean);
      const uniqueChildColors = [...new Set(childColors)];
      const color = ownColor || (uniqueChildColors.length === 1 ? uniqueChildColors[0] : '');
      return color ? `[fg=${color}]${link}[/fg]` : link;
    }
    if (tag === 'span' || tag === 'font') {
      const color = rgbToHex(node.style?.color || node.getAttribute('color') || '');
      return color ? `[fg=${color}]${inner}[/fg]` : inner;
    }
    return inner;
  }

  function serializeBlock(node) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) return safeText(node.textContent).trim();
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName.toLowerCase();
    if (tag === 'ul') return Array.from(node.children).map((li) => `- ${inlineToMarkup(li).trim()}`).join('\n');
    if (tag === 'ol') return Array.from(node.children).map((li, index) => `${index + 1}. ${inlineToMarkup(li).trim()}`).join('\n');
    if (tag === 'blockquote') return inlineToMarkup(node).split(/\n+/).map((line) => line.trim() ? `> ${line.trim()}` : '>').join('\n');
    if (tag === 'h3') return `# ${inlineToMarkup(node).trim()}`;
    if (tag === 'h4') return `## ${inlineToMarkup(node).trim()}`;
    if (tag === 'div' || tag === 'p') {
      const text = inlineToMarkup(node).trim();
      return text || '';
    }
    return inlineToMarkup(node).trim();
  }

  function serializeEditor(editor) {
    const blocks = [];
    Array.from(editor.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = safeText(node.textContent).trim();
        if (text) blocks.push(text);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.classList.contains('profile-rich-spacer')) { blocks.push(''); return; }
      const tag = node.tagName.toLowerCase();
      if (tag === 'ul' || tag === 'ol') {
        const value = serializeBlock(node);
        if (value) blocks.push(value);
        return;
      }
      if (tag === 'div' && node.childNodes.length === 1) {
        const only = node.firstChild;
        if (only?.nodeType === Node.ELEMENT_NODE && /^(ul|ol|blockquote|h3|h4|p)$/i.test(only.tagName)) {
          blocks.push(serializeBlock(only));
          return;
        }
      }
      blocks.push(serializeBlock(node));
    });
    return api.normalizeColorMarkup(blocks.join('\n').replace(/\n{3,}/g, '\n\n').trim());
  }

  function syncFromSurface(textarea, { dispatch = true } = {}) {
    const state = surfaceState.get(textarea);
    if (!state || state.syncingFromTextarea) return;
    state.syncingFromSurface = true;
    const markup = serializeEditor(state.editor);
    textarea.value = markup;
    state.editor.dataset.empty = markup ? '0' : '1';
    if (dispatch) textarea.dispatchEvent(new Event('input', { bubbles: true }));
    state.syncingFromSurface = false;
  }

  function syncFromTextarea(textarea) {
    const state = surfaceState.get(textarea);
    if (!state || state.syncingFromSurface) return;
    state.syncingFromTextarea = true;
    state.editor.innerHTML = editorHtmlFromValue(textarea.value);
    state.editor.dataset.empty = textarea.value.trim() ? '0' : '1';
    state.syncingFromTextarea = false;
  }

  function ensureSurface(textarea) {
    let state = surfaceState.get(textarea);
    if (state) return state;
    const editor = document.createElement('div');
    editor.className = 'profile-rich-surface';
    editor.contentEditable = 'true';
    editor.setAttribute('role', 'textbox');
    editor.setAttribute('aria-multiline', 'true');
    editor.dataset.placeholder = textarea.getAttribute('placeholder') || '';
    editor.dataset.empty = textarea.value.trim() ? '0' : '1';
    editor.innerHTML = editorHtmlFromValue(textarea.value);
    textarea.classList.add('profile-rich-textarea--hidden');
    textarea.setAttribute('aria-hidden', 'true');
    textarea.tabIndex = -1;
    textarea.insertAdjacentElement('afterend', editor);
    state = { editor, syncingFromSurface: false, syncingFromTextarea: false };
    surfaceState.set(textarea, state);
    editor.addEventListener('input', () => syncFromSurface(textarea));
    editor.addEventListener('blur', () => syncFromSurface(textarea));
    editor.addEventListener('paste', (event) => {
      event.preventDefault();
      const text = event.clipboardData?.getData('text/plain') || '';
      document.execCommand('insertText', false, text);
    });
    textarea.addEventListener('input', () => {
      if (!state.syncingFromSurface) syncFromTextarea(textarea);
    });
    return state;
  }

  function focusSurface(textarea) {
    const state = ensureSurface(textarea);
    state.editor.focus({ preventScroll: true });
    return state.editor;
  }

  function editorSelectionRange(editor) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount !== 1) return null;
    const range = selection.getRangeAt(0);
    const startInside = range.startContainer === editor || editor.contains(range.startContainer);
    const endInside = range.endContainer === editor || editor.contains(range.endContainer);
    return startInside && endInside ? range.cloneRange() : null;
  }

  function restoreEditorSelection(editor, range) {
    editor.focus({ preventScroll: true });
    if (!range) return false;
    try {
      const selection = window.getSelection();
      if (!selection) return false;
      selection.removeAllRanges();
      selection.addRange(range);
      return true;
    } catch {
      return false;
    }
  }

  function withSelection(textarea, callback) {
    const editor = focusSurface(textarea);
    callback(editor);
    syncFromSurface(textarea);
  }

  async function insertLinkVisual(textarea) {
    const ensureDialog = () => {
      let modal = document.getElementById('profileRichLinkDialog');
      if (modal) return modal;
      const root = document.createElement('dialog');
      root.id = 'profileRichLinkDialog';
      root.className = 'profile-rich-dialog';
      root.innerHTML = '<form method="dialog"><button class="profile-rich-dialog__close" value="cancel" aria-label="Cerrar" type="submit">×</button><small>FORMATO DE TEXTO</small><h2>INSERTAR ENLACE</h2><label>TEXTO VISIBLE<input id="profileRichLinkText" maxlength="160"></label><label>DESTINO HTTPS<input id="profileRichLinkUrl" type="url" maxlength="500" placeholder="https://..."></label><div><button class="profile-button" value="cancel" type="submit">CANCELAR</button><button class="profile-button profile-button--primary" value="apply" type="submit">INSERTAR</button></div></form>';
      document.body.appendChild(root);
      return root;
    };
    const editor = ensureSurface(textarea).editor;
    const savedRange = editorSelectionRange(editor);
    const selected = savedRange ? savedRange.toString() : '';
    const modal = ensureDialog();
    const textInput = modal.querySelector('#profileRichLinkText');
    const urlInput = modal.querySelector('#profileRichLinkUrl');
    textInput.value = selected || '';
    urlInput.value = '';
    modal.showModal();
    textInput.focus({ preventScroll:true });
    const result = await new Promise((resolve) => {
      const onClose = () => {
        modal.removeEventListener('close', onClose);
        resolve(modal.returnValue);
      };
      modal.addEventListener('close', onClose);
    });
    if (result !== 'apply') {
      restoreEditorSelection(editor, savedRange);
      return;
    }
    const href = api.safeHttpsUrl(urlInput.value);
    if (!href) {
      restoreEditorSelection(editor, savedRange);
      return;
    }
    const label = String(textInput.value || selected || href).replace(/[\]\r\n]/g, ' ').trim() || href;
    const restored = restoreEditorSelection(editor, savedRange);
    if (restored && savedRange && !savedRange.collapsed) {
      document.execCommand('createLink', false, href);
      const sel = window.getSelection();
      const element = sel?.anchorNode?.nodeType === Node.ELEMENT_NODE ? sel.anchorNode : sel?.anchorNode?.parentElement;
      const anchor = element?.closest?.('a');
      if (anchor && editor.contains(anchor)) {
        if (label !== selected) anchor.textContent = label;
        anchor.setAttribute('href', href);
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer nofollow');
      }
    } else {
      restoreEditorSelection(editor, savedRange);
      document.execCommand('insertHTML', false, `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(label)}</a>`);
    }
    syncFromSurface(textarea);
  }

  api.bindToolbar = function bindToolbar(toolbar, textarea) {
    if (!toolbar || !textarea || toolbar.dataset.visualBound === '1') return;
    toolbar.dataset.visualBound = '1';
    ensureSurface(textarea);
    toolbar.addEventListener('mousedown', (event) => {
      if (event.target.closest('button,[data-rich-color]')) event.preventDefault();
    });
    toolbar.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-rich-command]');
      if (!button) return;
      const cmd = button.dataset.richCommand;
      if (cmd === 'bold') withSelection(textarea, () => document.execCommand('bold'));
      else if (cmd === 'italic') withSelection(textarea, () => document.execCommand('italic'));
      else if (cmd === 'underline') withSelection(textarea, () => document.execCommand('underline'));
      else if (cmd === 'strike') withSelection(textarea, () => document.execCommand('strikeThrough'));
      else if (cmd === 'heading') withSelection(textarea, () => document.execCommand('formatBlock', false, 'h3'));
      else if (cmd === 'quote') withSelection(textarea, () => document.execCommand('formatBlock', false, 'blockquote'));
      else if (cmd === 'unordered') withSelection(textarea, () => document.execCommand('insertUnorderedList'));
      else if (cmd === 'ordered') withSelection(textarea, () => document.execCommand('insertOrderedList'));
      else if (cmd === 'link') await insertLinkVisual(textarea);
      else if (cmd === 'clear') withSelection(textarea, () => { document.execCommand('removeFormat'); document.execCommand('unlink'); });
    });
    const colorInput = toolbar.querySelector('input[type="color"][data-rich-color]');
    let savedColorRange = null;
    const saveColorRange = () => {
      const editor = ensureSurface(textarea).editor;
      const range = editorSelectionRange(editor);
      if (range) savedColorRange = range;
    };
    colorInput?.addEventListener('pointerdown', saveColorRange);
    colorInput?.addEventListener('focus', () => { if (!savedColorRange) saveColorRange(); });
    colorInput?.addEventListener('change', () => {
      const editor = ensureSurface(textarea).editor;
      const hex = /^#[0-9a-f]{6}$/i.test(colorInput.value) ? colorInput.value.toLowerCase() : '#ffffff';
      if (restoreEditorSelection(editor, savedColorRange) && savedColorRange && !savedColorRange.collapsed) {
        document.execCommand('foreColor', false, hex);
        syncFromSurface(textarea);
      }
      savedColorRange = null;
    });
    textarea.__richRefresh = () => syncFromTextarea(textarea);
    textarea.__richFocus = () => focusSurface(textarea);
    syncFromTextarea(textarea);
  };

  api.refreshEditor = (textarea) => { if (textarea?.__richRefresh) textarea.__richRefresh(); };
})();

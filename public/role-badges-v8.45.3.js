(() => {
  'use strict';
  const MAX_VISIBLE_ROLES = 2;
  const DEIDAD_ROLE = {
    id: '1538302102495825931', key: 'DEIDAD', label: 'DEIDAD',
    colors: ['#FAE7AC', '#D4A63A', '#FAE7AC', '#D4A63A'], light: false, order: 0
  };
  const SPECIAL_IDENTITIES = new Map([
    ['1290118757888294912', { id:'identity:deidad-arbol-sagrado', key:'DEIDAD_ARBOL_SAGRADO', label:'✧ DEIDAD DEL ÁRBOL SAGRADO ✧', colors:['#2E6F4A','#8DDC8D'], light:false, identity:true, order:1 }],
    ['984129773179646003', { id:'identity:deidad-suprema', key:'DEIDAD_SUPREMA', label:'✦ DEIDAD SUPREMA ✦', colors:['#BC9135','#FFE7B0'], light:true, identity:true, order:1 }],
    ['1052673571429810186', { id:'identity:deidad-inframundo', key:'DEIDAD_INFRAMUNDO', label:'✠ DEIDAD DEL INFRAMUNDO ✠', colors:['#52120E','#D95E4B'], light:false, identity:true, order:1 }]
  ]);
  const specialRolesFor = (id) => {
    const identity = SPECIAL_IDENTITIES.get(String(id || ''));
    return identity ? [DEIDAD_ROLE, identity] : null;
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const validColor = (value) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value).toUpperCase() : '#6D6258';

  function parse(value) {
    if (Array.isArray(value)) return value.filter(Boolean).slice(0, 256);
    try {
      const parsed = JSON.parse(String(value || '[]'));
      return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object').slice(0, 256) : [];
    } catch { return []; }
  }

  function fromItem(item) {
    if (!item) return [];
    const id = String(item.id ?? item.discord_user_id ?? '');
    const fixed = specialRolesFor(id);
    if (fixed) return fixed;
    return parse(item.visible_roles ?? item.visibleRoles ?? item.roles ?? item.user_roles ?? item.userRoles ?? [])
      .sort((a, b) => Number(a?.order ?? 999) - Number(b?.order ?? 999))
      .slice(0, MAX_VISIBLE_ROLES);
  }

  function badge(role) {
    const colors = (Array.isArray(role?.colors) ? role.colors : []).map(validColor).slice(0, 5);
    if (!colors.length) colors.push('#6D6258', '#8B7B69');
    if (colors.length === 1) colors.push(colors[0]);
    const stops = colors.map((color, index) => `${color} ${Math.round((index / Math.max(1, colors.length - 1)) * 100)}%`).join(',');
    const classes = ['arka-role-badge'];
    if (role?.light) classes.push('is-light');
    if (role?.identity) classes.push('is-identity');
    const key = String(role?.key || 'MIEMBRO').replace(/[^A-Z0-9_+-]/gi, '').toUpperCase();
    return `<span class="${classes.join(' ')}" data-role-key="${escapeHtml(key)}" style="--arka-role-gradient:linear-gradient(90deg,${stops});--arka-role-accent:${colors[0]};--arka-role-accent-end:${colors[colors.length - 1]}">${escapeHtml(role?.label || 'MIEMBRO')}</span>`;
  }

  function render(value, fallback = 'MIEMBRO') {
    const roles = parse(value)
      .sort((a, b) => Number(a?.order ?? 999) - Number(b?.order ?? 999))
      .slice(0, MAX_VISIBLE_ROLES);
    if (!roles.length) return `<span class="arka-role-badge arka-role-badge--fallback">${escapeHtml(fallback)}</span>`;
    return roles.map(badge).join('');
  }

  window.arkaRoleBadges = { parse, fromItem, badge, render, maxVisible: MAX_VISIBLE_ROLES };
})();

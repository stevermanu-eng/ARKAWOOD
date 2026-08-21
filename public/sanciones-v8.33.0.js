(() => {
  'use strict';
  const D = window.ARKA_SANCTIONS;
  if(!D) return;
  const state = { filter:'ALL', query:'', staffQuery:'' };
  const $ = (id) => document.getElementById(id);
  const els = {
    searchForm:$('sanctionsSearchForm'), searchInput:$('sanctionsSearchInput'), quickSearchForm:$('quickSearchForm'), quickSearchInput:$('quickSearchInput'),
    filters:Array.from(document.querySelectorAll('.sanctions-filter')), list:$('sanctionsList'), resultsMeta:$('sanctionsResultsMeta'), clear:$('clearSearchButton'),
    chart:$('staffActivityChart'), staffSearch:$('staffActivitySearchInput'), statTotal:$('statTotal'), statTopStaff:$('statTopStaff'), statTopStaffMeta:$('statTopStaffMeta'),
    statWarn:$('statWarn'), statBan:$('statBan'), statMute:$('statMute')
  };

  const humanStaffStats = () => D.staffStats().filter((entry) => entry.staff.id !== 'staff-aegis');

  function staffAvatar(staff){
    const inner = staff.avatar ? `<img src="${staff.avatar}" alt="Foto de ${D.escapeHtml(staff.name)}">` : `<span>${D.escapeHtml(D.initials(staff.name))}</span>`;
    return `<a class="sanctions-avatar sanctions-avatar--staff" href="${D.staffUrl(staff)}" aria-label="Ver historial de ${D.escapeHtml(staff.name)}">${inner}</a>`;
  }
  function playerAvatar(player){
    return `<a class="sanctions-avatar sanctions-avatar--player" href="${D.playerUrl(player)}" aria-label="Ver sanciones de ${D.escapeHtml(player.name)}"><img src="${player.avatar}" alt="Foto de perfil Minecraft de ${D.escapeHtml(player.name)}"></a>`;
  }
  function filtered(){
    const q = state.query.toLowerCase().trim().replace(/[{}]/g,'');
    return D.sanctions.filter((item) => {
      const matchesType = state.filter === 'ALL' || item.type === state.filter;
      const fields = [item.id,item.player.name,item.player.uuid,item.player.uuid.replace(/-/g,''),item.staff.name,item.staff.role,item.reason,item.duration,item.status].join(' ').toLowerCase();
      return matchesType && (!q || fields.includes(q.replace(/-/g,'')) || fields.includes(q));
    }).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  }
  function renderStaffChart(){
    const q=state.staffQuery.trim().toLowerCase();
    const staffStats=humanStaffStats().filter((entry)=>!q || entry.staff.name.toLowerCase().includes(q) || entry.staff.role.toLowerCase().includes(q));
    if(!staffStats.length){
      els.chart.innerHTML='<div class="staff-activity-empty">No hay miembros que coincidan con la búsqueda.</div>';
      return;
    }
    const max=Math.max(1,...staffStats.map((entry)=>entry.total));
    els.chart.innerHTML=staffStats.slice(0,8).map((entry,index)=>`
      <a class="staff-activity-row" href="${D.staffUrl(entry.staff)}">
        <div class="staff-activity-row__head">
          <span class="staff-activity-row__identity">${D.roleBadge(entry.staff.role)}<b>${D.escapeHtml(entry.staff.name)}</b></span>
          <strong>${entry.total}</strong>
        </div>
        <div class="staff-activity-row__line"><i style="width:${Math.max(7,(entry.total/max)*100)}%"></i></div>
        <small>#${index+1} · ${entry.recent} recientes · ${entry.active} activas</small>
      </a>`).join('');
  }
  function statusPill(status){
    const normalized = String(status || '').trim().toLowerCase();
    const variant = normalized.startsWith('act') ? 'active' : normalized.startsWith('hist') ? 'historical' : 'neutral';
    return `<span class="status-pill status-pill--${variant}">${D.escapeHtml(status || '—')}</span>`;
  }
  function renderStats(){
    els.statTotal.textContent = D.sanctions.length;
    const staffStats = humanStaffStats();
    const top = staffStats[0];
    els.statTopStaff.innerHTML = top ? `${D.roleBadge(top.staff.role)}<b>${D.escapeHtml(top.staff.name)}</b>` : '<b>—</b>';
    els.statTopStaffMeta.textContent = top ? `${top.total} sanciones registradas` : 'Sin registros';
    const count=(type)=>D.sanctions.filter((item)=>item.type===type).length;
    els.statWarn.textContent=count('WARN');
    els.statBan.textContent=count('BAN');
    els.statMute.textContent=count('MUTE');
    renderStaffChart();
  }
  function renderList(){
    const items = filtered();
    if(!items.length){ els.list.innerHTML='<div class="empty-state"><h3>SIN RESULTADOS</h3><p>No encontramos sanciones que coincidan con la búsqueda o filtro actual.</p></div>'; els.resultsMeta.textContent='No hay coincidencias.'; return; }
    els.resultsMeta.textContent = state.query ? `Mostrando ${items.length} resultado(s) para “${state.query}”.` : `Mostrando ${items.length} sanción(es).`;
    els.list.innerHTML = items.map((item)=>`<article class="sanctions-row sanctions-row--item" role="row"><div class="sanctions-user">${playerAvatar(item.player)}<div><b><a href="${D.playerUrl(item.player)}">${D.escapeHtml(item.player.name)}</a></b><small title="${D.escapeHtml(item.player.uuid)}">UUID · ${D.escapeHtml(item.player.uuid)}</small></div></div><div class="sanctions-type-cell"><span class="type-pill type-pill--${item.type}">${item.type}</span>${statusPill(item.status)}</div><div class="sanctions-staff-cell">${staffAvatar(item.staff)}<div class="sanctions-staff-cell__identity"><b><a href="${D.staffUrl(item.staff)}">${D.escapeHtml(item.staff.name)}</a></b>${D.roleBadge(item.staff.role)}</div></div><div class="row-meta">${D.escapeHtml(item.duration)}<span class="row-muted">${item.expiresAt ? 'Hasta '+D.escapeHtml(D.formatDate(item.expiresAt)) : 'Sin vencimiento'}</span></div><div class="row-meta">${D.escapeHtml(D.formatDate(item.createdAt))}<span class="row-muted row-reason">${D.escapeHtml(item.reason)}</span></div><a class="row-detail-btn" href="${D.detailUrl(item)}">VER SANCIÓN</a></article>`).join('');
  }
  function scrollResults(){ document.getElementById('resultados')?.scrollIntoView({behavior:'smooth',block:'start'}); }
  function applySearch(value,{scroll=true}={}){
    state.query=String(value||'').trim(); els.searchInput.value=state.query; els.quickSearchInput.value=state.query;
    const url=new URL(location.href); if(state.query) url.searchParams.set('buscar',state.query); else url.searchParams.delete('buscar'); history.replaceState(null,'',`${url.pathname}${url.search}`);
    renderList(); if(scroll) setTimeout(scrollResults,60);
  }
  els.searchForm?.addEventListener('submit',(e)=>{e.preventDefault();applySearch(els.searchInput.value);});
  els.quickSearchForm?.addEventListener('submit',(e)=>{e.preventDefault();applySearch(els.quickSearchInput.value);});
  els.clear?.addEventListener('click',()=>applySearch(''));
  els.staffSearch?.addEventListener('input',()=>{state.staffQuery=els.staffSearch.value;renderStaffChart();});
  els.staffSearch?.addEventListener('keydown',(e)=>{if(e.key==='Escape'){els.staffSearch.value='';state.staffQuery='';renderStaffChart();}});
  els.filters.forEach((btn)=>btn.addEventListener('click',()=>{state.filter=btn.dataset.filter||'ALL';els.filters.forEach((b)=>b.classList.toggle('is-active',b===btn));renderList();scrollResults();}));
  const params=new URLSearchParams(location.search); if(params.get('buscar')){state.query=params.get('buscar').trim();els.searchInput.value=state.query;els.quickSearchInput.value=state.query;}
  renderStats(); renderList(); if(state.query || location.hash==='#resultados') setTimeout(scrollResults,100);
})();

(() => {
  'use strict';
  const D=window.ARKA_SANCTIONS;
  if(!D) return;

  const all=document.getElementById('allStaffStats');
  const selected=document.getElementById('selectedStaffRoot');
  const anticheatRoot=document.getElementById('anticheatStats');
  const form=document.getElementById('staffDirectorySearch');
  const input=document.getElementById('staffDirectorySearchInput');
  const resultLabel=document.getElementById('staffSearchResult');
  const donut=document.getElementById('staffTypeDonut');
  const donutSlices=document.getElementById('staffDonutSlices');
  const donutTotal=document.getElementById('staffDonutTotal');
  const donutLegend=document.getElementById('staffDonutLegend');
  const weekChart=document.getElementById('staffWeekChart');
  const periodControls=document.getElementById('staffAnalyticsControls');
  const periodTitle=document.getElementById('staffActivityPeriodTitle');
  const analyticsInsight=document.getElementById('staffAnalyticsInsight');
  const pagePrev=document.getElementById('staffPagePrev');
  const pageNext=document.getElementById('staffPageNext');
  const pageStatus=document.getElementById('staffPageStatus');

  const fullStats=D.staffStats();
  const humanStats=fullStats.filter((entry)=>entry.staff.id!=='staff-aegis');
  const aegisEntry=fullStats.find((entry)=>entry.staff.id==='staff-aegis') || null;
  const humanSanctions=D.sanctions.filter((item)=>item.staff.id!=='staff-aegis');
  const palette=['#d9ae52','#8da6c4','#a873b2','#6fa58a','#c8775f','#7d8fae'];
  const PAGE_SIZE=9;
  let query='';
  let currentPage=1;
  let analyticsPeriod=7;
  let selectedStaffId='ALL';

  function avatar(staff){
    return staff.avatar
      ? `<img src="${staff.avatar}" alt="Foto de ${D.escapeHtml(staff.name)}" loading="lazy">`
      : `<span>${D.escapeHtml(D.initials(staff.name))}</span>`;
  }

  function itemsWithinDays(items, days){
    const cutoff=Date.now()-(days*24*60*60*1000);
    return items.filter((item)=>new Date(item.createdAt).getTime()>=cutoff);
  }

  function staffPeriodCounts(staff){
    const items=D.sanctionsForStaff(staff);
    return {
      week:itemsWithinDays(items,7).length,
      month:itemsWithinDays(items,30).length,
      total:items.length
    };
  }

  function filteredHumanStats(){
    const q=query.trim().toLocaleLowerCase('es');
    return humanStats.filter((entry)=>{
      if(!q) return true;
      return entry.staff.name.toLocaleLowerCase('es').includes(q) || entry.staff.role.toLocaleLowerCase('es').includes(q);
    });
  }

  function renderHumanStats(){
    const filtered=filteredHumanStats();
    const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
    currentPage=Math.min(Math.max(1,currentPage),totalPages);
    const start=(currentPage-1)*PAGE_SIZE;
    const pageItems=filtered.slice(start,start+PAGE_SIZE);

    resultLabel.textContent=query.trim() ? `${filtered.length} resultado${filtered.length===1?'':'s'}` : `${humanStats.length} miembros`;
    if(pageStatus) pageStatus.textContent=`PÁGINA ${currentPage} DE ${totalPages}`;
    if(pagePrev){pagePrev.disabled=currentPage<=1;pagePrev.setAttribute('aria-disabled',String(currentPage<=1));}
    if(pageNext){pageNext.disabled=currentPage>=totalPages;pageNext.setAttribute('aria-disabled',String(currentPage>=totalPages));}

    if(!filtered.length){
      all.innerHTML='<div class="empty-state staff-directory-empty"><h3>NO ENCONTRADO</h3><p>No hay miembros del staff cuyo nombre o rango coincida con la búsqueda.</p></div>';
      return;
    }

    all.innerHTML=pageItems.map((entry,index)=>{
      const counts=staffPeriodCounts(entry.staff);
      const globalPosition=start+index+1;
      return `<a class="all-staff-row" href="${D.staffUrl(entry.staff)}#staff-detalle" aria-label="Ver estadísticas de ${D.escapeHtml(entry.staff.name)}">
        <div class="all-staff-row__top">
          <div class="all-staff-row__identity">${avatar(entry.staff)}<div>${D.roleBadge(entry.staff.role)}<b>${D.escapeHtml(entry.staff.name)}</b></div></div>
          <span class="all-staff-row__position">#${globalPosition}</span>
        </div>
        <div class="all-staff-row__periods" aria-label="Resumen de sanciones de ${D.escapeHtml(entry.staff.name)}">
          <div><span>SEMANA</span><strong>${counts.week}</strong></div>
          <div><span>MES</span><strong>${counts.month}</strong></div>
          <div><span>TOTAL</span><strong>${counts.total}</strong></div>
        </div>
        <div class="all-staff-row__types"><span>BAN <b>${entry.types.BAN}</b></span><span>MUTE <b>${entry.types.MUTE}</b></span><span>KICK <b>${entry.types.KICK}</b></span><span>WARN <b>${entry.types.WARN}</b></span><span>BLACKLIST <b>${entry.types.BLACKLIST}</b></span></div>
      </a>`;
    }).join('');
  }

  function renderAnticheat(){
    if(!aegisEntry){ anticheatRoot.innerHTML='<p class="empty-copy">AEGIS todavía no tiene registros.</p>'; return; }
    const entry=aegisEntry;
    const counts=staffPeriodCounts(entry.staff);
    anticheatRoot.innerHTML=`<a class="anticheat-stat-card" href="${D.staffUrl(entry.staff)}#staff-detalle"><div class="anticheat-stat-card__avatar">${avatar(entry.staff)}</div><div class="anticheat-stat-card__identity"><small>ANTICHEAT · SISTEMA AUTOMÁTICO</small><h3>AEGIS</h3>${D.roleBadge(entry.staff.role)}</div><div class="anticheat-stat-card__metrics"><div><strong>${counts.week}</strong><span>SEMANA</span></div><div><strong>${counts.month}</strong><span>MES</span></div><div><strong>${counts.total}</strong><span>TOTALES</span></div></div><div class="anticheat-stat-card__types"><span>BAN <b>${entry.types.BAN}</b></span><span>MUTE <b>${entry.types.MUTE}</b></span><span>KICK <b>${entry.types.KICK}</b></span><span>WARN <b>${entry.types.WARN}</b></span><span>BLACKLIST <b>${entry.types.BLACKLIST}</b></span></div></a>`;
  }

  function periodItems(){
    if(analyticsPeriod==='ALL') return humanSanctions;
    return itemsWithinDays(humanSanctions,Number(analyticsPeriod));
  }

  function renderDonut(items){
    const counts=new Map();
    for(const item of items){
      const id=String(item?.staff?.id||'');
      if(!id||id==='staff-aegis') continue;
      counts.set(id,(counts.get(id)||0)+1);
    }
    const leaders=humanStats.map((entry)=>({entry,count:counts.get(entry.staff.id)||0}))
      .filter((row)=>row.count>0)
      .sort((a,b)=>b.count-a.count||a.entry.staff.name.localeCompare(b.entry.staff.name,'es'))
      .slice(0,5);
    const total=items.length;
    if(donutTotal) donutTotal.textContent=String(total);
    if(donut) donut.dataset.selectedStaff=selectedStaffId;

    if(donutSlices){
      let cursor=0;
      donutSlices.innerHTML=leaders.map((row,index)=>{
        const value=total ? (row.count/total)*100 : 0;
        const dash=Math.max(0,value), gap=Math.max(0,100-dash), offset=-cursor;
        cursor+=value;
        const selected=selectedStaffId==='ALL'||selectedStaffId===row.entry.staff.id;
        return `<circle class="staff-donut__slice${selected?' is-visible':' is-muted'}" data-donut-staff="${D.escapeHtml(row.entry.staff.id)}" cx="60" cy="60" r="48" pathLength="100" style="--slice-color:${palette[index%palette.length]};--slice-delay:${index*95}ms;stroke-dasharray:${dash.toFixed(3)} ${gap.toFixed(3)};stroke-dashoffset:${offset.toFixed(3)}"></circle>`;
      }).join('');
    }

    if(donutLegend){
      donutLegend.innerHTML=leaders.length?leaders.map((row,index)=>{
        const pct=total?Math.round(row.count/total*100):0;
        return `<button type="button" class="staff-donut-legend__item${selectedStaffId===row.entry.staff.id?' is-active':''}" data-stat-staff="${D.escapeHtml(row.entry.staff.id)}" title="Ver actividad de ${D.escapeHtml(row.entry.staff.name)}"><i style="--legend:${palette[index%palette.length]}"></i><span>${D.roleBadge(row.entry.staff.role)} ${D.escapeHtml(row.entry.staff.name)}</span><b>${row.count}</b><small>${pct}%</small></button>`;
      }).join(''):'<p class="empty-copy">Todavía no hay sanciones humanas en este periodo.</p>';
    }
    updateInsight(items,leaders,total);
  }

  function updateInsight(items,leaders,total){
    if(!analyticsInsight) return;
    if(selectedStaffId==='ALL'){
      const lead=leaders[0];
      analyticsInsight.innerHTML=lead
        ? `<strong>${lead.count}</strong><span>${D.escapeHtml(lead.entry.staff.name)} lidera el periodo · ${total} sanciones humanas en total</span>`
        : '<strong>0</strong><span>Sin sanciones humanas en el periodo seleccionado</span>';
      return;
    }
    const row=leaders.find((item)=>item.entry.staff.id===selectedStaffId);
    if(!row){selectedStaffId='ALL';updateInsight(items,leaders,total);return;}
    const pct=total?Math.round(row.count/total*100):0;
    analyticsInsight.innerHTML=`<strong>${row.count}</strong><span>${D.escapeHtml(row.entry.staff.name)} · ${D.escapeHtml(row.entry.staff.role)} · ${pct}% de las sanciones humanas del periodo</span>`;
  }

  function renderActivityChart(items){
    if(!weekChart) return;
    const now=new Date(); now.setHours(23,59,59,999);
    let buckets=[];
    if(analyticsPeriod===7){
      for(let offset=6;offset>=0;offset--){
        const start=new Date(now); start.setDate(now.getDate()-offset); start.setHours(0,0,0,0);
        const end=new Date(start); end.setDate(start.getDate()+1);
        buckets.push({start,end,label:new Intl.DateTimeFormat('es-ES',{weekday:'short'}).format(start).replace('.','').toUpperCase()});
      }
      if(periodTitle) periodTitle.textContent='Últimos 7 días';
    }else if(analyticsPeriod===30){
      for(let offset=27;offset>=0;offset-=3){
        const start=new Date(now); start.setDate(now.getDate()-offset); start.setHours(0,0,0,0);
        const end=new Date(start); end.setDate(start.getDate()+3);
        buckets.push({start,end,label:new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short'}).format(start).replace('.','').toUpperCase()});
      }
      if(periodTitle) periodTitle.textContent='Últimos 30 días';
    }else{
      const dates=humanSanctions.map((item)=>new Date(item.createdAt)).filter((date)=>!Number.isNaN(date.getTime()));
      const earliest=dates.length?new Date(Math.min(...dates.map((date)=>date.getTime()))):new Date(now);
      earliest.setDate(1); earliest.setHours(0,0,0,0);
      const cursor=new Date(earliest);
      while(cursor<=now && buckets.length<12){
        const start=new Date(cursor); const end=new Date(cursor); end.setMonth(end.getMonth()+1);
        buckets.push({start,end,label:new Intl.DateTimeFormat('es-ES',{month:'short'}).format(start).replace('.','').toUpperCase()});
        cursor.setMonth(cursor.getMonth()+1);
      }
      if(periodTitle) periodTitle.textContent='Histórico completo';
    }
    buckets=buckets.map((bucket)=>{
      const count=items.filter((item)=>{const date=new Date(item.createdAt); return date>=bucket.start&&date<bucket.end&&(selectedStaffId==='ALL'||item.staff.id===selectedStaffId);}).length;
      return {...bucket,count};
    });
    const maxBucket=Math.max(1,...buckets.map((bucket)=>bucket.count));
    weekChart.style.gridTemplateColumns=`repeat(${Math.max(1,buckets.length)},minmax(32px,1fr))`;
    weekChart.innerHTML=buckets.map((bucket,index)=>`<button type="button" class="staff-week-column" style="--bar-delay:${index*55}ms" title="${D.escapeHtml(bucket.label)}: ${bucket.count} sanción(es)"><b>${bucket.count}</b><div><i style="height:${Math.max(5,bucket.count/maxBucket*100)}%"></i></div><span>${D.escapeHtml(bucket.label)}</span></button>`).join('');
  }

  function renderAnalytics(){
    const items=periodItems();
    renderDonut(items);
    renderActivityChart(items);
    periodControls?.querySelectorAll('[data-period]').forEach((button)=>button.classList.toggle('is-active',String(button.dataset.period)===String(analyticsPeriod)));
  }

  function renderSelected(){
    const key=new URLSearchParams(location.search).get('staff');
    const staff=D.findStaff(key);
    if(!staff){selected.innerHTML='';return;}
    const items=D.sanctionsForStaff(staff).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const entry=fullStats.find((stats)=>stats.staff.id===staff.id);
    const isAegis=staff.id==='staff-aegis';
    const counts=staffPeriodCounts(staff);
    selected.innerHTML=`<section class="staff-detail-card" id="staff-detalle"><div class="staff-detail-card__head"><div class="staff-detail-card__avatar">${avatar(staff)}</div><div><small>${isAegis?'SISTEMA AUTOMÁTICO':'HISTORIAL INDIVIDUAL'}</small><div class="staff-detail-card__identity-line">${D.roleBadge(staff.role)}<h2>${D.escapeHtml(staff.name)}</h2></div></div></div><div class="staff-period-summary"><div><span>SEMANA</span><strong>${counts.week}</strong><small>últimos 7 días</small></div><div><span>MES</span><strong>${counts.month}</strong><small>últimos 30 días</small></div><div><span>TOTAL</span><strong>${counts.total}</strong><small>histórico</small></div></div><div class="staff-metric-grid staff-metric-grid--types"><div><span>BAN</span><strong>${entry?.types.BAN||0}</strong></div><div><span>MUTE</span><strong>${entry?.types.MUTE||0}</strong></div><div><span>KICK</span><strong>${entry?.types.KICK||0}</strong></div><div><span>WARN</span><strong>${entry?.types.WARN||0}</strong></div><div><span>BLACKLIST</span><strong>${entry?.types.BLACKLIST||0}</strong></div></div>${staff.webProfileId?`<a class="sanctions-button sanctions-button--ghost staff-profile-link" href="/perfil/${encodeURIComponent(staff.webProfileId)}">VER PERFIL DEL FORO</a>`:''}<div class="staff-sanction-history">${items.length?items.map((item)=>`<a href="${D.detailUrl(item)}"><span class="type-pill type-pill--${item.type}">${item.type}</span><div><b>${D.escapeHtml(item.player.name)}</b><small>${D.escapeHtml(item.reason)}</small></div><time>${D.escapeHtml(D.formatDate(item.createdAt))}</time></a>`).join(''):'<p class="empty-copy">Este responsable todavía no tiene sanciones registradas.</p>'}</div></section>`;
    setTimeout(()=>document.getElementById('staff-detalle')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
  }

  function setQuery(value,{scroll=false}={}){
    query=String(value||'');
    currentPage=1;
    renderHumanStats();
    if(scroll) document.getElementById('staffDirectoryPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  form?.addEventListener('submit',(event)=>{event.preventDefault();setQuery(input.value,{scroll:true});});
  input?.addEventListener('input',()=>setQuery(input.value));
  input?.addEventListener('keydown',(event)=>{if(event.key==='Escape'){input.value='';setQuery('');}});
  pagePrev?.addEventListener('click',()=>{if(currentPage>1){currentPage-=1;renderHumanStats();document.getElementById('staffDirectoryPanel')?.scrollIntoView({behavior:'smooth',block:'start'});}});
  pageNext?.addEventListener('click',()=>{const totalPages=Math.max(1,Math.ceil(filteredHumanStats().length/PAGE_SIZE));if(currentPage<totalPages){currentPage+=1;renderHumanStats();document.getElementById('staffDirectoryPanel')?.scrollIntoView({behavior:'smooth',block:'start'});}});
  periodControls?.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-period]');
    if(!button) return;
    analyticsPeriod=button.dataset.period==='ALL'?'ALL':Number(button.dataset.period)||7;
    renderAnalytics();
  });
  donutLegend?.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-stat-staff]');
    if(!button) return;
    selectedStaffId=selectedStaffId===button.dataset.statStaff?'ALL':button.dataset.statStaff;
    renderAnalytics();
  });
  donutSlices?.addEventListener('click',(event)=>{
    const slice=event.target.closest('[data-donut-staff]');
    if(!slice) return;
    selectedStaffId=selectedStaffId===slice.dataset.donutStaff?'ALL':slice.dataset.donutStaff;
    renderAnalytics();
  });
  donut?.addEventListener('dblclick',()=>{selectedStaffId='ALL';renderAnalytics();});

  renderAnalytics();
  renderHumanStats();
  renderAnticheat();
  renderSelected();
})();

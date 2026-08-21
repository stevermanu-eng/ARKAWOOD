(() => {
  "use strict";
  const ROLE_INFO = {"ZELUM":{"brief":"Ingreso operativo a la LEGIÓN DEL JUICIO.","target":"#rango-zelum"},"NEMIS":{"brief":"Resolver tickets.","target":"#rango-nemis"},"VEXEN":{"brief":"Atender reportes y tickets generales.","target":"#rango-vexen"},"INVAR":{"brief":"Resolver reportes complejos.","target":"#rango-invar"},"SABLE":{"brief":"Resolver sanciones de mayor peso.","target":"#rango-sable"},"VORIEN":{"brief":"Intervenir en incidentes graves.","target":"#rango-vorien"},"MALVEN":{"brief":"Aprender procedimientos de supervisión.","target":"#rango-malven"},"ELYON":{"brief":"Supervisar grupos de ZELUM a MALVEN.","target":"#rango-elyon"},"LUMEN":{"brief":"Supervisar a ELYON.","target":"#rango-lumen"},"ORACLE":{"brief":"Dirigir a ELYON y LUMEN.","target":"#rango-oracle"},"OFÁN":{"brief":"Supervisar a ORACLE, LUMEN y ELYON.","target":"#rango-ofan"},"QUERUBÍN":{"brief":"Segunda mano que dirige toda la LEGIÓN DEL JUICIO.","target":"#rango-querubin"},"SERAFÍN":{"brief":"Definir los lineamientos finales de Moderación.","target":"#rango-serafin"},"BUILDER":{"brief":"Construir secciones asignadas.","target":"#rango-builder"},"BUILDER+":{"brief":"Ejecutar secciones de mayor complejidad.","target":"#rango-builder-plus"},"SENIOR BUILDER":{"brief":"Supervisar calidad de BUILDER y BUILDER+.","target":"#rango-senior-builder"},"AK":{"brief":"Diseñar distribuciones.","target":"#rango-ak"},"GÉNESIS":{"brief":"Definir lineamientos estéticos.","target":"#rango-genesis"},"JEFE DE MODALIDAD":{"brief":"Supervisar el funcionamiento de su modalidad.","target":"#rango-jefe-de-modalidad"},"DEVELOPER":{"brief":"Desarrollar o modificar plugins.","target":"#rango-developer"},"COORDINADOR":{"brief":"Distribuir tareas.","target":"#rango-coordinador"},"ADMINISTRADOR":{"brief":"Gestionar documentación.","target":"#rango-administrador"},"ADMINISTRADOR GENERAL":{"brief":"Dirigir el CÓNCLAVE DEL NEXO.","target":"#rango-administrador-general"},"CO-OWNER":{"brief":"Participar en decisiones generales.","target":"#rango-co-owner"},"DEIDAD":{"brief":"Definir la visión general.","target":"#rango-deidad"},"COLABORADOR":{"brief":"Participar en tareas autorizadas.","target":"#rango-colaborador"},"PARTNER":{"brief":"Desarrollar acciones conjuntas.","target":"#rango-partner"},"INVERSIONISTA":{"brief":"Aportar recursos conforme al acuerdo.","target":"#rango-inversionista"},"CREADOR":{"brief":"Creador asociado a ARKAWOOD.","target":"#rango-creador"},"STREAMER":{"brief":"Creador asociado a ARKAWOOD.","target":"#rango-streamer"},"INFLUENCER":{"brief":"Creador con alcance relevante en redes sociales.","target":"#rango-influencer"},"MARKETING":{"brief":"Miembro interno de campañas y promoción.","target":"#rango-marketing"},"CONTENT CREATOR":{"brief":"Productor interno de contenido.","target":"#rango-content-creator"},"COMMUNITY MANAGER":{"brief":"Gestión de redes y comunicación comunitaria.","target":"#rango-community-manager"},"JEFE MARKETING":{"brief":"Máxima autoridad del EQUIPO DE DIFUSIÓN.","target":"#rango-jefe-marketing"}};
  const names = Object.keys(ROLE_INFO).sort((a,b)=>b.length-a.length);
  const escaped = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp("(?<![\\p{L}\\p{N}_])(" + escaped.join("|") + ")(?![\\p{L}\\p{N}_])", "gu");
  const root = document.querySelector(".audit-content");
  const tooltip = document.getElementById("auditRoleTooltip");
  if (!root || !tooltip) return;

  const skip = new Set(["SCRIPT","STYLE","CODE","A","H1","H2","H3","H4","H5","BUTTON"]);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node){
      if (!node.nodeValue || !node.nodeValue.trim() || !re.test(node.nodeValue)) { re.lastIndex=0; return NodeFilter.FILTER_REJECT; }
      re.lastIndex=0;
      const p=node.parentElement;
      if (!p || skip.has(p.tagName) || p.closest(".audit-role-ref,.audit-role-tooltip,.audit-anchor,.audit-color-line")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const text=node.nodeValue; re.lastIndex=0;
    let last=0, m; const frag=document.createDocumentFragment();
    while((m=re.exec(text))){
      if(m.index>last) frag.append(text.slice(last,m.index));
      const span=document.createElement("span");
      span.className="audit-role-ref"; span.tabIndex=0; span.dataset.role=m[1]; span.textContent=m[1];
      frag.append(span); last=m.index+m[0].length;
    }
    if(last<text.length) frag.append(text.slice(last));
    node.replaceWith(frag);
  });

  const show=(el)=>{
    const info=ROLE_INFO[el.dataset.role]; if(!info) return;
    tooltip.querySelector("strong").textContent=el.dataset.role;
    tooltip.querySelector("span").textContent=info.brief;
    tooltip.classList.add("is-visible"); tooltip.setAttribute("aria-hidden","false");
    const r=el.getBoundingClientRect(), tw=tooltip.offsetWidth||300, th=tooltip.offsetHeight||100;
    let left=Math.max(12,Math.min(window.innerWidth-tw-12,r.left+r.width/2-tw/2));
    let top=r.top-th-12; if(top<12) top=r.bottom+12;
    tooltip.style.left=left+"px"; tooltip.style.top=top+"px";
  };
  const hide=()=>{tooltip.classList.remove("is-visible");tooltip.setAttribute("aria-hidden","true");};
  root.addEventListener("mouseover",e=>{const el=e.target.closest(".audit-role-ref"); if(el) show(el);});
  root.addEventListener("mouseout",e=>{if(e.target.closest(".audit-role-ref")) hide();});
  root.addEventListener("focusin",e=>{const el=e.target.closest(".audit-role-ref"); if(el) show(el);});
  root.addEventListener("focusout",e=>{if(e.target.closest(".audit-role-ref")) hide();});
  root.addEventListener("click",e=>{const el=e.target.closest(".audit-role-ref"); if(!el) return; const info=ROLE_INFO[el.dataset.role]; if(info?.target && document.querySelector(info.target)) history.replaceState(null,"",info.target);});
})();

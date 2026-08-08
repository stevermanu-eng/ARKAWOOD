(() => {
  "use strict";
  const ROLE_INFO = {"HELPER": {"brief": "Atención inicial, orientación y recepción de reportes.", "target": "#rango-helper"}, "HELPER+": {"brief": "Atención reforzada y acompañamiento de HELPER.", "target": "#rango-helper-plus"}, "GULA": {"brief": "Apoyo de formación y autorización limitada de baneos por IP.", "target": "#rango-gula"}, "ACEDIA": {"brief": "Formación inicial de los rangos menores.", "target": "#rango-acedia"}, "CUSTOS": {"brief": "Supervisa a los OPERADORES MENORES.", "target": "#rango-custos"}, "CODICIA": {"brief": "Control de reincidencias y sanciones de mayor peso.", "target": "#rango-codicia"}, "LIVOR": {"brief": "Canal interno para reportes sobre supervisores.", "target": "#rango-livor"}, "EROS": {"brief": "Intervención sensible y comunicación cuidadosa.", "target": "#rango-eros"}, "IRA": {"brief": "Respuesta firme ante incidentes intensos.", "target": "#rango-ira"}, "SUPERBIA": {"brief": "Formación avanzada de OPERADORES MEDIOS.", "target": "#rango-superbia"}, "VIRTUS": {"brief": "Supervisa OPERADORES MEDIOS y decide postulaciones a VIRTUS.", "target": "#rango-virtus"}, "AEGIS": {"brief": "ANTICHEAT oficial de ARKAWOOD; cargo exclusivo y no elegible.", "target": "#rango-aegis"}, "ELYON": {"brief": "Restauración y equilibrio — Arcángel Rafael.", "target": "#rango-elyon"}, "LUMEN": {"brief": "Formación y comunicación — Arcángel Gabriel.", "target": "#rango-lumen"}, "ORACLE": {"brief": "Investigación y discernimiento — Arcángel Uriel.", "target": "#rango-oracle"}, "OFÁN": {"brief": "Supervisa a los SUPERVISORES.", "target": "#rango-ofan"}, "QUERUBÍN": {"brief": "Audita ascensos y evalúa candidatos a OFÁN.", "target": "#rango-querubin"}, "SERAFÍN": {"brief": "Máxima autoridad de Moderación.", "target": "#rango-serafin"}, "BUILDER": {"brief": "Constructor oficial de la rama.", "target": "#rango-builder"}, "BUILDER+": {"brief": "Constructor avanzado.", "target": "#rango-builder-plus"}, "ARQUITECTO": {"brief": "Diseña y coordina proyectos.", "target": "#rango-arquitecto"}, "GÉNESIS": {"brief": "Máxima autoridad de Builders.", "target": "#rango-genesis"}, "ASISTENTE": {"brief": "Apoyo documental y organizativo.", "target": "#rango-asistente"}, "GESTOR": {"brief": "Seguimiento de solicitudes y bugs.", "target": "#rango-gestor"}, "TESORERO": {"brief": "Soporte de pagos y entregas.", "target": "#rango-tesorero"}, "AUDITOR": {"brief": "Control interno y reportes delicados.", "target": "#rango-auditor"}, "CANCILLER": {"brief": "Políticas, acuerdos y asuntos institucionales.", "target": "#rango-canciller"}, "ADMINISTRADOR GENERAL": {"brief": "Máxima autoridad de Administración.", "target": "#rango-administrador-general"}, "COLABORADOR": {"brief": "Apoyo externo para proyectos concretos.", "target": "#rango-colaborador"}, "MARKETING": {"brief": "Publicidad, difusión y campañas.", "target": "#rango-marketing"}, "JEFE DE MARKETING": {"brief": "Producción de contenido y coordinación creativa para la comunidad.", "target": "#rango-jefe-de-marketing"}, "INVERSOR": {"brief": "Financiación de proyectos autorizados.", "target": "#rango-inversor"}, "SOCIO": {"brief": "Alianza estratégica externa.", "target": "#rango-socio"}, "COORDINADOR": {"brief": "Responsable interno de Colaboradores.", "target": "#rango-coordinador"}, "PRIMADO": {"brief": "Representación de las cabezas de rama.", "target": "#rango-primado"}, "NEXUS": {"brief": "Autoridad técnica de infraestructura.", "target": "#rango-nexus"}, "ARCONTE": {"brief": "Coordinación ejecutiva de la Network.", "target": "#rango-arconte"}, "CO-OWNER": {"brief": "Copropiedad y dirección estratégica compartida.", "target": "#rango-co-owner"}, "OWNER": {"brief": "Propiedad y autoridad máxima de ARKAWOOD.", "target": "#rango-owner"}};
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
      let p=node.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (skip.has(p.tagName) || p.closest(".audit-role-ref,.audit-role-tooltip,.audit-anchor,.audit-color-line")) return NodeFilter.FILTER_REJECT;
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
    const r=el.getBoundingClientRect(); const tw=tooltip.offsetWidth || 300; const th=tooltip.offsetHeight || 100;
    let left=r.left+r.width/2-tw/2; left=Math.max(12,Math.min(window.innerWidth-tw-12,left));
    let top=r.top-th-12; if(top<12) top=r.bottom+12;
    tooltip.style.left=left+"px"; tooltip.style.top=top+"px";
  };
  const hide=()=>{tooltip.classList.remove("is-visible");tooltip.setAttribute("aria-hidden","true");};
  root.addEventListener("mouseover",e=>{const el=e.target.closest(".audit-role-ref"); if(el) show(el);});
  root.addEventListener("mouseout",e=>{if(e.target.closest(".audit-role-ref")) hide();});
  root.addEventListener("focusin",e=>{const el=e.target.closest(".audit-role-ref"); if(el) show(el);});
  root.addEventListener("focusout",e=>{if(e.target.closest(".audit-role-ref")) hide();});
  root.addEventListener("click",e=>{const el=e.target.closest(".audit-role-ref"); if(!el) return; const info=ROLE_INFO[el.dataset.role]; if(info?.target && document.querySelector(info.target)){ history.replaceState(null,"",info.target); }});
})();

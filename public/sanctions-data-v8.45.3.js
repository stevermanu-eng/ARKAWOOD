(() => {
  'use strict';

  const STEVE_AVATAR = '/assets/minecraft-player-steve-v8.31.0.png';
  const AEGIS_AVATAR = '/assets/aegis-anticheat-v8.44.1.webp';

  const STAFF_ROLE_NAMES = [
    'DEIDAD','CO-OWNER','ADMINISTRADOR GENERAL','ADMINISTRADOR','COORDINADOR','DEVELOPER','JEFE DE MODALIDAD',
    'SERAFÍN','QUERUBÍN','OFÁN','ORACLE','LUMEN','ELYON','MALVEN','VORIEN','SABLE','INVAR','VEXEN','NEMIS','ZELUM',
    'GÉNESIS','AK','SENIOR BUILDER','BUILDER+','BUILDER',
    'INVERSIONISTA','PARTNER','COLABORADOR',
    'JEFE MARKETING','COMMUNITY MANAGER','CONTENT CREATOR','MARKETING','INFLUENCER','STREAMER','CREADOR'
  ];
  const roleStyles = Object.fromEntries(STAFF_ROLE_NAMES.map((role) => [role, { colors:['#8B6F47','#D4A63A'], text:'#FFF7E9' }]));
  // AEGIS aparece aquí únicamente como sistema automático de anticheat, no como rango oficial de staff.
  roleStyles.AEGIS = { colors:['#E4E7EC','#7896B8'], text:'#18212D' };
  roleStyles.DEFAULT = { colors:['#4D4338','#736352'], text:'#FFF8ED' };

  const staffDirectory = [
    { id:'staff-aegis', name:'AEGIS', role:'AEGIS', avatar:AEGIS_AVATAR, webProfileId:null },
    { id:'staff-serafin-noctis', name:'Noctis', role:'SERAFÍN', avatar:null, webProfileId:null },
    { id:'staff-querubin-aster', name:'Aster', role:'QUERUBÍN', avatar:null, webProfileId:null },
    { id:'staff-zelum-kael', name:'Kael', role:'ZELUM', avatar:null, webProfileId:null },
    { id:'staff-stever-manu', name:'stever_manu', role:'DEIDAD', avatar:null, webProfileId:'1290118757888294912' },
    { id:'staff-nemis-riven', name:'Riven', role:'NEMIS', avatar:null, webProfileId:null },
    { id:'staff-admin-general-varek', name:'Varek', role:'ADMINISTRADOR GENERAL', avatar:null, webProfileId:null },
    { id:'staff-builder-atria', name:'Atria', role:'BUILDER', avatar:null, webProfileId:null },
    { id:'staff-coordinador-elys', name:'Elys', role:'COORDINADOR', avatar:null, webProfileId:null },
    { id:'staff-elyon-merea', name:'Merea', role:'ELYON', avatar:null, webProfileId:null }
  ];

  const players = {
    calzoski_111:{ uuid:'ec70bcaf-702f-4bb8-b48d-276fa52a780c', avatar:STEVE_AVATAR, webProfileId:null },
    Pablitense:{ uuid:'575c7c9a-c55c-4bac-8d28-4058b135655e', avatar:STEVE_AVATAR, webProfileId:null },
    JuanDiMinecraft:{ uuid:'f4ca2d65-7a5e-4ac1-98c1-6df9a5c3130d', avatar:STEVE_AVATAR, webProfileId:null },
    Anakin777:{ uuid:'43c88afe-1f35-49d4-ad6b-c7a6045e61c1', avatar:STEVE_AVATAR, webProfileId:null },
    Frxchus:{ uuid:'28c5936c-7123-46db-9ada-282f6b28d969', avatar:STEVE_AVATAR, webProfileId:null },
    Revu:{ uuid:'f8a59cae-06d7-4ca7-9cb1-244b7176ab69', avatar:STEVE_AVATAR, webProfileId:null },
    stevecraftX:{ uuid:'ea43fcba-0fef-4496-b10f-53067eeeb157', avatar:STEVE_AVATAR, webProfileId:null },
    LunariaMC:{ uuid:'8249d439-bf2d-48a8-9b05-1b14966de642', avatar:STEVE_AVATAR, webProfileId:null },
    SkyVortex:{ uuid:'55008391-5b74-4f68-945b-91c27ce1bd92', avatar:STEVE_AVATAR, webProfileId:null },
    Mafersita:{ uuid:'4428d42e-ec7a-4bd6-aab0-e40a90a0a48b', avatar:STEVE_AVATAR, webProfileId:null },
    NovaBlade:{ uuid:'db0ead25-00a2-429e-a4ce-9b5267dcf87d', avatar:STEVE_AVATAR, webProfileId:null },
    DarkCoal:{ uuid:'9ab1b97b-9a63-44bc-885c-0cdb18405c1b', avatar:STEVE_AVATAR, webProfileId:null }
  };

  const staffById = Object.fromEntries(staffDirectory.map((staff) => [staff.id, staff]));
  const playerData = (name) => ({ name, ...(players[name] || { uuid:'00000000-0000-0000-0000-000000000000', avatar:STEVE_AVATAR, webProfileId:null }) });

  const sanctions = [
    {id:'SC-AK-20260809-7FQ4PA91', player:playerData('calzoski_111'), type:'BAN', status:'Activa', source:'CONSOLE', reason:'Uso de KillAura y Reach detectado en combate competitivo.', context:'El sistema AEGIS registró múltiples flags consecutivas de KillAura y Reach en una ventana de 9 minutos. La revisión técnica confirmó patrones incompatibles con juego legítimo.', consoleLog:'AEGIS/PVP: KILLAURA confidence=0.97 · REACH avg=4.12 · samples=46 · correlation=0.94', duration:'30 días', createdAt:'2026-08-09T19:42:00-05:00', expiresAt:'2026-09-08T19:42:00-05:00', staffId:'staff-aegis'},
    {id:'SC-AK-20260809-B2HC8Q5V', player:playerData('Pablitense'), type:'WARN', status:'Histórica', source:'STAFF', reason:'Lenguaje tóxico en chat global.', context:'Advertencia formal por insultos repetidos en conversación pública y escalamiento del conflicto tras intervención del staff.', duration:'Advertencia', createdAt:'2026-08-09T16:15:00-05:00', expiresAt:null, staffId:'staff-serafin-noctis'},
    {id:'SC-AK-20260808-HF98CK2M', player:playerData('JuanDiMinecraft'), type:'MUTE', status:'Activa', source:'STAFF', reason:'Spam reiterado de enlaces no autorizados.', context:'El usuario envió enlaces externos repetidamente ignorando el aviso inicial. El mute se aplicó para proteger el chat de publicidad no permitida.', duration:'12 horas', createdAt:'2026-08-08T22:11:00-05:00', expiresAt:'2026-08-09T10:11:00-05:00', staffId:'staff-querubin-aster'},
    {id:'SC-AK-20260808-KL42W0ET', player:playerData('Anakin777'), type:'KICK', status:'Histórica', source:'STAFF', reason:'Flood de comandos y desconexión del lobby.', context:'Expulsión preventiva para estabilizar el servidor después de una secuencia intensa de comandos y reconexiones rápidas.', duration:'Instantánea', createdAt:'2026-08-08T19:30:00-05:00', expiresAt:null, staffId:'staff-zelum-kael'},
    {id:'SC-AK-20260808-LQ29DP6S', player:playerData('Frxchus'), type:'BLACKLIST', status:'Activa', source:'STAFF', reason:'Distribución de cuentas comprometidas y evasión de sanciones.', context:'El caso fue escalado por varios intentos de evasión y coincidencias con cuentas previamente bloqueadas. Se aplicó blacklist indefinida.', duration:'Permanente', createdAt:'2026-08-08T15:47:00-05:00', expiresAt:null, staffId:'staff-stever-manu'},
    {id:'SC-AK-20260807-N2YV1M8R', player:playerData('Revu'), type:'MUTE', status:'Histórica', source:'STAFF', reason:'Provocaciones constantes tras advertencia del staff.', context:'El usuario continuó alterando el chat después de la intervención de moderación. Se aplicó silencio temporal.', duration:'2 horas', createdAt:'2026-08-07T21:08:00-05:00', expiresAt:'2026-08-07T23:08:00-05:00', staffId:'staff-nemis-riven'},
    {id:'SC-AK-20260807-Q1D4UX0C', player:playerData('stevecraftX'), type:'BAN', status:'Activa', source:'STAFF', reason:'Uso de X-Ray confirmado por revisión de minería.', context:'La traza de minería y la relación de materiales hallados mostraron un patrón claro de localización ilegítima de minerales.', duration:'14 días', createdAt:'2026-08-07T18:55:00-05:00', expiresAt:'2026-08-21T18:55:00-05:00', staffId:'staff-admin-general-varek'},
    {id:'SC-AK-20260807-Y9M5RX1L', player:playerData('LunariaMC'), type:'WARN', status:'Histórica', source:'STAFF', reason:'Construcción inapropiada en parcela comunitaria.', context:'Advertencia administrativa por estructura ofensiva en terreno compartido. La construcción fue retirada.', duration:'Advertencia', createdAt:'2026-08-07T11:32:00-05:00', expiresAt:null, staffId:'staff-builder-atria'},
    {id:'SC-AK-20260806-V7PA1NT4', player:playerData('SkyVortex'), type:'BAN', status:'Activa', source:'CONSOLE', reason:'AutoClicker detectado en eventos PvP.', context:'Las pulsaciones registradas mostraron frecuencia y estabilidad anómalas junto con consistencia imposible para interacción manual.', consoleLog:'AEGIS/INPUT: CPS=19.8 · deviation=0.11 · interval_pattern=stable · samples=128', duration:'7 días', createdAt:'2026-08-06T23:26:00-05:00', expiresAt:'2026-08-13T23:26:00-05:00', staffId:'staff-aegis'},
    {id:'SC-AK-20260806-D6CA3EW2', player:playerData('Mafersita'), type:'KICK', status:'Histórica', source:'STAFF', reason:'Nick reportado como ofensivo; se solicitó cambio.', context:'Se expulsó temporalmente del servidor para forzar revisión del nickname y evitar reincidencia mientras se tramitaba el reporte.', duration:'Instantánea', createdAt:'2026-08-06T20:14:00-05:00', expiresAt:null, staffId:'staff-coordinador-elys'},
    {id:'SC-AK-20260805-A0RM4GP3', player:playerData('NovaBlade'), type:'MUTE', status:'Activa', source:'STAFF', reason:'Toxicidad y acoso reiterado a otros jugadores.', context:'El historial de chat evidenció hostigamiento continuo incluso tras una advertencia previa del staff.', duration:'24 horas', createdAt:'2026-08-05T17:50:00-05:00', expiresAt:'2026-08-06T17:50:00-05:00', staffId:'staff-serafin-noctis'},
    {id:'SC-AK-20260805-C3JD9TE8', player:playerData('DarkCoal'), type:'WARN', status:'Histórica', source:'STAFF', reason:'Nombres inapropiados en mascotas del servidor.', context:'Advertencia menor por uso de nombres ofensivos en entidades domesticadas visibles al público.', duration:'Advertencia', createdAt:'2026-08-05T13:09:00-05:00', expiresAt:null, staffId:'staff-elyon-merea'}
  ].map((item) => ({ ...item, staff:staffById[item.staffId] }));

  const typeLabels = { BAN:'BAN', MUTE:'MUTE', KICK:'KICK', WARN:'WARN', BLACKLIST:'BLACKLIST' };

  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function formatDate(value){
    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date);
  }
  function initials(value){
    const parts = String(value || '').trim().split(/\s+/).filter(Boolean).slice(0,2);
    return (parts.map((part) => part[0]).join('') || '??').toUpperCase();
  }
  function roleStyle(role){ return roleStyles[role] || roleStyles.DEFAULT; }
  function roleBadge(role){
    const style = roleStyle(role);
    const gradient = `linear-gradient(90deg,${style.colors.join(',')})`;
    return `<span class="sanctions-role-badge" style="--role-bg:${gradient};--role-text:${style.text};">${escapeHtml(role || 'STAFF')}</span>`;
  }
  function playerUrl(player){ return `/sanciones/usuario/?jugador=${encodeURIComponent(player.uuid || player.name)}`; }
  function staffUrl(staff){ return `/sanciones/staff/?staff=${encodeURIComponent(staff.id || staff.name)}`; }
  function detailUrl(item){ return `/sanciones/detalle/?id=${encodeURIComponent(item.id)}`; }
  function findSanction(id){ return sanctions.find((item) => item.id === String(id || '')) || null; }
  function findStaff(value){
    const q = String(value || '').toLowerCase();
    return staffDirectory.find((staff) => staff.id.toLowerCase() === q || staff.name.toLowerCase() === q) || null;
  }
  function findPlayer(value){
    const q = String(value || '').toLowerCase().replace(/[{}]/g,'');
    const entries = Object.values(players).map((data) => data);
    for(const [name,data] of Object.entries(players)){
      if(name.toLowerCase() === q || data.uuid.toLowerCase() === q) return { name, ...data };
      if(data.uuid.replace(/-/g,'').toLowerCase() === q.replace(/-/g,'')) return { name, ...data };
    }
    return null;
  }
  function sanctionsForPlayer(player){
    if(!player) return [];
    const uuid = String(player.uuid || '').toLowerCase();
    const name = String(player.name || '').toLowerCase();
    return sanctions.filter((item) => item.player.uuid.toLowerCase() === uuid || item.player.name.toLowerCase() === name);
  }
  function sanctionsForStaff(staff){
    if(!staff) return [];
    return sanctions.filter((item) => item.staff.id === staff.id);
  }
  function staffStats(){
    return staffDirectory.map((staff) => {
      const items = sanctionsForStaff(staff);
      const types = { BAN:0, MUTE:0, KICK:0, WARN:0, BLACKLIST:0 };
      items.forEach((item) => { types[item.type] = (types[item.type] || 0) + 1; });
      const active = items.filter((item) => item.status === 'Activa').length;
      const recent = items.filter((item) => (Date.now() - new Date(item.createdAt).getTime()) <= 7*24*60*60*1000).length;
      const last = [...items].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt))[0] || null;
      return { staff, total:items.length, active, recent, types, last };
    }).sort((a,b) => b.total-a.total || a.staff.name.localeCompare(b.staff.name));
  }

  window.ARKA_SANCTIONS = {
    sanctions, staffDirectory, players, roleStyles, typeLabels,
    escapeHtml, formatDate, initials, roleBadge, roleStyle,
    playerUrl, staffUrl, detailUrl, findSanction, findStaff, findPlayer,
    sanctionsForPlayer, sanctionsForStaff, staffStats,
    STEVE_AVATAR, AEGIS_AVATAR
  };
})();

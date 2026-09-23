/* X Burguer Central V19 — core, estado e impressão gerenciada */
function icon(name,extra=''){
  return `<i class="bi bi-${name} ${extra}" aria-hidden="true"></i>`;
}

function applyTheme(mode){
  const theme = mode === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-bs-theme',theme);
  try{localStorage.setItem('xburguer_theme',theme)}catch(e){}
  const icon=document.getElementById('themeIcon');
  const btn=document.getElementById('themeToggle');
  if(icon){icon.className=theme==='dark'?'bi bi-sun':'bi bi-moon-stars';}
  if(btn){
    btn.title=theme==='dark'?'Ativar modo claro':'Ativar modo escuro';
    btn.setAttribute('aria-label',btn.title);
  }
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content',theme==='dark'?'#0b1220':'#2563eb');
}
function toggleTheme(){
  const current=document.documentElement.getAttribute('data-bs-theme')||'light';
  applyTheme(current==='dark'?'light':'dark');
}
function initThemeUI(){
  applyTheme(document.documentElement.getAttribute('data-bs-theme')||'light');
}

const APP_VERSION='19.0.0';
const SCHEMA_VERSION=8;
const LOGO='assets/img/logo.png';
const STORAGE='xburguer_gestor_pro_v3';
const BACKUP_PREFIX='xburguer_backup_';
const MAX_IMPORT_BYTES=5*1024*1024;
const SAFE_ID=/^[A-Za-z0-9._:-]{1,96}$/;
const ORDER_STATUSES=new Set(['analysis','production','ready','done','cancelled']);
const ORDER_TYPES=new Set(['Balcão','Retirada','Delivery','Mesa']);
const now=()=>new Date();
const isoAgo=m=>new Date(Date.now()-m*60000).toISOString();
const money=v=>(Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const uid=p=>p+(globalThis.crypto?.randomUUID?.().replace(/-/g,'').slice(0,10)||Math.random().toString(36).slice(2,12));
function defaultState(){return {schemaVersion:SCHEMA_VERSION,
 settings:{storeName:'X Burguer',storeOpen:true,autoAccept:false,deliveryMin:'10 a 60 min',counterMin:'15 a 35 min',deliveryFee:7,serviceFee:10,city:'Goianésia - GO',phone:'(62) 99999-9999',cashback:3,loyalty:true,
 printing:{
  enabled:true,
  orientation:'portrait',
  density:'compact',
  fontScale:'normal',
  strongText:true,
  showLogo:false,
  footer:'Obrigado pela preferência!',
  agent:{enabled:true,url:'http://127.0.0.1:17871',token:'',pairedAt:'',fallbackBrowser:false,lastSeen:'',lastVersion:''},
  profiles:[
   {id:'print-counter',name:'Balcão / Caixa',purpose:'receipt',paper:'80mm',copies:1,enabled:true,station:'all',autoEvents:[],deviceName:''},
   {id:'print-kitchen',name:'Cozinha',purpose:'kitchen',paper:'80mm',copies:1,enabled:true,station:'all',autoEvents:[],deviceName:''},
   {id:'print-delivery',name:'Expedição / Delivery',purpose:'delivery',paper:'80mm',copies:1,enabled:true,station:'all',autoEvents:[],deviceName:''}
  ]
 }},
 categories:[
  {id:'cat1',name:'Ofertas e Promoções'},{id:'cat2',name:'Combos'},{id:'cat3',name:'Sanduíches Fitness'},{id:'cat4',name:'Sanduíches Tradicionais'},{id:'cat5',name:'Sanduíches Gourmet'},{id:'cat6',name:'Porções'},{id:'cat7',name:'Bebidas'}],
 products:[
  {id:'p1',cat:'cat1',name:'Porção especial + 3 Chopps',price:51.90,emoji:'🍟',active:true,sold:false,stock:20,min:5,cost:24.5},
  {id:'p2',cat:'cat1',name:'Light Gourmet + Batata 150g + Refri lata',price:37,emoji:'🍔',active:true,sold:false,stock:25,min:6,cost:16.2},
  {id:'p3',cat:'cat1',name:'Tudo + Fritas 150g + Coca-Cola 350ml',price:37,emoji:'🍔',active:true,sold:false,stock:18,min:5,cost:15.8},
  {id:'p4',cat:'cat2',name:'Combo Casal X Burguer',price:69.90,emoji:'🍔',active:true,sold:false,stock:14,min:4,cost:29.2},
  {id:'p5',cat:'cat3',name:'X-Frango Fit',price:26.90,emoji:'🥪',active:true,sold:false,stock:12,min:4,cost:11.4},
  {id:'p6',cat:'cat4',name:'X-Bacon',price:28.90,emoji:'🥓',active:true,sold:false,stock:32,min:8,cost:12.8},
  {id:'p7',cat:'cat4',name:'X-Tudo',price:31.90,emoji:'🍔',active:true,sold:false,stock:30,min:8,cost:14.1},
  {id:'p8',cat:'cat5',name:'X-Gourmet da Casa',price:35.90,emoji:'🍔',active:true,sold:false,stock:9,min:5,cost:16.9},
  {id:'p9',cat:'cat6',name:'Batata Frita 300g',price:22,emoji:'🍟',active:true,sold:false,stock:40,min:10,cost:7.4},
  {id:'p10',cat:'cat6',name:'Porção de Tilápia',price:49.90,emoji:'🐟',active:true,sold:false,stock:7,min:4,cost:23.7},
  {id:'p11',cat:'cat7',name:'Coca-Cola 350ml',price:6,emoji:'🥤',active:true,sold:false,stock:48,min:12,cost:3.2},
  {id:'p12',cat:'cat7',name:'Chope 300ml',price:9,emoji:'🍺',active:true,sold:false,stock:60,min:15,cost:3.8}
 ],
 customers:[
  {id:'c1',name:'Raniel Candido',phone:'(62) 99986-6663',address:'Ipe, 254 - Entre a 30 e 32'},{id:'c2',name:'Clara',phone:'(62) 98189-3113',address:'Pouso Alegre, 07 - Casa'},{id:'c3',name:'Marcos Silva',phone:'(62) 99111-2222',address:'Rua 15, Setor Central'},{id:'c4',name:'Ana Paula',phone:'(62) 99222-3333',address:'Av. Goiás, 408'}
 ],
 orders:[
  {id:'77552',type:'Mesa',table:'Mesa 6',customer:'Não identificado',phone:'',address:'',payment:'Não registrado',status:'production',createdAt:isoAgo(42),items:[{p:'p7',q:2,price:31.9},{p:'p12',q:2,price:9}],notes:'',courier:'',scheduled:false},
  {id:'77564',type:'Delivery',table:'',customer:'Marcos Silva',phone:'(62) 99111-2222',address:'Rua 15, Setor Central',payment:'PIX',status:'production',createdAt:isoAgo(16),items:[{p:'p6',q:1,price:28.9},{p:'p9',q:1,price:22}],notes:'Sem cebola',courier:'',scheduled:false},
  {id:'77540',type:'Delivery',table:'',customer:'Raniel Candido',phone:'(62) 99986-6663',address:'Ipe, 254 - Entre a 30 e 32',payment:'Cartão (Débito)',status:'ready',createdAt:isoAgo(55),items:[{p:'p7',q:2,price:31.9},{p:'p11',q:2,price:6}],notes:'',courier:'d1',scheduled:false},
  {id:'77549',type:'Delivery',table:'',customer:'Clara',phone:'(62) 98189-3113',address:'Pouso Alegre, 07 - Casa',payment:'Dinheiro',status:'ready',createdAt:isoAgo(28),items:[{p:'p4',q:1,price:69.9},{p:'p11',q:1,price:6}],notes:'Troco para 100',courier:'',scheduled:false},
  {id:'77566',type:'Balcão',table:'',customer:'Ana Paula',phone:'(62) 99222-3333',address:'',payment:'PIX',status:'analysis',createdAt:isoAgo(3),items:[{p:'p2',q:1,price:37}],notes:'Retirada no balcão',courier:'',scheduled:false},
  {id:'77501',type:'Delivery',table:'',customer:'João',phone:'(62) 98888-1212',address:'Setor Sul',payment:'PIX',status:'done',createdAt:isoAgo(180),items:[{p:'p6',q:2,price:28.9}],notes:'',courier:'d2',scheduled:false}
 ],
 diningAreas:[{id:'area-salao',name:'Salão principal'},{id:'area-varanda',name:'Varanda'},{id:'area-balcao',name:'Balcão'}],
 tables:Array.from({length:13},(_,i)=>({id:'t'+(i+1),name:'Mesa '+(i+1),status:[0,2,5].includes(i)?'busy':i===9?'closing':'free',area:'area-salao',seats:4,guests:0,server:'',order:i})).concat([
  {id:'b1',name:'Balcão',status:'free',area:'area-balcao',seats:2,guests:0,server:'',order:0},
  {id:'b2',name:'Balcão 2',status:'free',area:'area-balcao',seats:2,guests:0,server:'',order:1},
  {id:'b3',name:'Balcão 3',status:'free',area:'area-balcao',seats:2,guests:0,server:'',order:2}
 ]),
 couriers:[{id:'d1',name:'Diego',phone:'(62) 99777-1111',vehicle:'Motocicleta',active:true,deliveries:12},{id:'d2',name:'Carlos',phone:'(62) 99666-2222',vehicle:'Motocicleta',active:true,deliveries:9},{id:'d3',name:'Luan',phone:'(62) 99555-3333',vehicle:'Bicicleta',active:false,deliveries:5}],
 cash:{open:true,openedAt:isoAgo(240),opening:0,movements:[{id:'m1',type:'suprimento',value:100,desc:'Troco inicial',at:isoAgo(230)}],history:[]},
 promos:[{id:'pr1',name:'Cupom XB10',type:'Cupom',value:'10%',active:true},{id:'pr2',name:'Cashback padrão',type:'Cashback',value:'3%',active:true},{id:'pr3',name:'Fidelidade 8 pedidos',type:'Fidelidade',value:'1 recompensa',active:true}],
 finance:[{id:'f1',kind:'pay',desc:'Fornecedor de bebidas',value:720,due:'2026-09-25',paid:false},{id:'f2',kind:'pay',desc:'Fornecedor de carnes',value:1280,due:'2026-09-27',paid:false},{id:'f3',kind:'receive',desc:'Vendas cartão D+1',value:1860,due:'2026-09-23',paid:false}],
 team:[{id:'u1',name:'Administrador',role:'Administrador',active:true},{id:'u2',name:'Caixa 01',role:'Caixa',active:true},{id:'u3',name:'Garçom João',role:'Garçom',active:true},{id:'u4',name:'Cozinha',role:'KDS',active:true}],
 chats:[{id:'w1',name:'Patrícia',phone:'(62) 99444-1212',messages:[['c','Oi, gostaria de ver o cardápio'],['b','Olá! 👋 Aqui está o cardápio digital da X Burguer. Posso te ajudar com seu pedido?']],unread:1}],
 inventoryMovements:[],
 printOutbox:[]
}}
let state;
let currentPage='pedidos';
let orderFilter='all';let orderSearch='';let selectedCat='cat1';let pdvCat='all';let pdvCart=[];let pdvType='Balcão';let pdvDraftTable='';let pdvEditingId='';let pdvCustomerDraft='';let pdvPayDraft='PIX';let salaoTab='mesas';let chatId='w1';let performanceRange='today';let kdsStation='all';
function mergeDefaults(base,value){
 if(Array.isArray(base)) return Array.isArray(value)?value:base;
 if(base&&typeof base==='object'){const out={...base};if(value&&typeof value==='object'&&!Array.isArray(value))Object.keys(value).forEach(k=>out[k]=k in base?mergeDefaults(base[k],value[k]):value[k]);return out}
 return value===undefined||value===null?base:value;
}
function pruneSnapshots(limit=6){
 try{
  const keys=[];
  for(let i=0;i<localStorage.length;i++){
   const key=localStorage.key(i);
   if(key?.startsWith(BACKUP_PREFIX))keys.push(key);
  }
  keys.sort((a,b)=>(Number(b.split('_').at(-1))||0)-(Number(a.split('_').at(-1))||0));
  keys.slice(limit).forEach(key=>localStorage.removeItem(key));
 }catch(e){console.warn('Não foi possível limpar snapshots antigos',e)}
}
function snapshotLocal(label='manual'){
 try{
  const raw=localStorage.getItem(STORAGE);
  if(raw)localStorage.setItem(BACKUP_PREFIX+label+'_'+Date.now(),raw);
  pruneSnapshots();
 }catch(e){console.warn('Não foi possível criar snapshot local',e)}
}
function validateState(candidate){
 if(!candidate||typeof candidate!=='object')return 'Estado inválido.';
 const required=['orders','products','categories','tables','couriers','promos','finance','team','chats','customers','diningAreas','inventoryMovements','printOutbox'];
 for(const key of required)if(!Array.isArray(candidate[key]))return 'Coleção inválida: '+key+'.';
 const idGroups=[candidate.orders,candidate.products,candidate.categories,candidate.tables,candidate.couriers,candidate.promos,candidate.finance,candidate.team,candidate.chats,candidate.customers,candidate.diningAreas,candidate.inventoryMovements,candidate.printOutbox];
 for(const group of idGroups){
  const seen=new Set();
  for(const item of group){
   if(!item||!SAFE_ID.test(String(item.id||'')))return 'Identificador inválido encontrado.';
   if(seen.has(item.id))return 'Identificador duplicado encontrado: '+item.id+'.';
   seen.add(item.id);
  }
 }
 const tableNames=new Set();
 for(const table of candidate.tables){
  const name=String(table.name||'').trim().toLowerCase();
  if(!name)return 'Existe mesa sem nome.';
  if(tableNames.has(name))return 'Existem mesas com o mesmo nome.';
  tableNames.add(name);
 }
 const cats=new Set(candidate.categories.map(c=>c.id));
 if(candidate.products.some(p=>!cats.has(p.cat)))return 'Existe produto ligado a uma categoria inexistente.';
 const productIds=new Set(candidate.products.map(p=>p.id));
 if(candidate.inventoryMovements.some(m=>!productIds.has(m.productId)))return 'Existe movimentação ligada a produto inexistente.';
 const customerIds=new Set(candidate.customers.map(c=>c.id));
 if(candidate.orders.some(o=>o.customerId&&!customerIds.has(o.customerId)))return 'Existe pedido ligado a cliente inexistente.';
 if(candidate.orders.some(o=>!ORDER_STATUSES.has(o.status)))return 'Existe pedido com status inválido.';
 if(candidate.orders.some(o=>!ORDER_TYPES.has(o.type)))return 'Existe pedido com tipo inválido.';
 if(candidate.tables.some(t=>String(t.name||'').length>120)||candidate.products.some(p=>String(p.name||'').length>180)||candidate.categories.some(cat=>String(cat.name||'').length>120))return 'Há textos estruturais acima do limite permitido.';
 return '';
}
function normalize(){
 const d=defaultState();
 state=mergeDefaults(d,state||{});
 ['orders','products','categories','tables','couriers','promos','finance','team','chats','customers','diningAreas','inventoryMovements','printOutbox'].forEach(k=>{if(!Array.isArray(state[k]))state[k]=[]});
 if(!state.diningAreas.length)state.diningAreas=d.diningAreas.map(x=>({...x}));
 if(!state.cash||typeof state.cash!=='object')state.cash=d.cash;
 if(!Array.isArray(state.cash.movements))state.cash.movements=[];
 if(!Array.isArray(state.cash.history))state.cash.history=[];
 const printDefaults=d.settings.printing;
 const migratingPrintV18=Number(state.schemaVersion||0)<7;
 const migratingPrintV19=Number(state.schemaVersion||0)<8;
 if(!state.settings.printing||typeof state.settings.printing!=='object'||Array.isArray(state.settings.printing))state.settings.printing={...printDefaults,profiles:printDefaults.profiles.map(p=>({...p,autoEvents:[...(p.autoEvents||[])]}))};
 const legacyKitchenAuto=Boolean(state.settings.printing.openKitchenOnAccept);
 const legacyReceiptAuto=Boolean(state.settings.printing.openReceiptOnSave);
 state.settings.printing.enabled=state.settings.printing.enabled!==false;
 state.settings.printing.orientation='portrait';
 state.settings.printing.density=['compact','comfortable'].includes(state.settings.printing.density)?state.settings.printing.density:'compact';
 state.settings.printing.fontScale=['small','normal','large'].includes(state.settings.printing.fontScale)?state.settings.printing.fontScale:'normal';
 state.settings.printing.strongText=state.settings.printing.strongText!==false;
 state.settings.printing.showLogo=migratingPrintV18?false:Boolean(state.settings.printing.showLogo);
 state.settings.printing.footer=String(state.settings.printing.footer??printDefaults.footer).slice(0,180);
 if(!state.settings.printing.agent||typeof state.settings.printing.agent!=='object'||Array.isArray(state.settings.printing.agent))state.settings.printing.agent={...printDefaults.agent};
 state.settings.printing.agent.enabled=state.settings.printing.agent.enabled!==false;
 const candidateAgentUrl=String(state.settings.printing.agent.url||printDefaults.agent.url).trim().slice(0,180);state.settings.printing.agent.url=/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d{1,5})?$/.test(candidateAgentUrl)?candidateAgentUrl:printDefaults.agent.url;
 state.settings.printing.agent.token=String(state.settings.printing.agent.token||'').trim().slice(0,160);
 state.settings.printing.agent.pairedAt=String(state.settings.printing.agent.pairedAt||'').slice(0,40);
 state.settings.printing.agent.fallbackBrowser=Boolean(state.settings.printing.agent.fallbackBrowser);
 state.settings.printing.agent.lastSeen=String(state.settings.printing.agent.lastSeen||'').slice(0,40);
 state.settings.printing.agent.lastVersion=String(state.settings.printing.agent.lastVersion||'').slice(0,40);
 if(!Array.isArray(state.settings.printing.profiles)||!state.settings.printing.profiles.length)state.settings.printing.profiles=printDefaults.profiles.map(p=>({...p,autoEvents:[...(p.autoEvents||[])]}));
 const allowedPurpose=new Set(['receipt','kitchen','delivery']),allowedPaper=new Set(['58mm','80mm','a4']),allowedEvents=new Set(['created','production','ready','completed']);
 state.settings.printing.profiles=state.settings.printing.profiles.slice(0,16).map((p,i)=>{
  const fallback=printDefaults.profiles[i]||printDefaults.profiles[0];
  let autoEvents=Array.isArray(p?.autoEvents)?p.autoEvents.filter(e=>allowedEvents.has(e)):[];
  if(!autoEvents.length&&legacyKitchenAuto&&(p?.purpose||fallback.purpose)==='kitchen')autoEvents=['production'];
  if(!autoEvents.length&&legacyReceiptAuto&&(p?.purpose||fallback.purpose)==='receipt')autoEvents=['created'];
  return {
   id:SAFE_ID.test(String(p?.id||''))?String(p.id):uid('print-'),
   name:String(p?.name||fallback.name||'Impressora').trim().slice(0,80)||'Impressora',
   purpose:allowedPurpose.has(p?.purpose)?p.purpose:fallback.purpose,
   paper:allowedPaper.has(p?.paper)?p.paper:'80mm',
   copies:Math.min(3,Math.max(1,Number(p?.copies)||1)),
   enabled:p?.enabled!==false,
   station:String(p?.station||'all').trim().slice(0,80)||'all',
   autoEvents:[...new Set(autoEvents)],
   deviceName:String(p?.deviceName||'').trim().slice(0,180)
  };
 });
 delete state.settings.printing.openKitchenOnAccept;
 delete state.settings.printing.openReceiptOnSave;
 state.orders.forEach(o=>{
  if(!Array.isArray(o.items))o.items=[];
  o.status=ORDER_STATUSES.has(o.status)?o.status:'analysis';
  o.createdAt=o.createdAt||new Date().toISOString();
  o.customer=String(o.customer||'Não identificado');
  o.customerId=SAFE_ID.test(String(o.customerId||''))?String(o.customerId):'';
  o.type=ORDER_TYPES.has(o.type)?o.type:'Balcão';
  o.payment=String(o.payment||'Não registrado');
  o.deliveryFee=Math.max(0,Number(o.deliveryFee ?? state.settings.deliveryFee)||0);
  o.serviceFeePct=Math.max(0,Number(o.serviceFeePct ?? state.settings.serviceFee)||0);
  o.items=o.items.map(i=>{
   const pid=String(i.p||''),p=state.products.find(x=>x.id===pid);
   return {p:pid,q:Math.max(0,Number(i.q)||0),price:Math.max(0,Number(i.price)||0),cost:Math.max(0,Number(i.cost ?? p?.cost)||0)};
  }).filter(i=>i.p&&i.q>0);
 });
 const firstCat=state.categories[0]?.id||'';
 state.products.forEach(p=>{
  p.name=String(p.name||'Item').trim()||'Item';
  p.cat=state.categories.some(c=>c.id===p.cat)?p.cat:firstCat;
  p.price=Math.max(0,Number(p.price)||0);
  p.stock=Math.max(0,Number(p.stock)||0);
  p.min=Math.max(0,Number(p.min)||0);
  p.cost=Math.max(0,Number(p.cost)||0);
  p.description=String(p.description||'');
  p.station=String(p.station||'Cozinha');
  p.active=p.active!==false;
  if(p.manualSold===undefined)p.manualSold=Boolean(p.sold&&p.stock>0);
  p.manualSold=Boolean(p.manualSold);
  p.sold=Boolean(p.manualSold||p.stock<=0);
 });
 state.tables.forEach((t,i)=>{
  const counter=String(t.name||'').toLowerCase().includes('balc');
  t.name=String(t.name||('Mesa '+(i+1))).trim()||('Mesa '+(i+1));
  t.status=['free','busy','closing'].includes(t.status)?t.status:'free';
  t.area=state.diningAreas.some(a=>a.id===t.area)?t.area:(counter?'area-balcao':state.diningAreas[0]?.id);
  t.seats=Math.max(1,Number(t.seats)||(counter?2:4));
  t.guests=Math.max(0,Math.min(t.seats,Number(t.guests)||0));
  t.server=String(t.server||'');
  t.order=Number.isFinite(Number(t.order))?Number(t.order):i;
 });
 state.inventoryMovements=state.inventoryMovements.map(m=>({
  id:SAFE_ID.test(String(m?.id||''))?String(m.id):uid('im'),
  productId:String(m?.productId||''),
  delta:Number(m?.delta)||0,
  reason:String(m?.reason||'Ajuste'),
  ref:String(m?.ref||''),
  at:m?.at||new Date().toISOString(),
  balance:Math.max(0,Number(m?.balance)||0)
 })).filter(m=>m.productId&&state.products.some(p=>p.id===m.productId));
 state.printOutbox=state.printOutbox.slice(-100).map(j=>({
  id:SAFE_ID.test(String(j?.id||''))?String(j.id):uid('pj'),
  profileId:SAFE_ID.test(String(j?.profileId||''))?String(j.profileId):'',
  printerName:String(j?.printerName||'').trim().slice(0,180),
  purpose:['receipt','kitchen','delivery'].includes(j?.purpose)?j.purpose:'receipt',
  station:String(j?.station||'all').slice(0,80),
  event:String(j?.event||'manual').slice(0,40),
  paper:['58mm','80mm'].includes(j?.paper)?j.paper:'80mm',
  copies:Math.min(3,Math.max(1,Number(j?.copies)||1)),
  document:j?.document&&typeof j.document==='object'?j.document:{},
  attempts:Math.max(0,Number(j?.attempts)||0),
  createdAt:j?.createdAt||new Date().toISOString(),
  lastError:String(j?.lastError||'').slice(0,300)
 })).filter(j=>j.profileId&&j.printerName&&j.document?.id);
 if(migratingPrintV19){
  state.settings.printing.profiles.forEach(p=>{if(p.paper==='a4')p.deviceName=''});
 }
 state.schemaVersion=SCHEMA_VERSION;
}
function load(){
 const defaults=defaultState();
 let migrated=false;
 try{
  const raw=localStorage.getItem(STORAGE);
  if(raw){
   const parsed=JSON.parse(raw);
   migrated=Number(parsed?.schemaVersion||0)<SCHEMA_VERSION;
   if(migrated)snapshotLocal('pre_migration');
   state=mergeDefaults(defaults,parsed);
  }else state=defaults;
 }catch(e){
  console.error('Falha ao ler dados locais',e);
  try{const raw=localStorage.getItem(STORAGE);if(raw)localStorage.setItem(BACKUP_PREFIX+'corrompido_'+Date.now(),raw)}catch(_){}
  state=defaults;
 }
 normalize();
 const issue=validateState(state);
 if(issue){
  console.error('Estado local inconsistente:',issue);
  snapshotLocal('inconsistente');
  state=defaults;normalize();
  try{localStorage.setItem(STORAGE,JSON.stringify(state))}catch(e){console.warn('Falha ao restaurar estado padrão',e)}
 }else if(migrated){
  try{localStorage.setItem(STORAGE,JSON.stringify(state))}catch(e){console.warn('Falha ao persistir migração local',e)}
 }
}
function save(options={}){
 try{
  state.schemaVersion=SCHEMA_VERSION;
  localStorage.setItem(STORAGE,JSON.stringify(state));
  if(options.render!==false)renderAll();
  return true;
 }catch(e){
  console.error(e);
  toast('Não foi possível salvar os dados neste navegador.','error');
  return false;
 }
}
function getStorageBytes(){try{return new Blob([localStorage.getItem(STORAGE)||'']).size}catch(e){return 0}}
function exportBackup(){
 const safeState=JSON.parse(JSON.stringify(state));
 if(safeState.settings?.printing?.agent){safeState.settings.printing.agent.token='';safeState.settings.printing.agent.pairedAt='';safeState.settings.printing.agent.lastSeen=''}
 safeState.printOutbox=[];
 const payload={app:'X Burguer Central',version:APP_VERSION,schemaVersion:SCHEMA_VERSION,exportedAt:new Date().toISOString(),state:safeState};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=`xburguer-central-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Backup exportado.','success');
}
function importBackup(){
 const input=document.createElement('input');input.type='file';input.accept='application/json,.json';
 input.onchange=async()=>{
  const file=input.files?.[0];if(!file)return;
  if(file.size>MAX_IMPORT_BYTES){toast('O backup excede o limite de 5 MB.','error');return}
  const previous=state;
  try{
   const parsed=JSON.parse(await file.text()),candidate=parsed?.state||parsed;
   if(parsed?.schemaVersion&&Number(parsed.schemaVersion)>SCHEMA_VERSION)throw new Error('Backup criado por uma versão mais nova.');
   if(!candidate||typeof candidate!=='object'||!Array.isArray(candidate.orders)||!Array.isArray(candidate.products))throw new Error('Formato inválido');
   const localAgent={...(state.settings?.printing?.agent||{})};
   const next=mergeDefaults(defaultState(),candidate);
   state=next;normalize();
   if(localAgent.token){
    state.settings.printing.agent={...state.settings.printing.agent,token:localAgent.token,pairedAt:localAgent.pairedAt||'',lastSeen:localAgent.lastSeen||'',lastVersion:localAgent.lastVersion||''};
   }
   const issue=validateState(state);if(issue)throw new Error(issue);
   snapshotLocal('antes_importacao');
   save();
   toast('Backup importado com sucesso.','success');
  }catch(e){
   state=previous;
   console.error(e);
   toast('Backup inválido: '+(e.message||'formato não reconhecido')+'.','error');
  }
 };
 input.click();
}
function product(id){return state.products.find(p=>p.id===id)}
function recordStockMovement(productId,delta,reason='Ajuste',ref=''){
 const p=product(productId),amount=Number(delta)||0;
 if(!p||!amount)return;
 state.inventoryMovements.push({id:uid('im'),productId:p.id,delta:amount,reason:String(reason||'Ajuste'),ref:String(ref||''),at:new Date().toISOString(),balance:Number(p.stock)||0});
 if(state.inventoryMovements.length>1000)state.inventoryMovements=state.inventoryMovements.slice(-1000);
}
function paymentIsCash(payment){return String(payment||'').toLowerCase().includes('dinheiro')}
function orderSubtotal(o){return o.items.reduce((s,i)=>s+(Number(i.price)||0)*(Number(i.q)||0),0)}
function orderFeeTotal(o){
 const subtotal=orderSubtotal(o);
 const delivery=o.type==='Delivery'?Math.max(0,Number(o.deliveryFee ?? state.settings.deliveryFee)||0):0;
 const service=o.type==='Mesa'?subtotal*Math.max(0,Number(o.serviceFeePct ?? state.settings.serviceFee)||0)/100:0;
 return delivery+service;
}
function orderTotal(o){return orderSubtotal(o)+orderFeeTotal(o)}
function orderCost(o){return o.items.reduce((s,i)=>s+(Number(i.cost ?? product(i.p)?.cost)||0)*(Number(i.q)||0),0)}
function orderAge(o){const ts=new Date(o.createdAt).getTime();return Number.isFinite(ts)?Math.max(0,Math.floor((Date.now()-ts)/60000)):0}
function orderTime(o){const d=new Date(o.createdAt);return Number.isFinite(d.getTime())?d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'—'}
function orderItemsText(o){return o.items.map(i=>`${i.q}x ${esc(product(i.p)?.name||'Item')}`).join('<br>')}
function typeIcon(t){return t==='Delivery'?icon('scooter'):t==='Mesa'?icon('table'):t==='Balcão'?icon('shop-window'):icon('shop')}
function syncTables(){state.tables.forEach(t=>{const open=state.orders.some(o=>o.table===t.name&&!['done','cancelled'].includes(o.status));if(t.status!=='closing')t.status=open?'busy':'free'})}
function toggleStore(){state.settings.storeOpen=!state.settings.storeOpen;save();toast(state.settings.storeOpen?'Loja aberta para pedidos.':'Loja pausada para novos pedidos.')}
function setHeader(){const on=state.settings.storeOpen,toggle=document.getElementById('storeToggle');toggle?.classList.toggle('on',on);toggle?.setAttribute('aria-checked',String(on));const st=document.getElementById('storeText');if(st)st.textContent=on?'Loja aberta':'Loja fechada';const foot=document.getElementById('footStore');if(foot){foot.textContent=on?'ABERTO':'FECHADO';foot.style.background=on?'#20be6a':'#c74444'}const count=document.getElementById('sideNewCount');if(count)count.textContent=state.orders.filter(o=>o.status==='analysis').length;globalThis.updateConnectionStatus?.()}

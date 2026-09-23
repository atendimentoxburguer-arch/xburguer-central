/* X Burguer Central V11 — core */
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

const APP_VERSION='11.0.0';
const SCHEMA_VERSION=2;
const LOGO='assets/img/logo.png';
const STORAGE='xburguer_gestor_pro_v3';
const BACKUP_PREFIX='xburguer_backup_';
const now=()=>new Date();
const isoAgo=m=>new Date(Date.now()-m*60000).toISOString();
const money=v=>(Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const uid=p=>p+(globalThis.crypto?.randomUUID?.().replace(/-/g,'').slice(0,10)||Math.random().toString(36).slice(2,12));
function defaultState(){return {schemaVersion:SCHEMA_VERSION,
 settings:{storeName:'X Burguer',storeOpen:true,autoAccept:false,deliveryMin:'10 a 60 min',counterMin:'15 a 35 min',deliveryFee:7,serviceFee:10,city:'Goianésia - GO',phone:'(62) 99999-9999',cashback:3,loyalty:true},
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
 tables:Array.from({length:13},(_,i)=>({id:'t'+(i+1),name:'Mesa '+(i+1),status:[0,2,5].includes(i)?'busy':i===9?'closing':'free'})).concat([{id:'b1',name:'Balcão',status:'free'},{id:'b2',name:'Balcão 2',status:'free'},{id:'b3',name:'Balcão 3',status:'free'}]),
 couriers:[{id:'d1',name:'Diego',phone:'(62) 99777-1111',vehicle:'Motocicleta',active:true,deliveries:12},{id:'d2',name:'Carlos',phone:'(62) 99666-2222',vehicle:'Motocicleta',active:true,deliveries:9},{id:'d3',name:'Luan',phone:'(62) 99555-3333',vehicle:'Bicicleta',active:false,deliveries:5}],
 cash:{open:true,openedAt:isoAgo(240),opening:0,movements:[{id:'m1',type:'suprimento',value:100,desc:'Troco inicial',at:isoAgo(230)}],history:[]},
 promos:[{id:'pr1',name:'Cupom XB10',type:'Cupom',value:'10%',active:true},{id:'pr2',name:'Cashback padrão',type:'Cashback',value:'3%',active:true},{id:'pr3',name:'Fidelidade 8 pedidos',type:'Fidelidade',value:'1 recompensa',active:true}],
 finance:[{id:'f1',kind:'pay',desc:'Fornecedor de bebidas',value:720,due:'2026-09-25',paid:false},{id:'f2',kind:'pay',desc:'Fornecedor de carnes',value:1280,due:'2026-09-27',paid:false},{id:'f3',kind:'receive',desc:'Vendas cartão D+1',value:1860,due:'2026-09-23',paid:false}],
 team:[{id:'u1',name:'Administrador',role:'Administrador',active:true},{id:'u2',name:'Caixa 01',role:'Caixa',active:true},{id:'u3',name:'Garçom João',role:'Garçom',active:true},{id:'u4',name:'Cozinha',role:'KDS',active:true}],
 chats:[{id:'w1',name:'Patrícia',phone:'(62) 99444-1212',messages:[['c','Oi, gostaria de ver o cardápio'],['b','Olá! 👋 Aqui está o cardápio digital da X Burguer. Posso te ajudar com seu pedido?']],unread:1}]
}}
let state;
let currentPage='pedidos';
let orderFilter='all';let orderSearch='';let selectedCat='cat1';let pdvCat='all';let pdvCart=[];let pdvType='Balcão';let pdvDraftTable='';let salaoTab='mesas';let chatId='w1';let performanceRange='today';
function mergeDefaults(base,value){
 if(Array.isArray(base)) return Array.isArray(value)?value:base;
 if(base&&typeof base==='object'){const out={...base};if(value&&typeof value==='object'&&!Array.isArray(value))Object.keys(value).forEach(k=>out[k]=k in base?mergeDefaults(base[k],value[k]):value[k]);return out}
 return value===undefined||value===null?base:value;
}
function load(){const defaults=defaultState();try{const raw=localStorage.getItem(STORAGE);state=raw?mergeDefaults(defaults,JSON.parse(raw)):defaults}catch(e){console.error('Falha ao ler dados locais',e);try{const raw=localStorage.getItem(STORAGE);if(raw)localStorage.setItem(BACKUP_PREFIX+'corrompido_'+Date.now(),raw)}catch(_){}state=defaults}normalize()}
function normalize(){const d=defaultState();state=mergeDefaults(d,state||{});state.schemaVersion=SCHEMA_VERSION;['orders','products','categories','tables','couriers','promos','finance','team','chats','customers'].forEach(k=>{if(!Array.isArray(state[k]))state[k]=[]});if(!state.cash||typeof state.cash!=='object')state.cash=d.cash;if(!Array.isArray(state.cash.movements))state.cash.movements=[];if(!Array.isArray(state.cash.history))state.cash.history=[];state.orders.forEach(o=>{if(!Array.isArray(o.items))o.items=[];o.status=o.status||'analysis';o.createdAt=o.createdAt||new Date().toISOString()});state.products.forEach(p=>{p.price=Number(p.price)||0;p.stock=Number(p.stock)||0;p.min=Number(p.min)||0;p.cost=Number(p.cost)||0})}
function save(options={}){try{state.schemaVersion=SCHEMA_VERSION;localStorage.setItem(STORAGE,JSON.stringify(state));if(options.render!==false)renderAll();return true}catch(e){console.error(e);toast('Não foi possível salvar os dados neste navegador.','error');return false}}
function getStorageBytes(){try{return new Blob([localStorage.getItem(STORAGE)||'']).size}catch(e){return 0}}
function exportBackup(){const payload={app:'X Burguer Central',version:APP_VERSION,exportedAt:new Date().toISOString(),state};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`xburguer-central-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Backup exportado.','success')}
function importBackup(){const input=document.createElement('input');input.type='file';input.accept='application/json,.json';input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text()),candidate=parsed?.state||parsed;if(!candidate||typeof candidate!=='object'||!Array.isArray(candidate.orders)||!Array.isArray(candidate.products))throw new Error('Formato inválido');state=mergeDefaults(defaultState(),candidate);normalize();save();toast('Backup importado com sucesso.','success')}catch(e){console.error(e);toast('Arquivo de backup inválido.','error')}};input.click()}
function product(id){return state.products.find(p=>p.id===id)}
function orderTotal(o){return o.items.reduce((s,i)=>s+(Number(i.price)||0)*(Number(i.q)||0),0)+(o.type==='Delivery'?Number(state.settings.deliveryFee||0):0)}
function orderAge(o){return Math.max(0,Math.floor((Date.now()-new Date(o.createdAt).getTime())/60000))}
function orderTime(o){return new Date(o.createdAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
function orderItemsText(o){return o.items.map(i=>`${i.q}x ${esc(product(i.p)?.name||'Item')}`).join('<br>')}
function typeIcon(t){return t==='Delivery'?icon('scooter'):t==='Mesa'?icon('table'):t==='Balcão'?icon('shop-window'):icon('shop')}
function syncTables(){state.tables.forEach(t=>{const open=state.orders.some(o=>o.table===t.name&&!['done','cancelled'].includes(o.status));if(t.status!=='closing')t.status=open?'busy':'free'})}
function toggleStore(){state.settings.storeOpen=!state.settings.storeOpen;save();toast(state.settings.storeOpen?'Loja aberta para pedidos.':'Loja pausada para novos pedidos.')}
function setHeader(){const on=state.settings.storeOpen;document.getElementById('storeToggle')?.classList.toggle('on',on);const st=document.getElementById('storeText');if(st)st.textContent=on?'Loja aberta':'Loja fechada';const foot=document.getElementById('footStore');if(foot){foot.textContent=on?'ABERTO':'FECHADO';foot.style.background=on?'#20be6a':'#c74444'}const count=document.getElementById('sideNewCount');if(count)count.textContent=state.orders.filter(o=>o.status==='analysis').length;globalThis.updateConnectionStatus?.()}

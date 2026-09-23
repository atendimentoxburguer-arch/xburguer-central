import fs from 'node:fs';

const app=fs.readFileSync('assets/css/app.css','utf8');
const domain=fs.readFileSync('assets/css/domain-management.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const printAgent=fs.readFileSync('apps/print-agent/desktop/ui.css','utf8');

function scanCss(name,text){
  let depth=0,min=0,quote=null,comment=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(comment){
      if(c==='*'&&n==='/'){comment=false;i++}
      continue;
    }
    if(!quote&&c==='/'&&n==='*'){comment=true;i++;continue}
    if(quote){
      if(c==='\\'){i++;continue}
      if(c===quote)quote=null;
      continue;
    }
    if(c==='"'||c==="'"){quote=c;continue}
    if(c==='{')depth++;
    else if(c==='}'){depth--;min=Math.min(min,depth)}
  }
  if(depth!==0||min<0)throw new Error(name+' possui blocos CSS desbalanceados.');
}
function depthBefore(text,index){
  let depth=0,quote=null,comment=false;
  for(let i=0;i<index;i++){
    const c=text[i],n=text[i+1];
    if(comment){
      if(c==='*'&&n==='/'){comment=false;i++}
      continue;
    }
    if(!quote&&c==='/'&&n==='*'){comment=true;i++;continue}
    if(quote){
      if(c==='\\'){i++;continue}
      if(c===quote)quote=null;
      continue;
    }
    if(c==='"'||c==="'"){quote=c;continue}
    if(c==='{')depth++;
    else if(c==='}')depth--;
  }
  return depth;
}

scanCss('app.css',app);
scanCss('domain-management.css',domain);

const marker='/* Checkout de mesa — referência visual aprovada */';
const markerIndex=app.indexOf(marker);
if(markerIndex<0)throw new Error('Bloco visual do checkout ausente.');
if(app.indexOf(marker,markerIndex+1)>=0)throw new Error('Bloco visual do checkout duplicado.');
if(depthBefore(app,markerIndex)!==0)throw new Error('Checkout está aninhado dentro de outra regra CSS; isso quebra a cascata global.');

const v26Marker='/* ======================================================================\n   Sistema visual atual — desktop blue / white / gray';
const v26Index=app.indexOf(v26Marker);
if(v26Index<0)throw new Error('Bloco do sistema visual atual ausente.');
if(depthBefore(app,v26Index)!==0)throw new Error('Sistema visual atual está aninhado dentro de outra regra CSS.');
const checkout=app.slice(markerIndex,v26Index);
for(const forbidden of ['.app{','.sidebar{','.content{','.page-head{','.orders-board{','.pdv-shell-v22{','.reports-shell-v22{']){
  if(checkout.includes(forbidden))throw new Error('Checkout contém seletor global proibido: '+forbidden);
}
for(const selector of [
  '.modal-card:has(.checkout-shell-v24)',
  '.checkout-shell-v24',
  '.checkout-topbar-v24',
  '.checkout-main-v24',
  '.checkout-side-v24',
  '.checkout-order-card.v24',
  '.checkout-payment-v24',
  '.checkout-missing-v24',
  '.checkout-select-items-v24',
  '.checkout-close-btn.v24'
]){
  if(!checkout.includes(selector))throw new Error('Seletor crítico do checkout ausente: '+selector);
}

const visualCurrent=app.slice(v26Index);
for(const token of ['--primary:#2563eb','--accent:#3b82f6','--sidebar:#0f172a','font-size:16px','font-family:"Inter"']){
  if(!visualCurrent.includes(token))throw new Error('Token do sistema visual atual ausente: '+token);
}
for(const selector of ['.nav button.active{','.page-head{','.btn-primary,.btn-blue{','.metric::before{','.table-shell{','.product-tile{','.checkout-primary-payments-v24 button{']){
  if(!visualCurrent.includes(selector))throw new Error('Componente visual não padronizado: '+selector);
}
if(!domain.includes('Acabamento visual dos módulos de gestão'))throw new Error('Acabamento dos módulos de gestão ausente.');
if(!html.includes('family=Inter:wght@400;500;600;700;800&display=swap'))throw new Error('Fonte Inter esperada não está carregada.');
if(/family=Manrope|font-family:\"Manrope\"/.test(html+app+domain+printAgent))throw new Error('Manrope não deve voltar à interface V29.');

const bannedInterfaceColors=[
  '#22c55e','#16a34a','#dc2626','#b91c1c','#ef4444',
  '#f97316','#f59e0b','#d2a53a','#ad8120','#e2b74f','#c99529'
];
for(const color of bannedInterfaceColors){
  if((app+'\\n'+domain+'\\n'+printAgent).toLowerCase().includes(color))throw new Error('Cor fora da identidade azul/branco/cinza: '+color);
}

const combined=app+'\n'+domain;
for(const selector of [
  '.app{','.sidebar{','.topbar{','.content{','.page-head{',
  '.orders-board{','.pdv-shell-v22{','.table-zones{','.menu-manager{',
  '.delivery-grid{','.kds-grid{','.reports-shell-v22{','.inventory-layout{','.finance-cols{'
]){
  if(!combined.includes(selector))throw new Error('Seletor estrutural ausente: '+selector);
}

for(const id of ['pedidos','pdv','salao','cardapio','entregas','performance','kds','clientes','marketing','atendimento','caixa','estoque','financeiro','equipe','relatorios','config']){
  if(!html.includes('id="'+id+'"'))throw new Error('Página estrutural ausente do HTML: '+id);
}

console.log('Visual contracts OK');

import fs from 'node:fs';

const app=fs.readFileSync('assets/css/app.css','utf8');
const domain=fs.readFileSync('assets/css/domain-management.css','utf8');
const html=fs.readFileSync('index.html','utf8');

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

const marker='/* Checkout V24 — referência visual de fechamento de mesa */';
const markerIndex=app.indexOf(marker);
if(markerIndex<0)throw new Error('Bloco visual do checkout V24 ausente.');
if(app.indexOf(marker,markerIndex+1)>=0)throw new Error('Bloco visual do checkout V24 duplicado.');
if(depthBefore(app,markerIndex)!==0)throw new Error('Checkout V24 está aninhado dentro de outra regra CSS; isso quebra a cascata global.');

const checkout=app.slice(markerIndex);
for(const forbidden of ['.app{','.sidebar{','.content{','.page-head{','.orders-board{','.pdv-shell-v22{','.reports-shell-v22{']){
  if(checkout.includes(forbidden))throw new Error('Checkout V24 contém seletor global proibido: '+forbidden);
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

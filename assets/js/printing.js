/* X Burguer Central V17 — impressão */
(function(){
  'use strict';

  const PURPOSE_LABEL={receipt:'Comprovante / Caixa',kitchen:'Cozinha',delivery:'Expedição / Delivery'};
  const PAPER_LABEL={'58mm':'58 mm','80mm':'80 mm',a4:'A4'};

  function printSettings(){return state.settings.printing}
  function printProfiles(purpose){return (printSettings()?.profiles||[]).filter(p=>p.enabled&&(!purpose||p.purpose===purpose))}
  function profileById(id){return (printSettings()?.profiles||[]).find(p=>p.id===id)}
  function stationForItem(item){return product(item.p)?.station||'Cozinha'}
  function formatPrintDate(value){
    const d=new Date(value||Date.now());
    return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
  }

  function buildPrintPayload(order,purpose='receipt',station='all'){
    if(!order)throw new Error('Pedido não encontrado');
    const effectiveStation=purpose==='kitchen'?(station||'all'):'all';
    const items=order.items
      .filter(i=>effectiveStation==='all'||stationForItem(i)===effectiveStation)
      .map(i=>({
        qty:Number(i.q)||0,
        name:product(i.p)?.name||'Item',
        station:stationForItem(i),
        unit:Number(i.price)||0,
        total:(Number(i.price)||0)*(Number(i.q)||0)
      }));
    const subtotal=orderSubtotal(order),fees=orderFeeTotal(order);
    return {
      purpose,
      station:effectiveStation,
      id:String(order.id||''),
      type:String(order.type||''),
      table:String(order.table||''),
      customer:String(order.customer||'Não identificado'),
      phone:String(order.phone||''),
      address:String(order.address||''),
      payment:String(order.payment||'Não registrado'),
      notes:String(order.notes||''),
      createdAt:formatPrintDate(order.createdAt),
      completedAt:order.completedAt?formatPrintDate(order.completedAt):'',
      items,
      subtotal,
      fees,
      feeLabel:order.type==='Delivery'?'Taxa de entrega':order.type==='Mesa'?'Serviço ('+Number((order.serviceFeePct??state.settings.serviceFee)||0)+'%)':'Taxas',
      total:orderTotal(order),
      store:{
        name:String(state.settings.storeName||'X Burguer'),
        city:String(state.settings.city||''),
        phone:String(state.settings.phone||'')
      }
    };
  }

  function renderHeader(payload,title){
    const cfg=printSettings();
    const logoUrl=typeof location!=='undefined'?new URL(LOGO,location.href).href:LOGO;
    return `<header class="print-header">${cfg.showLogo?`<img src="${esc(logoUrl)}" alt="">`:''}<h1>${esc(payload.store.name)}</h1><p>${esc(title)}</p>${payload.store.city?`<small>${esc(payload.store.city)}</small>`:''}</header>`;
  }
  function renderMeta(payload){
    return `<section class="print-meta"><div><span>Pedido</span><b>#${esc(payload.id)}</b></div><div><span>Tipo</span><b>${esc(payload.type)}</b></div>${payload.table?`<div><span>Mesa</span><b>${esc(payload.table)}</b></div>`:''}<div><span>Horário</span><b>${esc(payload.createdAt)}</b></div></section>`;
  }
  function renderItems(payload,{prices=false,station=false}={}){
    return `<section class="print-items">${payload.items.map(i=>`<div class="print-item"><div><b>${i.qty}x ${esc(i.name)}</b>${station?`<small>${esc(i.station)}</small>`:''}</div>${prices?`<strong>${money(i.total)}</strong>`:''}</div>`).join('')||'<p class="print-empty">Nenhum item para este destino.</p>'}</section>`;
  }
  function renderReceipt(payload){
    return `${renderHeader(payload,'COMPROVANTE DE PEDIDO')}${renderMeta(payload)}<section class="print-customer"><b>${esc(payload.customer)}</b>${payload.phone?`<span>${esc(payload.phone)}</span>`:''}${payload.address?`<span>${esc(payload.address)}</span>`:''}</section>${renderItems(payload,{prices:true})}<section class="print-totals"><div><span>Subtotal</span><b>${money(payload.subtotal)}</b></div>${payload.fees?`<div><span>${esc(payload.feeLabel)}</span><b>${money(payload.fees)}</b></div>`:''}<div class="grand"><span>Total</span><b>${money(payload.total)}</b></div></section><section class="print-payment"><span>Pagamento</span><b>${esc(payload.payment)}</b></section>${payload.notes?`<section class="print-notes"><b>Observações</b><p>${esc(payload.notes)}</p></section>`:''}<footer>${esc(printSettings().footer||'')}</footer>`;
  }
  function renderKitchen(payload){
    const title=payload.station==='all'?'COZINHA':'COZINHA — '+payload.station;
    return `${renderHeader(payload,title)}${renderMeta(payload)}${payload.customer&&payload.customer!=='Não identificado'?`<section class="print-customer"><b>${esc(payload.customer)}</b></section>`:''}${renderItems(payload,{station:true})}${payload.notes?`<section class="print-notes emphasis"><b>OBSERVAÇÕES</b><p>${esc(payload.notes)}</p></section>`:''}<footer>Produção • ${esc(payload.createdAt)}</footer>`;
  }
  function renderDelivery(payload){
    return `${renderHeader(payload,'EXPEDIÇÃO / DELIVERY')}${renderMeta(payload)}<section class="print-customer strong"><b>${esc(payload.customer)}</b>${payload.phone?`<span>${esc(payload.phone)}</span>`:''}${payload.address?`<span>${esc(payload.address)}</span>`:''}</section>${renderItems(payload,{prices:false})}<section class="print-payment"><span>Pagamento</span><b>${esc(payload.payment)} • ${money(payload.total)}</b></section>${payload.notes?`<section class="print-notes"><b>Observações</b><p>${esc(payload.notes)}</p></section>`:''}<footer>${esc(printSettings().footer||'')}</footer>`;
  }

  function renderPrintBody(payload){
    if(payload.purpose==='kitchen')return renderKitchen(payload);
    if(payload.purpose==='delivery')return renderDelivery(payload);
    return renderReceipt(payload);
  }

  function openPrintWindow({title,body,paper='80mm',copies=1}){
    if(typeof window==='undefined'||typeof window.open!=='function')return false;
    const win=window.open('','_blank','width=520,height=760');
    if(!win){toast('O navegador bloqueou a janela de impressão. Libere pop-ups para este site.','warning');return false}
    const cssUrl=new URL('assets/css/print.css',location.href).href;
    const count=Math.min(3,Math.max(1,Number(copies)||1));
    const pages=Array.from({length:count},(_,i)=>`<article class="print-sheet paper-${esc(paper)}">${body}</article>${i<count-1?'<div class="print-copy-break"></div>':''}`).join('');
    win.document.open();
    win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><link rel="stylesheet" href="${esc(cssUrl)}"></head><body>${pages}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),120));window.addEventListener('afterprint',()=>window.close());<\/script></body></html>`);
    win.document.close();
    return true;
  }

  function printOrderWithProfile(orderId,purpose,profileId='',station='all'){
    const order=state.orders.find(o=>o.id===orderId);
    if(!order){toast('Pedido não encontrado.','error');return false}
    if(!printSettings()?.enabled){toast('A impressão está desativada nas configurações.','warning');return false}
    const profile=profileId?profileById(profileId):printProfiles(purpose)[0];
    if(!profile||!profile.enabled){toast('Nenhum destino de impressão ativo para '+(PURPOSE_LABEL[purpose]||purpose)+'.','warning');return false}
    const effectiveStation=purpose==='kitchen'?(station!=='all'?station:(profile.station||'all')):'all';
    const payload=buildPrintPayload(order,purpose,effectiveStation);
    if(purpose==='kitchen'&&!payload.items.length){toast('Este pedido não possui itens para o setor selecionado.','warning');return false}
    return openPrintWindow({
      title:(PURPOSE_LABEL[purpose]||'Impressão')+' #'+order.id,
      body:renderPrintBody(payload),
      paper:profile.paper,
      copies:profile.copies
    });
  }

  function printTestProfile(id){
    const p=profileById(id);if(!p)return;
    const sample={
      purpose:p.purpose,station:p.station||'all',id:'TESTE',type:p.purpose==='delivery'?'Delivery':'Balcão',table:'Mesa 01',
      customer:'Cliente de teste',phone:'(62) 99999-9999',address:'Rua de exemplo, 123',payment:'PIX',notes:'Impressão de teste do X Burguer Central.',
      createdAt:formatPrintDate(new Date()),completedAt:'',subtotal:37,fees:0,feeLabel:'Taxas',total:37,
      store:{name:state.settings.storeName||'X Burguer',city:state.settings.city||'',phone:state.settings.phone||''},
      items:[{qty:1,name:'X-Burguer de teste',station:p.station==='all'?'Cozinha':p.station,unit:31,total:31},{qty:1,name:'Refrigerante',station:'Bebidas',unit:6,total:6}]
    };
    if(p.purpose==='kitchen'&&p.station!=='all')sample.items=sample.items.filter(i=>i.station===p.station);
    openPrintWindow({title:'Teste — '+p.name,body:renderPrintBody(sample),paper:p.paper,copies:1});
  }

  function printOrderMenu(id){
    const order=state.orders.find(o=>o.id===id);if(!order){toast('Pedido não encontrado.','error');return}
    const kitchenStations=[...new Set(order.items.map(i=>stationForItem(i)))];
    openModal(`<div class="modal-head"><div><h2>Imprimir pedido #${esc(order.id)}</h2><p class="dialog-subtitle">Escolha o documento que será enviado ao diálogo de impressão do sistema.</p></div><button class="icon-btn" onclick="closeModal()" aria-label="Fechar">${icon('x-lg')}</button></div>
    <div class="print-choice-grid">
      <button class="print-choice" onclick="printReceipt('${order.id}')"><span>${icon('receipt')}</span><div><b>Comprovante</b><small>Cliente, itens, valores e pagamento.</small></div></button>
      <button class="print-choice" onclick="printKitchen('${order.id}')"><span>${icon('printer')}</span><div><b>Cozinha</b><small>Itens, mesa e observações sem preços.</small></div></button>
      ${order.type==='Delivery'?`<button class="print-choice" onclick="printDelivery('${order.id}')"><span>${icon('truck')}</span><div><b>Expedição</b><small>Endereço, telefone e itens do delivery.</small></div></button>`:''}
    </div>
    ${kitchenStations.length>1?`<div class="print-stations"><b>Imprimir setor específico</b><div>${kitchenStations.map(st=>`<button class="btn btn-outline btn-sm" data-station="${esc(st)}" onclick="printKitchenFromButton('${order.id}',this)">${esc(st)}</button>`).join('')}</div></div>`:''}
    <div class="modal-foot"><button class="btn btn-outline" onclick="printerCenter()">${icon('gear')}<span>Configurar impressoras</span></button><button class="btn btn-primary" onclick="closeModal()">Fechar</button></div>`);
  }
  function printKitchenFromButton(id,btn){return printOrderWithProfile(id,'kitchen','',btn?.dataset?.station||'all')}
  function printKitchenTicketFromButton(btn){
    const id=btn?.dataset?.order||'',station=btn?.dataset?.station||'all';
    return printOrderWithProfile(id,'kitchen','',station);
  }

  function printerCenter(){
    const cfg=printSettings(),profiles=cfg.profiles||[];
    openModal(`<div class="modal-head"><div><h2>Central de impressão</h2><p class="dialog-subtitle">Configure comprovantes, cozinha e expedição. A impressora física é escolhida no diálogo de impressão do sistema.</p></div><button class="icon-btn" onclick="closeModal()" aria-label="Fechar">${icon('x-lg')}</button></div>
    <div class="print-info">${icon('info-circle')}<div><b>Impressão pelo navegador</b><span>Funciona com impressoras térmicas 58/80 mm e impressoras A4 instaladas no computador. O navegador abre o seletor de impressão do sistema.</span></div></div>
    <div class="print-master-row"><div><b>Impressão no sistema</b><span>Desative para ocultar ações automáticas.</span></div><span class="toggle ${cfg.enabled?'on':''}" role="switch" aria-checked="${cfg.enabled?'true':'false'}" tabindex="0" onclick="togglePrintingEnabled()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();togglePrintingEnabled()}"></span></div>
    <div class="printer-profiles">${profiles.map(p=>`<div class="printer-profile"><span class="printer-profile-icon">${icon(p.purpose==='kitchen'?'printer':p.purpose==='delivery'?'truck':'receipt')}</span><div class="printer-profile-copy"><b>${esc(p.name)}</b><span>${esc(PURPOSE_LABEL[p.purpose]||p.purpose)} • ${esc(PAPER_LABEL[p.paper]||p.paper)} • ${p.copies} cópia(s)${p.purpose==='kitchen'&&p.station!=='all'?' • '+esc(p.station):''}</span></div><span class="badge ${p.enabled?'b-green':'b-gray'}">${p.enabled?'Ativo':'Inativo'}</span><div class="printer-profile-actions"><button class="icon-btn" onclick="printTestProfile('${p.id}')" title="Impressão de teste">${icon('printer')}</button><button class="icon-btn" onclick="editPrinterProfile('${p.id}')" title="Editar">${icon('pencil')}</button><button class="icon-btn" onclick="togglePrinterProfile('${p.id}')" title="${p.enabled?'Desativar':'Ativar'}">${icon(p.enabled?'pause-circle':'play-circle')}</button></div></div>`).join('')}</div>
    <div class="print-automation"><div class="print-master-row"><div><b>Abrir cozinha ao aceitar pedido</b><span>Abre a impressão da cozinha quando o pedido entra em produção.</span></div><span class="toggle ${cfg.openKitchenOnAccept?'on':''}" role="switch" aria-checked="${cfg.openKitchenOnAccept?'true':'false'}" onclick="togglePrintAutomation('kitchen')"></span></div><div class="print-master-row"><div><b>Abrir comprovante ao salvar no PDV</b><span>Abre o comprovante automaticamente após criar um pedido.</span></div><span class="toggle ${cfg.openReceiptOnSave?'on':''}" role="switch" aria-checked="${cfg.openReceiptOnSave?'true':'false'}" onclick="togglePrintAutomation('receipt')"></span></div></div>
    <div class="modal-foot"><button class="btn btn-outline" onclick="editPrintFooter()">${icon('card-text')}<span>Rodapé</span></button><button class="btn btn-primary" onclick="closeModal()">Concluir</button></div>`);
  }

  function togglePrintingEnabled(){state.settings.printing.enabled=!state.settings.printing.enabled;save({render:false});printerCenter()}
  function togglePrinterProfile(id){const p=profileById(id);if(!p)return;p.enabled=!p.enabled;save({render:false});printerCenter()}
  function togglePrintAutomation(kind){
    if(kind==='kitchen')state.settings.printing.openKitchenOnAccept=!state.settings.printing.openKitchenOnAccept;
    if(kind==='receipt')state.settings.printing.openReceiptOnSave=!state.settings.printing.openReceiptOnSave;
    save({render:false});printerCenter();
  }
  async function editPrinterProfile(id){
    const p=profileById(id);if(!p)return;
    const stations=['all',...new Set(state.products.map(x=>x.station||'Cozinha'))].map(s=>({value:s,label:s==='all'?'Todos os setores':s}));
    const v=await formDialog({title:'Editar destino de impressão',subtitle:p.name,fields:[
      {key:'name',label:'Nome interno',value:p.name,required:true},
      {key:'purpose',label:'Uso',type:'select',value:p.purpose,options:[{value:'receipt',label:'Comprovante / Caixa'},{value:'kitchen',label:'Cozinha'},{value:'delivery',label:'Expedição / Delivery'}]},
      {key:'paper',label:'Papel',type:'select',value:p.paper,options:[{value:'58mm',label:'Térmica 58 mm'},{value:'80mm',label:'Térmica 80 mm'},{value:'a4',label:'A4'}]},
      {key:'copies',label:'Cópias',type:'number',value:p.copies,min:1,max:3,step:'1'},
      {key:'station',label:'Setor da cozinha',type:'select',value:p.station||'all',options:stations}
    ]});
    if(!v)return;
    p.name=v.name.trim().slice(0,80)||p.name;
    p.purpose=['receipt','kitchen','delivery'].includes(v.purpose)?v.purpose:p.purpose;
    p.paper=['58mm','80mm','a4'].includes(v.paper)?v.paper:p.paper;
    p.copies=Math.min(3,Math.max(1,Number(v.copies)||1));
    p.station=p.purpose==='kitchen'?(v.station||'all'):'all';
    save({render:false});printerCenter();toast('Destino de impressão atualizado.','success');
  }
  async function editPrintFooter(){
    const v=await formDialog({title:'Rodapé do comprovante',fields:[{key:'footer',label:'Mensagem',value:printSettings().footer||'',full:true}]});
    if(!v)return;
    state.settings.printing.footer=String(v.footer||'').trim().slice(0,180);
    save({render:false});printerCenter();
  }

  function maybePrintKitchen(order){
    if(printSettings()?.enabled&&printSettings()?.openKitchenOnAccept)return printOrderWithProfile(order.id,'kitchen');
    return false;
  }
  function maybePrintReceipt(order){
    if(printSettings()?.enabled&&printSettings()?.openReceiptOnSave)return printOrderWithProfile(order.id,'receipt');
    return false;
  }

  globalThis.buildPrintPayload=buildPrintPayload;
  globalThis.printOrderWithProfile=printOrderWithProfile;
  globalThis.printReceipt=id=>printOrderWithProfile(id,'receipt');
  globalThis.printKitchen=(id,station='all')=>printOrderWithProfile(id,'kitchen','',station);
  globalThis.printDelivery=id=>printOrderWithProfile(id,'delivery');
  globalThis.printTestProfile=printTestProfile;
  globalThis.printOrderMenu=printOrderMenu;
  globalThis.printKitchenFromButton=printKitchenFromButton;
  globalThis.printKitchenTicketFromButton=printKitchenTicketFromButton;
  globalThis.printerCenter=printerCenter;
  globalThis.togglePrintingEnabled=togglePrintingEnabled;
  globalThis.togglePrinterProfile=togglePrinterProfile;
  globalThis.togglePrintAutomation=togglePrintAutomation;
  globalThis.editPrinterProfile=editPrinterProfile;
  globalThis.editPrintFooter=editPrintFooter;
  globalThis.maybePrintKitchen=maybePrintKitchen;
  globalThis.maybePrintReceipt=maybePrintReceipt;
})();
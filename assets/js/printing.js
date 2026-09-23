/* X Burguer Central V20 — impressão gerenciada por aplicativo Windows */
(function(){
  'use strict';

  const PURPOSE_LABEL={receipt:'Comprovante / Caixa',kitchen:'Cozinha',delivery:'Expedição / Delivery'};
  const PAPER_LABEL={'58mm':'58 mm','80mm':'80 mm',a4:'A4'};
  const EVENT_LABEL={
    created:'Ao criar pedido',
    production:'Ao entrar em produção',
    ready:'Ao ficar pronto',
    completed:'Ao concluir pedido'
  };
  const EVENT_HELP={
    created:'Ideal para comprovante/caixa.',
    production:'Ideal para cozinha e setores.',
    ready:'Ideal para expedição ou conferência.',
    completed:'Ideal para comprovante final.'
  };

  function printSettings(){return state.settings.printing}
  function printProfiles(purpose){return (printSettings()?.profiles||[]).filter(p=>p.enabled&&(!purpose||p.purpose===purpose))}
  function profileById(id){return (printSettings()?.profiles||[]).find(p=>p.id===id)}
  function stationForItem(item){return product(item.p)?.station||'Cozinha'}
  function formatPrintDate(value){
    const d=new Date(value||Date.now());
    return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
  }
  function autoSummary(profile){
    const events=Array.isArray(profile?.autoEvents)?profile.autoEvents:[];
    return events.length?events.map(e=>EVENT_LABEL[e]||e).join(' • '):'Somente manual';
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
      footer:String(printSettings().footer||''),
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
    return `${renderHeader(payload,'COMPROVANTE DE PEDIDO')}${renderMeta(payload)}<section class="print-customer"><b>${esc(payload.customer)}</b>${payload.phone?`<span>${esc(payload.phone)}</span>`:''}${payload.address?`<span>${esc(payload.address)}</span>`:''}</section>${renderItems(payload,{prices:true})}<section class="print-totals"><div><span>Subtotal</span><b>${money(payload.subtotal)}</b></div>${payload.fees?`<div><span>${esc(payload.feeLabel)}</span><b>${money(payload.fees)}</b></div>`:''}<div class="grand"><span>Total</span><b>${money(payload.total)}</b></div></section><section class="print-payment"><span>Pagamento</span><b>${esc(payload.payment)}</b></section>${payload.notes?`<section class="print-notes"><b>Observações</b><p>${esc(payload.notes)}</p></section>`:''}${printSettings().footer?`<footer>${esc(printSettings().footer)}</footer>`:''}`;
  }
  function renderKitchen(payload){
    const title=payload.station==='all'?'COZINHA':'COZINHA — '+payload.station;
    return `${renderHeader(payload,title)}${renderMeta(payload)}${payload.customer&&payload.customer!=='Não identificado'?`<section class="print-customer compact-customer"><b>${esc(payload.customer)}</b></section>`:''}${renderItems(payload,{station:true})}${payload.notes?`<section class="print-notes emphasis"><b>OBSERVAÇÕES</b><p>${esc(payload.notes)}</p></section>`:''}<footer>Produção • ${esc(payload.createdAt)}</footer>`;
  }
  function renderDelivery(payload){
    return `${renderHeader(payload,'EXPEDIÇÃO / DELIVERY')}${renderMeta(payload)}<section class="print-customer strong"><b>${esc(payload.customer)}</b>${payload.phone?`<span>${esc(payload.phone)}</span>`:''}${payload.address?`<span>${esc(payload.address)}</span>`:''}</section>${renderItems(payload)}<section class="print-payment"><span>Pagamento</span><b>${esc(payload.payment)} • ${money(payload.total)}</b></section>${payload.notes?`<section class="print-notes"><b>Observações</b><p>${esc(payload.notes)}</p></section>`:''}${printSettings().footer?`<footer>${esc(printSettings().footer)}</footer>`:''}`;
  }
  function renderPrintBody(payload){
    if(payload.purpose==='kitchen')return renderKitchen(payload);
    if(payload.purpose==='delivery')return renderDelivery(payload);
    return renderReceipt(payload);
  }

  function openPrintWindow({title,body,paper='80mm',copies=1}){
    if(typeof window==='undefined'||typeof window.open!=='function')return false;
    const win=window.open('','_blank','width=430,height=760');
    if(!win){toast('O navegador bloqueou a janela de impressão. Libere pop-ups para este site.','warning');return false}
    const cfg=printSettings();
    const cssUrl=new URL('assets/css/print.css',location.href).href;
    const count=Math.min(3,Math.max(1,Number(copies)||1));
    const classes=[
      'print-sheet',
      'paper-'+paper,
      'density-'+(cfg.density||'compact'),
      'font-'+(cfg.fontScale||'normal'),
      cfg.strongText?'print-strong':''
    ].filter(Boolean).join(' ');
    const pages=Array.from({length:count},(_,i)=>`<article class="${esc(classes)}">${body}</article>${i<count-1?'<div class="print-copy-break"></div>':''}`).join('');
    win.document.open();
    win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(title)}</title><link rel="stylesheet" href="${esc(cssUrl)}"></head><body class="orientation-portrait">${pages}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),140));window.addEventListener('afterprint',()=>window.close());<\/script></body></html>`);
    win.document.close();
    return true;
  }

  async function printOrderWithProfile(orderId,purpose,profileId='',station='all',event='manual'){
    const order=state.orders.find(o=>o.id===orderId);
    if(!order){toast('Pedido não encontrado.','error');return false}
    if(!printSettings()?.enabled){toast('A impressão está desativada nas configurações.','warning');return false}
    const profile=profileId?profileById(profileId):printProfiles(purpose)[0];
    if(!profile||!profile.enabled){toast('Nenhum destino de impressão ativo para '+(PURPOSE_LABEL[purpose]||purpose)+'.','warning');return false}
    const effectiveStation=purpose==='kitchen'?(station!=='all'?station:(profile.station||'all')):'all';
    const payload=buildPrintPayload(order,purpose,effectiveStation);
    if(purpose==='kitchen'&&!payload.items.length)return false;

    const agent=globalThis.agentConfig?.();
    if(profile.paper!=='a4'&&globalThis.sendManagedPrint&&agent?.enabled){
      const managed=await globalThis.sendManagedPrint(profile,payload,event,{silent:event!=='manual'});
      if(managed||!agent.fallbackBrowser)return managed;
    }
    if(event!=='manual')return false;
    if(agent?.enabled&&!agent.fallbackBrowser){
      toast(profile.paper==='a4'?'A4 ainda não é enviado silenciosamente na ETAPA 1. Use uma térmica 58/80 mm para impressão automática.':'Impressão silenciosa não enviada. Verifique o agente e o mapeamento da impressora.','warning');
      return false;
    }
    return openPrintWindow({
      title:(PURPOSE_LABEL[purpose]||'Impressão')+' #'+order.id,
      body:renderPrintBody(payload),
      paper:profile.paper,
      copies:profile.copies
    });
  }

  function profileMatchesEvent(profile,event,order){
    if(!profile?.enabled||!Array.isArray(profile.autoEvents)||!profile.autoEvents.includes(event))return false;
    if(profile.purpose==='delivery'&&order.type!=='Delivery')return false;
    if(profile.purpose==='kitchen'&&profile.station!=='all'&&!order.items.some(i=>stationForItem(i)===profile.station))return false;
    return true;
  }
  function autoProfilesForEvent(event,order){
    return (printSettings()?.profiles||[]).filter(p=>profileMatchesEvent(p,event,order));
  }
  async function dispatchAutoPrintEvent(event,order){
    if(!printSettings()?.enabled||!order)return 0;
    const targets=autoProfilesForEvent(event,order);
    if(!targets.length)return 0;
    let sent=0,unmapped=0;
    for(const profile of targets){
      if(!profile.deviceName&&profile.paper!=='a4'){unmapped++;continue}
      const ok=await printOrderWithProfile(order.id,profile.purpose,profile.id,profile.station||'all',event);
      if(ok)sent++;
    }
    if(unmapped)toast(unmapped+' destino(s) automático(s) ainda não possuem impressora física mapeada.','warning');
    return sent;
  }

  async function printTestProfile(id){
    const p=profileById(id);if(!p)return;
    const sample={
      purpose:p.purpose,station:p.station||'all',id:'TESTE',type:p.purpose==='delivery'?'Delivery':'Balcão',table:'Mesa 01',
      customer:'Cliente de teste',phone:'(62) 99999-9999',address:'Rua de exemplo, 123',payment:'PIX',notes:'Impressão de teste do X Burguer Central.',
      createdAt:formatPrintDate(new Date()),completedAt:'',subtotal:37,fees:0,feeLabel:'Taxas',total:37,footer:String(printSettings().footer||''),
      store:{name:state.settings.storeName||'X Burguer',city:state.settings.city||'',phone:state.settings.phone||''},
      items:[{qty:1,name:'X-Burguer de teste',station:p.station==='all'?'Cozinha':p.station,unit:31,total:31},{qty:1,name:'Refrigerante',station:'Bebidas',unit:6,total:6}]
    };
    if(p.purpose==='kitchen'&&p.station!=='all')sample.items=sample.items.filter(i=>i.station===p.station);
    const agent=globalThis.agentConfig?.();
    if(globalThis.sendManagedPrint&&agent?.enabled&&p.paper!=='a4'){
      if(!p.deviceName){toast('Mapeie uma impressora física antes do teste.','warning');return false}
      return globalThis.sendManagedPrint(p,sample,'test',{silent:false});
    }
    return openPrintWindow({title:'Teste — '+p.name,body:renderPrintBody(sample),paper:p.paper,copies:1});
  }

  function printOrderMenu(id){
    const order=state.orders.find(o=>o.id===id);if(!order){toast('Pedido não encontrado.','error');return}
    const kitchenStations=[...new Set(order.items.map(i=>stationForItem(i)))];
    openModal(`<div class="modal-head"><div><h2>Imprimir pedido #${esc(order.id)}</h2><p class="dialog-subtitle">Formato vertical e econômico. Escolha o documento.</p></div><button class="icon-btn" onclick="closeModal()" aria-label="Fechar">${icon('x-lg')}</button></div>
    <div class="print-choice-grid">
      <button class="print-choice" onclick="printReceipt('${order.id}')"><span>${icon('receipt')}</span><div><b>Comprovante</b><small>Cliente, itens, valores e pagamento.</small></div></button>
      <button class="print-choice" onclick="printKitchen('${order.id}')"><span>${icon('printer')}</span><div><b>Cozinha</b><small>Itens, mesa e observações sem preços.</small></div></button>
      ${order.type==='Delivery'?`<button class="print-choice" onclick="printDelivery('${order.id}')"><span>${icon('truck')}</span><div><b>Expedição</b><small>Endereço, telefone e itens do delivery.</small></div></button>`:''}
    </div>
    ${kitchenStations.length>1?`<div class="print-stations"><b>Imprimir somente um setor</b><div>${kitchenStations.map(st=>`<button class="btn btn-outline btn-sm" data-station="${esc(st)}" onclick="printKitchenFromButton('${order.id}',this)">${esc(st)}</button>`).join('')}</div></div>`:''}
    <div class="modal-foot"><button class="btn btn-outline" onclick="printerCenter()">${icon('gear')}<span>Configurar impressão</span></button><button class="btn btn-primary" onclick="closeModal()">Fechar</button></div>`);
  }
  function printKitchenFromButton(id,btn){return printOrderWithProfile(id,'kitchen','',btn?.dataset?.station||'all')}
  function printKitchenTicketFromButton(btn){
    const id=btn?.dataset?.order||'',station=btn?.dataset?.station||'all';
    return printOrderWithProfile(id,'kitchen','',station);
  }

  function appearanceSummary(){
    const cfg=printSettings();
    const density=cfg.density==='compact'?'Compacto/econômico':'Confortável';
    const size=cfg.fontScale==='small'?'Pequena':cfg.fontScale==='large'?'Grande':'Normal';
    return `Vertical • ${density} • Fonte ${size} • ${cfg.strongText?'Texto reforçado':'Texto padrão'} • ${cfg.showLogo?'Com logo':'Sem logo'}`;
  }

  function printerCenter(){
    const cfg=printSettings(),profiles=cfg.profiles||[];
    openModal(`<div class="modal-head"><div><h2>Central de impressão</h2><p class="dialog-subtitle">Gerenciamento silencioso por impressora física, setor e evento.</p></div><button class="icon-btn" onclick="closeModal()" aria-label="Fechar">${icon('x-lg')}</button></div>
    ${globalThis.agentStatusCard?.()||''}
    <div class="print-info">${icon('shield-check')}<div><b>Sem aba de impressão</b><span>Com o agente local pareado e o destino mapeado, pedidos são enviados diretamente para a fila da impressora térmica do Windows. O navegador não abre a janela de impressão.</span></div></div>
    <div class="print-config-grid">
      <div class="print-master-row"><div><b>Impressão no sistema</b><span>Ativa ações manuais e automações.</span></div><span class="toggle ${cfg.enabled?'on':''}" role="switch" aria-checked="${cfg.enabled?'true':'false'}" tabindex="0" onclick="togglePrintingEnabled()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();togglePrintingEnabled()}"></span></div>
      <button class="print-layout-card" onclick="editPrintAppearance()"><span class="printer-profile-icon">${icon('file-earmark-text')}</span><div><b>Layout da impressão</b><span>${esc(appearanceSummary())}</span></div>${icon('chevron-right')}</button>
    </div>
    <div class="printer-section-head"><div><b>Destinos de impressão</b><span>Crie um destino por local: caixa, cozinha, chapa, fritadeira, bebidas, bar ou expedição.</span></div><button class="btn btn-primary btn-sm" onclick="addPrinterProfile()">${icon('plus-lg')}<span>Destino</span></button></div>
    <div class="printer-profiles">${profiles.map(p=>`<div class="printer-profile"><span class="printer-profile-icon">${icon(p.purpose==='kitchen'?'printer':p.purpose==='delivery'?'truck':'receipt')}</span><div class="printer-profile-copy"><b>${esc(p.name)}</b><span>${esc(PURPOSE_LABEL[p.purpose]||p.purpose)} • ${esc(PAPER_LABEL[p.paper]||p.paper)} • ${p.copies} cópia(s)${p.purpose==='kitchen'&&p.station!=='all'?' • '+esc(p.station):''}</span><small>${esc(autoSummary(p))}</small><small class="${p.deviceName?'device-unmapped':'device-unmapped'}" ${p.deviceName?`data-printer-device="${esc(p.deviceName)}" data-device-prefix="Windows"`:''}>${p.paper==='a4'?'A4 usa modo do navegador':p.deviceName?'Windows: '+esc(p.deviceName)+' • verificando...':'Impressora física não mapeada'}</small></div><span class="badge ${p.enabled?'b-green':'b-gray'}">${p.enabled?'Ativo':'Inativo'}</span><div class="printer-profile-actions"><button class="icon-btn" onclick="mapPrinterDevice('${p.id}')" title="Mapear impressora física">${icon('link-45deg')}</button><button class="icon-btn" onclick="printTestProfile('${p.id}')" title="Impressão de teste">${icon('printer')}</button><button class="icon-btn" onclick="editPrinterAutomation('${p.id}')" title="Automação">${icon('lightning-charge')}</button><button class="icon-btn" onclick="editPrinterProfile('${p.id}')" title="Editar">${icon('pencil')}</button><button class="icon-btn" onclick="togglePrinterProfile('${p.id}')" title="${p.enabled?'Desativar':'Ativar'}">${icon(p.enabled?'pause-circle':'play-circle')}</button><button class="icon-btn danger-soft" onclick="deletePrinterProfile('${p.id}')" title="Excluir">${icon('trash')}</button></div></div>`).join('')||'<div class="empty">Nenhum destino configurado.</div>'}</div>
    <div class="print-routing-note">${icon('diagram-3')}<div><b>Como configurar a impressão automática</b><span>Abra o raio de cada destino e escolha em qual etapa ele deve imprimir. Ex.: Chapa → “Ao entrar em produção”; Expedição → “Ao ficar pronto”.</span></div></div>
    <div class="modal-foot"><button class="btn btn-outline" onclick="editPrintFooter()">${icon('card-text')}<span>Rodapé</span></button><button class="btn btn-primary" onclick="closeModal()">Concluir</button></div>`);
    setTimeout(()=>globalThis.refreshPrinterDeviceBadges?.(),0);
  }

  function togglePrintingEnabled(){state.settings.printing.enabled=!state.settings.printing.enabled;save({render:false});printerCenter()}
  function togglePrinterProfile(id){const p=profileById(id);if(!p)return;p.enabled=!p.enabled;save({render:false});printerCenter()}

  async function addPrinterProfile(){
    const stations=['all',...new Set(state.products.map(x=>x.station||'Cozinha'))].map(s=>({value:s,label:s==='all'?'Todos os setores':s}));
    const v=await formDialog({title:'Novo destino de impressão',subtitle:'Use um destino para cada local físico ou setor.',fields:[
      {key:'name',label:'Nome do destino',value:'Nova impressora',required:true},
      {key:'purpose',label:'Documento',type:'select',value:'kitchen',options:[{value:'receipt',label:'Comprovante / Caixa'},{value:'kitchen',label:'Cozinha'},{value:'delivery',label:'Expedição / Delivery'}]},
      {key:'paper',label:'Papel',type:'select',value:'80mm',options:[{value:'58mm',label:'Térmica 58 mm'},{value:'80mm',label:'Térmica 80 mm'},{value:'a4',label:'A4 vertical'}]},
      {key:'copies',label:'Cópias',type:'number',value:1,min:1,max:3,step:'1'},
      {key:'station',label:'Setor da cozinha',type:'select',value:'all',options:stations}
    ]});
    if(!v)return;
    const name=v.name.trim().slice(0,80);
    if(!name)return;
    state.settings.printing.profiles.push({
      id:uid('print-'),name,
      purpose:['receipt','kitchen','delivery'].includes(v.purpose)?v.purpose:'kitchen',
      paper:['58mm','80mm','a4'].includes(v.paper)?v.paper:'80mm',
      copies:Math.min(3,Math.max(1,Number(v.copies)||1)),
      enabled:true,
      station:v.purpose==='kitchen'?(v.station||'all'):'all',
      autoEvents:[],
      deviceName:''
    });
    save({render:false});printerCenter();toast('Destino de impressão criado.','success');
  }

  async function editPrinterProfile(id){
    const p=profileById(id);if(!p)return;
    const stations=['all',...new Set(state.products.map(x=>x.station||'Cozinha'))].map(s=>({value:s,label:s==='all'?'Todos os setores':s}));
    const v=await formDialog({title:'Editar destino de impressão',subtitle:p.name,fields:[
      {key:'name',label:'Nome do destino',value:p.name,required:true},
      {key:'purpose',label:'Documento',type:'select',value:p.purpose,options:[{value:'receipt',label:'Comprovante / Caixa'},{value:'kitchen',label:'Cozinha'},{value:'delivery',label:'Expedição / Delivery'}]},
      {key:'paper',label:'Papel',type:'select',value:p.paper,options:[{value:'58mm',label:'Térmica 58 mm'},{value:'80mm',label:'Térmica 80 mm'},{value:'a4',label:'A4 vertical'}]},
      {key:'copies',label:'Cópias',type:'number',value:p.copies,min:1,max:3,step:'1'},
      {key:'station',label:'Setor da cozinha',type:'select',value:p.station||'all',options:stations}
    ]});
    if(!v)return;
    p.name=v.name.trim().slice(0,80)||p.name;
    p.purpose=['receipt','kitchen','delivery'].includes(v.purpose)?v.purpose:p.purpose;
    p.paper=['58mm','80mm','a4'].includes(v.paper)?v.paper:p.paper;
    p.copies=Math.min(3,Math.max(1,Number(v.copies)||1));
    p.station=p.purpose==='kitchen'?(v.station||'all'):'all';
    if(p.paper==='a4')p.deviceName='';
    save({render:false});printerCenter();toast('Destino de impressão atualizado.','success');
  }

  async function deletePrinterProfile(id){
    const p=profileById(id);if(!p)return;
    if((printSettings().profiles||[]).length<=1){toast('Mantenha pelo menos um destino de impressão.','warning');return}
    const ok=await confirmDialog('Excluir destino','Excluir “'+p.name+'” e suas automações?',{confirmLabel:'Excluir',danger:true});
    if(!ok)return;
    state.settings.printing.profiles=state.settings.printing.profiles.filter(x=>x.id!==id);
    save({render:false});printerCenter();toast('Destino removido.','success');
  }

  function editPrinterAutomation(id){
    const p=profileById(id);if(!p)return;
    openModal(`<div class="modal-head"><div><h2>Automação — ${esc(p.name)}</h2><p class="dialog-subtitle">Escolha exatamente quando este destino deve abrir a impressão.</p></div><button class="icon-btn" onclick="printerCenter()" aria-label="Voltar">${icon('arrow-left')}</button></div>
      <div class="automation-list">${Object.keys(EVENT_LABEL).map(event=>{const on=p.autoEvents.includes(event);return `<button class="automation-row ${on?'active':''}" onclick="togglePrinterEvent('${p.id}','${event}')"><span class="automation-icon">${icon(on?'check-circle-fill':'circle')}</span><div><b>${esc(EVENT_LABEL[event])}</b><span>${esc(EVENT_HELP[event])}</span></div><span class="badge ${on?'b-green':'b-gray'}">${on?'Automático':'Manual'}</span></button>`}).join('')}</div>
      <div class="print-routing-example"><b>Destino</b><span>${esc(PURPOSE_LABEL[p.purpose])}${p.purpose==='kitchen'?' • '+esc(p.station==='all'?'Todos os setores':p.station):''} • ${esc(PAPER_LABEL[p.paper])}${p.deviceName?' • '+esc(p.deviceName):''}</span></div>
      <div class="modal-foot"><button class="btn btn-primary" onclick="printerCenter()">Concluir</button></div>`);
  }
  function togglePrinterEvent(id,event){
    if(!Object.prototype.hasOwnProperty.call(EVENT_LABEL,event))return;
    const p=profileById(id);if(!p)return;
    const set=new Set(p.autoEvents||[]);
    if(set.has(event))set.delete(event);else set.add(event);
    p.autoEvents=[...set];
    save({render:false});editPrinterAutomation(id);
  }

  async function editPrintAppearance(){
    const cfg=printSettings();
    const v=await formDialog({title:'Layout da impressão',subtitle:'Retrato/vertical é fixo para economizar papel.',fields:[
      {key:'density',label:'Espaçamento',type:'select',value:cfg.density,options:[{value:'compact',label:'Compacto / econômico'},{value:'comfortable',label:'Confortável'}]},
      {key:'fontScale',label:'Tamanho da fonte',type:'select',value:cfg.fontScale,options:[{value:'small',label:'Pequena'},{value:'normal',label:'Normal'},{value:'large',label:'Grande'}]},
      {key:'strongText',label:'Peso da impressão',type:'select',value:cfg.strongText?'1':'0',options:[{value:'1',label:'Escuro / reforçado'},{value:'0',label:'Padrão'}]},
      {key:'showLogo',label:'Logo no topo',type:'select',value:cfg.showLogo?'1':'0',options:[{value:'0',label:'Ocultar para economizar papel'},{value:'1',label:'Mostrar logo'}]}
    ]});
    if(!v)return;
    cfg.orientation='portrait';
    cfg.density=['compact','comfortable'].includes(v.density)?v.density:'compact';
    cfg.fontScale=['small','normal','large'].includes(v.fontScale)?v.fontScale:'normal';
    cfg.strongText=v.strongText==='1';
    cfg.showLogo=v.showLogo==='1';
    save({render:false});printerCenter();toast('Layout de impressão atualizado.','success');
  }

  async function editPrintFooter(){
    const v=await formDialog({title:'Rodapé do comprovante',fields:[{key:'footer',label:'Mensagem',value:printSettings().footer||'',full:true}]});
    if(!v)return;
    state.settings.printing.footer=String(v.footer||'').trim().slice(0,180);
    save({render:false});printerCenter();
  }

  function maybePrintKitchen(order){return dispatchAutoPrintEvent('production',order)}
  function maybePrintReceipt(order){return dispatchAutoPrintEvent('created',order)}

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
  globalThis.addPrinterProfile=addPrinterProfile;
  globalThis.editPrinterProfile=editPrinterProfile;
  globalThis.deletePrinterProfile=deletePrinterProfile;
  globalThis.editPrinterAutomation=editPrinterAutomation;
  globalThis.togglePrinterEvent=togglePrinterEvent;
  globalThis.editPrintAppearance=editPrintAppearance;
  globalThis.editPrintFooter=editPrintFooter;
  globalThis.dispatchAutoPrintEvent=dispatchAutoPrintEvent;
  globalThis.autoProfilesForEvent=autoProfilesForEvent;
  globalThis.maybePrintKitchen=maybePrintKitchen;
  globalThis.maybePrintReceipt=maybePrintReceipt;
})();
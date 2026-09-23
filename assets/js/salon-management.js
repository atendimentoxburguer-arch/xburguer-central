/* Salão — mesas, comandas, garçons e configurações */
(function(){
  'use strict';
  let tableSearchV14='';
  let tableStatusV14='all';
  let tableAreaV14='all';
  function diningAreaV14(id){
    return (state.diningAreas||[]).find(function(a){return a.id===id});
  }
  function tableAreaNameV14(t){
    const a=diningAreaV14(t.area);
    return a?a.name:'Sem área';
  }
  function openOrdersV14(t){
    return state.orders.filter(function(o){return o.table===t.name&&!['done','cancelled'].includes(o.status)});
  }
  function tableStatusLabelV14(status){
    return status==='free'?'Livre':status==='closing'?'Fechando conta':'Ocupada';
  }
  function orderedTablesV14(){
    const order=new Map((state.diningAreas||[]).map(function(a,i){return [a.id,i]}));
    return state.tables.slice().sort(function(a,b){
      const area=(order.get(a.area)??999)-(order.get(b.area)??999);
      if(area)return area;
      const pos=(Number(a.order)||0)-(Number(b.order)||0);
      return pos||String(a.name).localeCompare(String(b.name),'pt-BR');
    });
  }
  function serverOptionsV14(){
    return [{value:'',label:'Sem responsável'}].concat(state.team.filter(function(u){
      return u.active&&['Garçom','Administrador'].includes(u.role);
    }).map(function(u){return {value:u.name,label:u.name}}));
  }

  globalThis.renderSalao=function(){
    syncTables();
    const root=document.getElementById('salao');
    const busy=state.tables.filter(function(t){return t.status==='busy'}).length;
    const closing=state.tables.filter(function(t){return t.status==='closing'}).length;
    const seats=state.tables.reduce(function(s,t){return s+(Number(t.seats)||0)},0);
    const guests=state.tables.reduce(function(s,t){return s+(Number(t.guests)||0)},0);
    const waiters=state.team.filter(function(u){return u.role==='Garçom'}).length;
    const openCommands=state.tables.filter(function(t){return t.status!=='free'}).length;
    const allowedTabs=['mesas','comandas','garcons','configuracoes'];
    if(!allowedTabs.includes(salaoTab))salaoTab='mesas';
    let body='';
    if(salaoTab==='mesas')body=renderMesasGridV14();
    else if(salaoTab==='comandas')body=renderComandasV14();
    else if(salaoTab==='garcons')body=renderWaitersV22();
    else body=renderSalonSettingsV22();
    root.innerHTML=
      '<div class="page-head">'+
        '<div><h1>Gestão do salão</h1><p>Mesas, comandas, garçons e regras de atendimento em uma operação única.</p></div>'+
        '<div class="page-head-actions">'+
          (salaoTab==='mesas'?'<button class="btn btn-outline" onclick="manageTableQrV22()">'+icon('qr-code')+'<span>QR das mesas</span></button><button class="btn btn-primary" onclick="createTableV14()">'+icon('plus-lg')+'<span>Nova mesa</span></button>':
           salaoTab==='garcons'?'<button class="btn btn-primary" onclick="createWaiterV22()">'+icon('person-plus')+'<span>Novo garçom</span></button>':
           salaoTab==='comandas'?'<button class="btn btn-primary" onclick="go(\'pdv\')">'+icon('plus-lg')+'<span>Novo pedido</span></button>':'')+
        '</div>'+
      '</div>'+
      '<div class="salon-kpis">'+
        '<div><span>Total de mesas</span><b>'+state.tables.length+'</b></div>'+
        '<div><span>Livres</span><b>'+state.tables.filter(function(t){return t.status==='free'}).length+'</b></div>'+
        '<div><span>Ocupadas</span><b>'+busy+'</b></div>'+
        '<div><span>Comandas abertas</span><b>'+openCommands+'</b></div>'+
        '<div><span>Garçons ativos</span><b>'+state.team.filter(function(u){return u.role==='Garçom'&&u.active}).length+' / '+waiters+'</b></div>'+
        '<div><span>Pessoas / lugares</span><b>'+guests+' / '+seats+'</b></div>'+
      '</div>'+
      '<div class="salon-section-tabs">'+
        '<button class="'+(salaoTab==='mesas'?'active':'')+'" onclick="salaoTab=\'mesas\';renderSalao()">'+icon('grid-3x3-gap')+'<span>Mesas / QR Code</span><b>'+state.tables.length+'</b></button>'+
        '<button class="'+(salaoTab==='comandas'?'active':'')+'" onclick="salaoTab=\'comandas\';renderSalao()">'+icon('receipt')+'<span>Comandas</span><b>'+openCommands+'</b></button>'+
        '<button class="'+(salaoTab==='garcons'?'active':'')+'" onclick="salaoTab=\'garcons\';renderSalao()">'+icon('people')+'<span>Garçons</span><b>'+waiters+'</b></button>'+
        '<button class="'+(salaoTab==='configuracoes'?'active':'')+'" onclick="salaoTab=\'configuracoes\';renderSalao()">'+icon('sliders2')+'<span>Configurações do salão</span></button>'+
      '</div>'+
      body;
  };

  globalThis.renderMesasGrid=function(){return renderMesasGridV14()};
  function renderMesasGridV14(){
    const areas=state.diningAreas||[];
    return '<div class="toolbar salon-toolbar">'+
      '<div class="toolbar-left">'+
        '<div class="searchbox"><span class="search-icon">'+icon('search')+'</span><input id="mesaSearch" value="'+esc(tableSearchV14)+'" placeholder="Buscar mesa ou responsável" oninput="filterTablesV14()"></div>'+
        '<select class="select" id="mesaStatus" onchange="filterTablesV14()">'+
          '<option value="all" '+(tableStatusV14==='all'?'selected':'')+'>Todos os status</option>'+
          '<option value="free" '+(tableStatusV14==='free'?'selected':'')+'>Livre</option>'+
          '<option value="busy" '+(tableStatusV14==='busy'?'selected':'')+'>Ocupada</option>'+
          '<option value="closing" '+(tableStatusV14==='closing'?'selected':'')+'>Fechando conta</option>'+
        '</select>'+
        '<select class="select" id="mesaArea" onchange="filterTablesV14()"><option value="all">Todas as áreas</option>'+
          areas.map(function(a){return '<option value="'+a.id+'" '+(tableAreaV14===a.id?'selected':'')+'>'+esc(a.name)+'</option>'}).join('')+
        '</select>'+
      '</div>'+
      '<div class="toolbar-right">'+
        '<span class="status-legend"><span><i class="legend-dot free"></i>Livre</span><span><i class="legend-dot busy"></i>Ocupada</span><span><i class="legend-dot closing"></i>Fechando</span></span>'+
        '<button class="btn btn-outline" onclick="manageTableQrV22()">'+icon('qr-code')+'<span>QR das mesas</span></button>'+
        '<button class="btn btn-outline" onclick="bulkCreateTablesV14()">'+icon('files')+'<span>Criar várias</span></button>'+
        '<button class="btn btn-primary" onclick="go(\'pdv\')">'+icon('plus-lg')+'<span>Novo pedido</span></button>'+
      '</div>'+
    '</div>'+
    '<div class="table-zones" id="tableZones">'+areas.map(function(area){return tableZoneV14(area)}).join('')+'</div>';
  }

  function tableZoneV14(area){
    const tables=orderedTablesV14().filter(function(t){return t.area===area.id});
    const seats=tables.reduce(function(s,t){return s+(Number(t.seats)||0)},0);
    return '<section class="table-zone" data-zone="'+area.id+'">'+
      '<div class="table-zone-head"><div><span class="zone-icon">'+icon(area.id==='area-balcao'?'shop-window':'grid-3x3-gap')+'</span><div><h3>'+esc(area.name)+'</h3><p>'+tables.length+' mesa(s) • '+seats+' lugares</p></div></div><button class="icon-btn" onclick="manageTablesV14()" title="Gerenciar área">'+icon('sliders2')+'</button></div>'+
      '<div class="mesas-grid">'+(tables.map(function(t){return mesaCardV14(t)}).join('')||'<div class="empty zone-empty">Nenhuma mesa nesta área.</div>')+'</div>'+
    '</section>';
  }

  globalThis.mesaCard=function(t){return mesaCardV14(t)};
  function mesaCardV14(t){
    const os=openOrdersV14(t);
    const total=os.reduce(function(s,o){return s+orderTotal(o)},0);
    const items=os.reduce(function(s,o){return s+o.items.reduce(function(a,i){return a+(Number(i.q)||0)},0)},0);
    const search=(String(t.name)+' '+String(t.server||'')).toLowerCase();
    const meta=[(Number(t.seats)||0)+' lugares',t.guests?(t.guests+' pessoa(s)'):null,t.server||null].filter(Boolean).join(' • ');
    let strip='';
    if(t.status==='free')strip='<span>'+icon('check-circle')+' Livre</span><b>'+Number(t.seats||0)+' lugares</b>';
    else if(t.status==='closing')strip='<span>'+icon('hourglass-split')+' Fechando conta</span><b>'+money(total)+'</b>';
    else strip='<span class="mesa-count">'+icon('receipt')+' '+items+' item(ns) • '+os.length+' pedido(s)</span><b>'+money(total)+'</b>';
    return '<article class="mesa" data-name="'+esc(search)+'" data-status="'+t.status+'" data-area="'+esc(t.area||'')+'">'+
      '<div class="mesa-main">'+
        '<div class="mesa-top"><div class="mesa-name-wrap"><span class="mesa-name">'+esc(t.name)+'</span><span class="mesa-area">'+esc(tableAreaNameV14(t))+'</span></div>'+
        '<div class="mesa-actions"><button onclick="newTableOrderV14(\''+t.id+'\')" title="Novo pedido">'+icon('plus-lg')+'<span>Pedido</span></button><button onclick="tableMenuV14(\''+t.id+'\')" title="Gerenciar mesa">'+icon('sliders2')+'<span>Gerenciar</span></button></div></div>'+
        '<div class="mesa-meta">'+icon('people')+'<span>'+esc(meta||'Sem detalhes')+'</span></div>'+
      '</div>'+
      '<div class="mesa-strip '+t.status+'">'+strip+'</div>'+
    '</article>';
  }

  globalThis.filterTables=function(){filterTablesV14()};
  globalThis.filterTablesV14=function(){
    tableSearchV14=(document.getElementById('mesaSearch')?.value||'').trim().toLowerCase();
    tableStatusV14=document.getElementById('mesaStatus')?.value||'all';
    tableAreaV14=document.getElementById('mesaArea')?.value||'all';
    document.querySelectorAll('#tableZones .mesa').forEach(function(card){
      const show=(!tableSearchV14||card.dataset.name.includes(tableSearchV14))&&(tableStatusV14==='all'||card.dataset.status===tableStatusV14)&&(tableAreaV14==='all'||card.dataset.area===tableAreaV14);
      card.hidden=!show;
    });
    document.querySelectorAll('#tableZones .table-zone').forEach(function(zone){
      if(tableAreaV14!=='all'&&zone.dataset.zone!==tableAreaV14){zone.hidden=true;return}
      const visible=[...zone.querySelectorAll('.mesa')].some(function(card){return !card.hidden});
      zone.hidden=!visible&&zone.querySelectorAll('.mesa').length>0;
    });
  };

  globalThis.newTableOrder=function(ref){newTableOrderV14(ref)};
  globalThis.newTableOrderV14=function(ref){
    const t=state.tables.find(function(x){return x.id===ref||x.name===ref});
    if(!t){toast('Mesa não encontrada.','error');return}
    pdvType='Mesa';
    pdvDraftTable=t.name;
    pdvCart=[];
    pdvEditingId='';
    pdvCustomerDraft='';
    pdvPayDraft='PIX';
    go('pdv');
    renderPdv();
    toast('Novo pedido vinculado a '+t.name+'.','info');
  };

  globalThis.tableMenu=function(id){tableMenuV14(id)};
  globalThis.tableMenuV14=function(id){
    const t=state.tables.find(function(x){return x.id===id});
    if(!t)return;
    const os=openOrdersV14(t);
    const total=os.reduce(function(s,o){return s+orderTotal(o)},0);
    const items=os.reduce(function(s,o){return s+o.items.reduce(function(a,i){return a+(Number(i.q)||0)},0)},0);
    const history=state.orders.filter(function(o){return o.table===t.name&&['done','cancelled'].includes(o.status)}).sort(function(a,b){return new Date(b.completedAt||b.cancelledAt||b.createdAt)-new Date(a.completedAt||a.cancelledAt||a.createdAt)}).slice(0,5);
    function row(o){
      const meta=o.status==='analysis'?['Em análise','b-orange']:o.status==='production'?['Em produção','b-orange']:o.status==='ready'?['Pronto','b-green']:o.status==='done'?['Concluído','b-green']:['Cancelado','b-red'];
      const qty=o.items.reduce(function(sum,i){return sum+(Number(i.q)||0)},0);
      return '<div class="table-order-row"><div class="table-order-id"><b>#'+esc(o.id)+'</b><span class="badge '+meta[1]+'">'+meta[0]+'</span></div><div class="table-order-copy"><b>'+qty+' item(ns) • '+money(orderTotal(o))+'</b><span>'+esc(o.customer||'Não identificado')+' • '+esc(orderPaymentLabel(o))+'</span>'+(o.cancelReason?'<small>'+icon('info-circle')+' '+esc(o.cancelReason)+'</small>':'')+'</div><button class="btn btn-outline btn-sm" onclick="detailsOrder(\''+o.id+'\')">Gerenciar</button></div>';
    }
    openModal(
      '<div class="modal-head"><div><h2>'+esc(t.name)+'</h2><p class="dialog-subtitle">'+esc(tableAreaNameV14(t))+' • '+Number(t.seats||0)+' lugares'+(t.server?' • '+esc(t.server):'')+'</p></div><button class="icon-btn" onclick="closeModal()" aria-label="Fechar">'+icon('x-lg')+'</button></div>'+
      '<div class="table-detail-grid">'+
        '<div><span>Status</span><b class="badge '+(t.status==='free'?'b-green':t.status==='closing'?'b-orange':'b-red')+'">'+tableStatusLabelV14(t.status)+'</b></div>'+
        '<div><span>Pessoas</span><b>'+Number(t.guests||0)+' / '+Number(t.seats||0)+'</b></div>'+
        '<div><span>Pedidos abertos</span><b>'+os.length+'</b></div>'+
        '<div><span>Itens</span><b>'+items+'</b></div>'+
      '</div>'+
      '<div class="table-consumption"><span>Consumo atual</span><strong>'+money(total)+'</strong></div>'+
      '<section class="table-orders-section"><div class="table-orders-head"><div><b>Pedidos desta mesa</b><span>Abra qualquer pedido para editar, imprimir ou cancelar.</span></div><button class="btn btn-primary btn-sm" onclick="closeModal();newTableOrderV14(\''+id+'\')">'+icon('plus-lg')+'<span>Adicionar pedido</span></button></div><div class="table-orders-list">'+(os.map(row).join('')||'<div class="empty compact-empty">Nenhum pedido aberto nesta mesa.</div>')+'</div></section>'+
      (history.length?'<section class="table-orders-section history"><div class="table-orders-head"><div><b>Histórico recente</b><span>Últimos pedidos concluídos ou cancelados nesta mesa.</span></div></div><div class="table-orders-list">'+history.map(row).join('')+'</div></section>':'')+
      '<div class="modal-foot table-modal-actions">'+
        '<button class="btn btn-outline" onclick="editTableV14(\''+id+'\')">'+icon('pencil')+'<span>Editar mesa</span></button>'+
        (t.status!=='free'?'<button class="btn btn-outline" onclick="transferTableV14(\''+id+'\')">'+icon('arrow-left-right')+'<span>Transferir</span></button><button class="btn btn-outline" onclick="tSetV14(\''+id+'\',\'closing\')">'+icon('receipt')+'<span>Marcar fechamento</span></button><button class="btn btn-green" onclick="closeModal();openTableCheckoutV22(\''+id+'\')">'+icon('cash-coin')+'<span>Fechar conta</span></button>':'<button class="btn btn-primary" onclick="closeModal();newTableOrderV14(\''+id+'\')">'+icon('plus-lg')+'<span>Novo pedido</span></button>')+
      '</div>'
    );
  };

  globalThis.transferTable=function(id){return transferTableV14(id)};
  globalThis.transferTableV14=async function(id){
    const t=state.tables.find(function(x){return x.id===id});
    if(!t)return;
    const options=orderedTablesV14().filter(function(x){return x.id!==id}).map(function(x){return {value:x.name,label:x.name+' — '+tableAreaNameV14(x)+' ('+tableStatusLabelV14(x.status)+')'}});
    const v=await formDialog({title:'Transferir mesa',subtitle:'Mover pedidos de '+t.name,fields:[{key:'dest',label:'Mesa de destino',type:'select',options:options,required:true}]});
    if(!v)return;
    const dest=state.tables.find(function(x){return x.name===v.dest});
    state.orders.filter(function(o){return o.table===t.name&&!['done','cancelled'].includes(o.status)}).forEach(function(o){o.table=v.dest});
    if(dest){
      dest.guests=Math.min(Number(dest.seats)||0,(Number(dest.guests)||0)+(Number(t.guests)||0));
      if(!dest.server)dest.server=t.server||'';
    }
    t.guests=0;t.server='';
    closeModal();syncTables();save();toast('Pedidos transferidos.','success');
  };

  globalThis.tSet=function(id,s){tSetV14(id,s)};
  globalThis.tSetV14=function(id,s){
    const t=state.tables.find(function(x){return x.id===id});
    if(!t)return;
    t.status=s;closeModal();save();
  };

  globalThis.tFinish=function(id){tFinishV14(id)};
  globalThis.tFinishV14=function(id){return openTableCheckoutV22(id)};

  globalThis.createTable=function(){return createTableV14()};
  globalThis.createTableV14=async function(){
    const areas=(state.diningAreas||[]).map(function(a){return {value:a.id,label:a.name}});
    const v=await formDialog({title:'Nova mesa',subtitle:'Cadastre a mesa na área correta para manter o salão organizado.',fields:[
      {key:'name',label:'Nome da mesa',value:'Mesa '+(state.tables.length+1),required:true},
      {key:'area',label:'Área',type:'select',value:areas[0]?.value,options:areas,required:true},
      {key:'seats',label:'Capacidade',type:'number',value:4,min:1,step:'1',required:true}
    ]});
    if(!v?.name)return;
    const name=v.name.trim();
    if(state.tables.some(function(t){return t.name.toLowerCase()===name.toLowerCase()})){toast('Já existe uma mesa com esse nome.','warning');return}
    const same=state.tables.filter(function(t){return t.area===v.area});
    state.tables.push({id:uid('t'),name:name,status:'free',area:v.area,seats:Math.max(1,Number(v.seats)||4),guests:0,server:'',order:same.length});
    save();toast('Mesa criada.','success');
  };

  globalThis.bulkCreateTablesV14=async function(){
    const areas=(state.diningAreas||[]).map(function(a){return {value:a.id,label:a.name}});
    const v=await formDialog({title:'Criar várias mesas',subtitle:'Crie uma sequência rapidamente, por exemplo Mesa 1 até Mesa 10.',fields:[
      {key:'prefix',label:'Prefixo',value:'Mesa',required:true},
      {key:'start',label:'Número inicial',type:'number',value:1,min:1,step:'1',required:true},
      {key:'count',label:'Quantidade',type:'number',value:5,min:1,step:'1',required:true},
      {key:'area',label:'Área',type:'select',value:areas[0]?.value,options:areas,required:true},
      {key:'seats',label:'Lugares por mesa',type:'number',value:4,min:1,step:'1',required:true}
    ]});
    if(!v)return;
    const count=Math.min(50,Math.max(1,Number(v.count)||1));
    const start=Math.max(1,Number(v.start)||1);
    const existing=new Set(state.tables.map(function(t){return t.name.toLowerCase()}));
    let created=0;
    let order=state.tables.filter(function(t){return t.area===v.area}).length;
    for(let i=0;i<count;i++){
      const name=String(v.prefix||'Mesa').trim()+' '+(start+i);
      if(existing.has(name.toLowerCase()))continue;
      state.tables.push({id:uid('t'),name:name,status:'free',area:v.area,seats:Math.max(1,Number(v.seats)||4),guests:0,server:'',order:order++});
      existing.add(name.toLowerCase());created++;
    }
    save();toast(created+' mesa(s) criada(s).',created?'success':'warning');
  };

  globalThis.editTableV14=async function(id){
    const t=state.tables.find(function(x){return x.id===id});
    if(!t)return;
    const areas=(state.diningAreas||[]).map(function(a){return {value:a.id,label:a.name}});
    const v=await formDialog({title:'Editar mesa',subtitle:t.name,fields:[
      {key:'name',label:'Nome',value:t.name,required:true},
      {key:'area',label:'Área',type:'select',value:t.area,options:areas,required:true},
      {key:'seats',label:'Capacidade',type:'number',value:t.seats||4,min:1,step:'1',required:true},
      {key:'guests',label:'Pessoas sentadas',type:'number',value:t.guests||0,min:0,step:'1'},
      {key:'server',label:'Responsável',type:'select',value:t.server||'',options:serverOptionsV14()}
    ]});
    if(!v)return;
    const name=v.name.trim();
    if(state.tables.some(function(x){return x.id!==id&&x.name.toLowerCase()===name.toLowerCase()})){toast('Já existe outra mesa com esse nome.','warning');return}
    const old=t.name;
    t.name=name;t.area=v.area;t.seats=Math.max(1,Number(v.seats)||4);t.guests=Math.min(t.seats,Math.max(0,Number(v.guests)||0));t.server=v.server||'';
    if(old!==name)state.orders.filter(function(o){return o.table===old&&!['done','cancelled'].includes(o.status)}).forEach(function(o){o.table=name});
    closeModal();save();toast('Mesa atualizada.','success');
  };

  globalThis.deleteTableV14=async function(id){
    const t=state.tables.find(function(x){return x.id===id});
    if(!t)return;
    if(openOrdersV14(t).length||t.status!=='free'){toast('Libere a mesa antes de excluí-la.','warning');return}
    const ok=await confirmDialog('Excluir mesa','Excluir '+t.name+'?',{confirmLabel:'Excluir',danger:true});
    if(!ok)return;
    state.tables=state.tables.filter(function(x){return x.id!==id});
    save();toast('Mesa excluída.','success');manageTablesV14();
  };

  globalThis.moveTableV14=function(id,dir){
    const t=state.tables.find(function(x){return x.id===id});if(!t)return;
    const list=orderedTablesV14().filter(function(x){return x.area===t.area});
    const index=list.findIndex(function(x){return x.id===id});
    const other=list[index+dir];if(!other)return;
    const a=Number(t.order)||index,b=Number(other.order)||(index+dir);
    t.order=b;other.order=a;save();manageTablesV14();
  };

  globalThis.manageTablesV14=function(){
    const areas=state.diningAreas||[];
    const tables=orderedTablesV14();
    openModal(
      '<div class="modal-head"><div><h2>Organização do salão</h2><p class="dialog-subtitle">Gerencie áreas, capacidade, responsáveis e ordem de exibição das mesas.</p></div><button class="icon-btn" onclick="closeModal()" aria-label="Fechar">'+icon('x-lg')+'</button></div>'+
      '<div class="table-manager-toolbar"><button class="btn btn-primary" onclick="createTableV14()">'+icon('plus-lg')+'<span>Nova mesa</span></button><button class="btn btn-outline" onclick="bulkCreateTablesV14()">'+icon('files')+'<span>Criar várias</span></button><button class="btn btn-outline" onclick="addDiningAreaV14()">'+icon('plus-square')+'<span>Nova área</span></button></div>'+
      '<div class="area-manager">'+areas.map(function(a){
        const count=state.tables.filter(function(t){return t.area===a.id}).length;
        return '<div class="area-manager-row"><div><b>'+esc(a.name)+'</b><span>'+count+' mesa(s)</span></div><div><button class="icon-btn" onclick="renameDiningAreaV14(\''+a.id+'\')" title="Renomear">'+icon('pencil')+'</button><button class="icon-btn danger-icon" onclick="deleteDiningAreaV14(\''+a.id+'\')" title="Excluir">'+icon('trash')+'</button></div></div>';
      }).join('')+'</div>'+
      '<div class="table-manager-list">'+tables.map(function(t){
        return '<div class="table-manager-row"><div class="table-manager-main"><span class="table-manager-icon">'+icon('grid-3x3-gap')+'</span><div><b>'+esc(t.name)+'</b><span>'+esc(tableAreaNameV14(t))+' • '+Number(t.seats||0)+' lugares'+(t.server?' • '+esc(t.server):'')+'</span></div></div><span class="badge '+(t.status==='free'?'b-green':t.status==='closing'?'b-orange':'b-red')+'">'+tableStatusLabelV14(t.status)+'</span><div class="table-manager-actions"><button class="icon-btn" onclick="moveTableV14(\''+t.id+'\',-1)" title="Subir">'+icon('arrow-up')+'</button><button class="icon-btn" onclick="moveTableV14(\''+t.id+'\',1)" title="Descer">'+icon('arrow-down')+'</button><button class="icon-btn" onclick="editTableV14(\''+t.id+'\')" title="Editar">'+icon('pencil')+'</button><button class="icon-btn danger-icon" onclick="deleteTableV14(\''+t.id+'\')" title="Excluir">'+icon('trash')+'</button></div></div>';
      }).join('')+'</div>'+
      '<div class="modal-foot"><button class="btn btn-outline" onclick="closeModal();renderSalao()">Concluir</button></div>'
    );
  };

  globalThis.addDiningAreaV14=async function(){
    const v=await formDialog({title:'Nova área',fields:[{key:'name',label:'Nome da área',value:'Nova área',required:true}]});
    if(!v?.name)return;
    const name=v.name.trim();
    if(state.diningAreas.some(function(a){return a.name.toLowerCase()===name.toLowerCase()})){toast('Área já existente.','warning');return}
    state.diningAreas.push({id:uid('area-'),name:name});save();manageTablesV14();
  };

  globalThis.renameDiningAreaV14=async function(id){
    const a=diningAreaV14(id);if(!a)return;
    const v=await formDialog({title:'Renomear área',fields:[{key:'name',label:'Nome',value:a.name,required:true}]});
    if(!v?.name)return;
    a.name=v.name.trim();save();manageTablesV14();
  };

  globalThis.deleteDiningAreaV14=async function(id){
    const a=diningAreaV14(id);if(!a)return;
    if(state.diningAreas.length<=1){toast('Mantenha pelo menos uma área.','warning');return}
    if(state.tables.some(function(t){return t.area===id})){toast('Mova as mesas desta área antes de excluí-la.','warning');return}
    const ok=await confirmDialog('Excluir área','Excluir '+a.name+'?',{confirmLabel:'Excluir',danger:true});if(!ok)return;
    state.diningAreas=state.diningAreas.filter(function(x){return x.id!==id});save();manageTablesV14();
  };

  function qrPayloadV22(t){
    return 'X BURGUER • '+t.name+' • '+tableAreaNameV14(t)+' • ID '+t.id;
  }
  globalThis.manageTableQrV22=function(){
    const cards=orderedTablesV14().map(function(t){
      const qrSrc=globalThis.XBIntegrations?.tableQrImageUrl?.(qrPayloadV22(t),180)||'';
      return '<article class="table-qr-card"><img src="'+esc(qrSrc)+'" alt="QR de identificação da '+esc(t.name)+'" loading="lazy"><div><b>'+esc(t.name)+'</b><span>'+esc(tableAreaNameV14(t))+'</span><small>Identificação interna da mesa nesta versão.</small></div><button class="btn btn-outline btn-sm" onclick="editTableV14(\''+t.id+'\')">'+icon('pencil')+'<span>Editar</span></button></article>';
    }).join('');
    openModal('<div class="modal-head"><div><h2>Mesas — QR Code</h2><p class="dialog-subtitle">Identifique e organize as mesas visualmente. O pedido direto pelo QR será conectado ao backend em uma etapa futura.</p></div><button class="icon-btn" onclick="closeModal()" aria-label="Fechar">'+icon('x-lg')+'</button></div><div class="qr-manager-actions"><button class="btn btn-primary" onclick="createTableV14()">'+icon('plus-lg')+'<span>Criar mesa</span></button><button class="btn btn-outline" onclick="bulkCreateTablesV14()">'+icon('files')+'<span>Criar várias</span></button></div><div class="table-qr-grid">'+(cards||'<div class="empty">Nenhuma mesa cadastrada.</div>')+'</div><div class="modal-foot"><button class="btn btn-primary" onclick="closeModal()">Concluir</button></div>');
  };

  function renderWaitersV22(){
    const waiters=state.team.filter(function(u){return u.role==='Garçom'});
    return '<div class="salon-subhead"><div><h2>Garçons</h2><p>Cadastre quem atende o salão e associe responsáveis às mesas.</p></div><div class="searchbox"><span class="search-icon">'+icon('search')+'</span><input id="waiterSearchV22" placeholder="Buscar garçom" oninput="filterWaitersV22()"></div></div>'+
      '<div class="waiters-table-wrap"><table class="table waiters-table"><thead><tr><th>Status</th><th>Nome</th><th>E-mail</th><th>WhatsApp</th><th>Mesas</th><th></th></tr></thead><tbody>'+
      (waiters.map(function(u){
        const assigned=state.tables.filter(function(t){return t.server===u.name&&t.status!=='free'}).length;
        const search=(u.name+' '+(u.email||'')+' '+(u.phone||'')).toLowerCase();
        return '<tr data-waiter-search="'+esc(search)+'"><td><button class="waiter-toggle '+(u.active?'on':'')+'" onclick="toggleWaiterV22(\''+u.id+'\')" title="'+(u.active?'Desativar':'Ativar')+'"><span></span></button></td><td><b>'+esc(u.name)+'</b></td><td>'+esc(u.email||'—')+'</td><td>'+esc(u.phone||'—')+'</td><td>'+assigned+'</td><td><div class="row-actions"><button class="icon-btn" onclick="editWaiterV22(\''+u.id+'\')" title="Editar">'+icon('pencil')+'</button><button class="icon-btn" onclick="openWaiterTablesV22(\''+u.id+'\')" title="Mesas">'+icon('grid-3x3-gap')+'</button></div></td></tr>';
      }).join('')||'<tr><td colspan="6"><div class="empty">Nenhum garçom cadastrado.</div></td></tr>')+
      '</tbody></table></div>';
  }
  globalThis.filterWaitersV22=function(){
    const q=(document.getElementById('waiterSearchV22')?.value||'').trim().toLowerCase();
    document.querySelectorAll('[data-waiter-search]').forEach(function(row){row.hidden=!!q&&!row.dataset.waiterSearch.includes(q)});
  };
  globalThis.createWaiterV22=async function(){
    const v=await formDialog({title:'Novo garçom',subtitle:'Cadastre os dados usados na operação do salão.',fields:[
      {key:'name',label:'Nome',required:true},
      {key:'email',label:'E-mail',type:'email',placeholder:'garcom@xburguer.com'},
      {key:'phone',label:'WhatsApp',placeholder:'(62) 9____-____'}
    ]});
    if(!v?.name)return;
    const name=v.name.trim();
    if(state.team.some(function(u){return u.name.toLowerCase()===name.toLowerCase()})){toast('Já existe um colaborador com esse nome.','warning');return}
    state.team.push({id:uid('u'),name:name,role:'Garçom',active:true,email:String(v.email||'').trim(),phone:String(v.phone||'').trim()});
    save();renderSalao();toast('Garçom cadastrado.','success');
  };
  globalThis.editWaiterV22=async function(id){
    const u=state.team.find(function(x){return x.id===id&&x.role==='Garçom'});if(!u)return;
    const oldName=u.name;
    const v=await formDialog({title:'Editar garçom',subtitle:u.name,fields:[
      {key:'name',label:'Nome',value:u.name,required:true},
      {key:'email',label:'E-mail',type:'email',value:u.email||''},
      {key:'phone',label:'WhatsApp',value:u.phone||''}
    ]});
    if(!v?.name)return;
    const name=v.name.trim();
    if(state.team.some(function(x){return x.id!==id&&x.name.toLowerCase()===name.toLowerCase()})){toast('Já existe outro colaborador com esse nome.','warning');return}
    u.name=name;u.email=String(v.email||'').trim();u.phone=String(v.phone||'').trim();
    if(oldName!==name)state.tables.filter(function(t){return t.server===oldName}).forEach(function(t){t.server=name});
    save();renderSalao();toast('Garçom atualizado.','success');
  };
  globalThis.toggleWaiterV22=function(id){
    const u=state.team.find(function(x){return x.id===id&&x.role==='Garçom'});if(!u)return;
    u.active=!u.active;
    if(!u.active)state.tables.filter(function(t){return t.server===u.name}).forEach(function(t){t.server=''});
    save();renderSalao();
  };
  globalThis.openWaiterTablesV22=function(id){
    const u=state.team.find(function(x){return x.id===id&&x.role==='Garçom'});if(!u)return;
    const tables=state.tables.filter(function(t){return t.server===u.name&&t.status!=='free'});
    openModal('<div class="modal-head"><div><h2>'+esc(u.name)+'</h2><p class="dialog-subtitle">Mesas atualmente atribuídas a este garçom.</p></div><button class="icon-btn" onclick="closeModal()" aria-label="Fechar">'+icon('x-lg')+'</button></div><div class="waiter-table-list">'+(tables.map(function(t){return '<button class="waiter-table-card" onclick="closeModal();tableMenuV14(\''+t.id+'\')"><div><b>'+esc(t.name)+'</b><span>'+esc(tableAreaNameV14(t))+'</span></div><strong>'+money(openOrdersV14(t).reduce(function(s,o){return s+orderTotal(o)},0))+'</strong></button>'}).join('')||'<div class="empty">Nenhuma mesa atribuída no momento.</div>')+'</div>');
  };

  function salonModeButtonV22(mode,label,help){
    const on=(state.settings.salon.serviceModes||[]).includes(mode);
    return '<button class="salon-mode-card '+(on?'active':'')+'" onclick="toggleSalonModeV22(\''+mode+'\')"><span class="salon-mode-check">'+icon(on?'check-square-fill':'square')+'</span><div><b>'+esc(label)+'</b><span>'+esc(help)+'</span></div></button>';
  }
  function renderSalonSettingsV22(){
    const s=state.settings.salon||{};
    return '<div class="salon-settings-v22">'+
      '<section class="salon-settings-card"><div class="salon-settings-title"><div><span>Atendimento de salão</span><h2>Você tem atendimento de salão no estabelecimento?</h2></div><button class="waiter-toggle '+(s.enabled?'on':'')+'" onclick="toggleSalonEnabledV22()"><span></span></button></div></section>'+
      '<section class="salon-settings-card"><div class="salon-settings-title"><div><span>Estrutura e modelo de negócio</span><h2>Como o salão está organizado</h2></div></div><div class="salon-settings-grid"><div class="salon-number-box"><span>Quantidade de mesas</span><b>'+state.tables.length+'</b><small>Mesas atualmente cadastradas</small><button class="btn btn-outline btn-sm" onclick="manageTablesV14()">Organizar mesas</button></div><div class="salon-number-box"><span>Quantidade de comandas</span><b>'+Number(s.commandCount||0)+'</b><small>Capacidade planejada de comandas</small><button class="btn btn-outline btn-sm" onclick="setCommandCountV22()">Alterar</button></div><div class="salon-number-box"><span>Possui garçons?</span><b>'+(s.hasWaiters?'Sim':'Não')+'</b><small>'+state.team.filter(function(u){return u.role==='Garçom'&&u.active}).length+' ativos</small><button class="btn btn-outline btn-sm" onclick="toggleSalonWaitersV22()">Alternar</button></div><div class="salon-number-box"><span>Taxa de serviço</span><b>'+Number(state.settings.serviceFee||0)+'%</b><small>Aplicada aos pedidos em mesa</small><button class="btn btn-outline btn-sm" onclick="setSalonServiceFeeV22()">Alterar</button></div></div></section>'+
      '<section class="salon-settings-card"><div class="salon-settings-title"><div><span>Como você opera?</span><h2>Modelo principal do salão</h2></div></div><div class="salon-model-grid">'+[
        ['a-la-carte','À la carte','Cardápio físico ou digital'],
        ['self-service','Buffet / Self Service','Preço único ou por quilo'],
        ['rodizio','Rodízio','Garçons oferecem variedades'],
        ['none','Sem atendimento no salão','Operação somente fora do salão']
      ].map(function(x){return '<button class="salon-model-card '+(s.operationModel===x[0]?'active':'')+'" onclick="setSalonModelV22(\''+x[0]+'\')"><span>'+icon(s.operationModel===x[0]?'record-circle-fill':'circle')+'</span><div><b>'+x[1]+'</b><small>'+x[2]+'</small></div></button>'}).join('')+'</div></section>'+
      '<section class="salon-settings-card"><div class="salon-settings-title"><div><span>Como atende o cliente?</span><h2>Canais utilizados no salão</h2></div></div><div class="salon-mode-grid">'+salonModeButtonV22('table','Em mesa','Garçom atende diretamente nas mesas')+salonModeButtonV22('command','Comanda individual','Consumo registrado por cliente/comanda')+salonModeButtonV22('counter','No balcão','Cliente se dirige ao balcão')+'</div></section>'+
    '</div>';
  }
  globalThis.toggleSalonEnabledV22=function(){state.settings.salon.enabled=!state.settings.salon.enabled;save();renderSalao()};
  globalThis.toggleSalonWaitersV22=function(){state.settings.salon.hasWaiters=!state.settings.salon.hasWaiters;save();renderSalao()};
  globalThis.setCommandCountV22=async function(){const v=await formDialog({title:'Quantidade de comandas',fields:[{key:'count',label:'Comandas',type:'number',value:state.settings.salon.commandCount||0,min:0,max:500,step:'1',required:true}]});if(!v)return;state.settings.salon.commandCount=Math.min(500,Math.max(0,Number(v.count)||0));save();renderSalao()};
  globalThis.setSalonServiceFeeV22=async function(){const v=await formDialog({title:'Taxa de serviço',fields:[{key:'fee',label:'Percentual',type:'number',value:state.settings.serviceFee||0,min:0,max:30,step:'0.5',required:true}]});if(!v)return;state.settings.serviceFee=Math.min(30,Math.max(0,Number(v.fee)||0));save();renderSalao()};
  globalThis.setSalonModelV22=function(model){state.settings.salon.operationModel=model;save();renderSalao()};
  globalThis.toggleSalonModeV22=function(mode){const set=new Set(state.settings.salon.serviceModes||[]);if(set.has(mode)&&set.size>1)set.delete(mode);else set.add(mode);state.settings.salon.serviceModes=[...set];save();renderSalao()};


  globalThis.renderComandas=function(){return renderComandasV14()};
  function renderComandasV14(){
    const occupied=orderedTablesV14().filter(function(t){return t.status!=='free'});
    const total=occupied.reduce(function(sum,t){return sum+openOrdersV14(t).reduce(function(s,o){return s+orderTotal(o)},0)},0);
    return '<div class="commands-summary-v22"><div><span>Comandas abertas</span><b>'+occupied.length+'</b></div><div><span>Capacidade configurada</span><b>'+Number(state.settings.salon.commandCount||0)+'</b></div><div><span>Valor em aberto</span><b>'+money(total)+'</b></div><div><span>Fechando conta</span><b>'+occupied.filter(function(t){return t.status==='closing'}).length+'</b></div></div>'+
      '<div class="salon-subhead commands-head-v22"><div><h2>Comandas do salão</h2><p>Acompanhe consumo, responsável, pedidos e fechamento de cada mesa/comanda.</p></div><div class="searchbox"><span class="search-icon">'+icon('search')+'</span><input id="commandSearchV22" placeholder="Buscar mesa, garçom ou comanda" oninput="filterCommandsV22()"></div></div>'+
      '<div class="card commands-card"><div class="table-shell"><table class="table"><thead><tr><th>Mesa / comanda</th><th>Área</th><th>Responsável</th><th>Pessoas</th><th>Status</th><th>Pedidos</th><th>Total</th><th></th></tr></thead><tbody>'+
      (occupied.map(function(t,i){
        const os=openOrdersV14(t),search=(t.name+' '+tableAreaNameV14(t)+' '+(t.server||'')+' C-'+(201+i)).toLowerCase();
        return '<tr data-command-search="'+esc(search)+'"><td><b>#C-'+(201+i)+'</b><br><span class="muted">'+esc(t.name)+'</span></td><td>'+esc(tableAreaNameV14(t))+'</td><td>'+esc(t.server||'—')+'</td><td>'+Number(t.guests||0)+' / '+Number(t.seats||0)+'</td><td><span class="badge '+(t.status==='closing'?'b-orange':'b-red')+'">'+tableStatusLabelV14(t.status)+'</span></td><td>'+os.length+'</td><td><b>'+money(os.reduce(function(s,o){return s+orderTotal(o)},0))+'</b></td><td><div class="row-actions"><button class="btn btn-outline btn-sm" onclick="tableMenuV14(\''+t.id+'\')">Gerenciar</button><button class="btn btn-green btn-sm" onclick="openTableCheckoutV22(\''+t.id+'\')">Fechar</button></div></td></tr>';
      }).join('')||'<tr><td colspan="8"><div class="empty">Nenhuma comanda aberta.</div></td></tr>')+
      '</tbody></table></div></div>';
  }
  globalThis.filterCommandsV22=function(){
    const q=(document.getElementById('commandSearchV22')?.value||'').trim().toLowerCase();
    document.querySelectorAll('[data-command-search]').forEach(function(row){row.hidden=!!q&&!row.dataset.commandSearch.includes(q)});
  };
})();

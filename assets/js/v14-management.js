/* X Burguer Central V14 — gestão avançada de salão e cardápio */
(function(){
  const baseNormalizeV14=normalize;
  normalize=function(){
    baseNormalizeV14();
    state.diningAreas=Array.isArray(state.diningAreas)&&state.diningAreas.length?state.diningAreas:[
      {id:'area-salao',name:'Salão principal'},
      {id:'area-varanda',name:'Varanda'},
      {id:'area-balcao',name:'Balcão'}
    ];
    state.tables.forEach(function(t,i){
      const counter=String(t.name||'').toLowerCase().includes('balc');
      if(!t.area||!state.diningAreas.some(function(a){return a.id===t.area}))t.area=counter?'area-balcao':'area-salao';
      t.seats=Math.max(1,Number(t.seats)|| (counter?2:4));
      t.guests=Math.max(0,Math.min(t.seats,Number(t.guests)||0));
      t.server=t.server||'';
      t.order=Number.isFinite(Number(t.order))?Number(t.order):i;
    });
    state.products.forEach(function(p){
      p.description=p.description||'';
      p.station=p.station||'Cozinha';
      p.min=Math.max(0,Number(p.min)||0);
      p.cost=Math.max(0,Number(p.cost)||0);
      p.stock=Math.max(0,Number(p.stock)||0);
      p.active=p.active!==false;
      p.sold=Boolean(p.sold||p.stock<=0);
    });
  };

  let tableSearchV14='';
  let tableStatusV14='all';
  let tableAreaV14='all';
  let menuStatusV14='all';
  let menuSortV14='name';
  let menuSelectedV14=new Set();

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

  renderSalao=function(){
    syncTables();
    const root=document.getElementById('salao');
    const busy=state.tables.filter(function(t){return t.status==='busy'}).length;
    const closing=state.tables.filter(function(t){return t.status==='closing'}).length;
    const seats=state.tables.reduce(function(s,t){return s+(Number(t.seats)||0)},0);
    const guests=state.tables.reduce(function(s,t){return s+(Number(t.guests)||0)},0);
    root.innerHTML=
      '<div class="page-head">'+
        '<div><h1>Gestão do salão</h1><p>Organize áreas, mesas, capacidade, responsáveis, comandas e contas em um único lugar.</p></div>'+
        '<div class="page-head-actions">'+
          '<button class="btn btn-outline" onclick="manageTablesV14()">'+icon('grid-3x3-gap')+'<span>Organizar mesas</span></button>'+
          '<button class="btn btn-primary" onclick="createTableV14()">'+icon('plus-lg')+'<span>Nova mesa</span></button>'+
        '</div>'+
      '</div>'+
      '<div class="salon-kpis">'+
        '<div><span>Total de mesas</span><b>'+state.tables.length+'</b></div>'+
        '<div><span>Livres</span><b>'+state.tables.filter(function(t){return t.status==='free'}).length+'</b></div>'+
        '<div><span>Ocupadas</span><b>'+busy+'</b></div>'+
        '<div><span>Fechando</span><b>'+closing+'</b></div>'+
        '<div><span>Pessoas / lugares</span><b>'+guests+' / '+seats+'</b></div>'+
      '</div>'+
      '<div class="mesas-tabs">'+
        '<button class="'+(salaoTab==='mesas'?'active':'')+'" onclick="salaoTab=\'mesas\';renderSalao()">Mesas <span>'+state.tables.length+'</span></button>'+
        '<button class="'+(salaoTab==='comandas'?'active':'')+'" onclick="salaoTab=\'comandas\';renderSalao()">Comandas <span>'+state.tables.filter(function(t){return t.status!=='free'}).length+'</span></button>'+
      '</div>'+
      (salaoTab==='mesas'?renderMesasGridV14():renderComandasV14());
  };

  renderMesasGrid=function(){return renderMesasGridV14()};
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

  mesaCard=function(t){return mesaCardV14(t)};
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
        '<div class="mesa-actions"><button onclick="newTableOrderV14(\''+esc(t.name)+'\')" title="Novo pedido">'+icon('plus-lg')+'<span>Pedido</span></button><button onclick="tableMenuV14(\''+t.id+'\')" title="Mais ações">'+icon('three-dots')+'</button></div></div>'+
        '<div class="mesa-meta">'+icon('people')+'<span>'+esc(meta||'Sem detalhes')+'</span></div>'+
      '</div>'+
      '<div class="mesa-strip '+t.status+'">'+strip+'</div>'+
    '</article>';
  }

  filterTables=function(){filterTablesV14()};
  filterTablesV14=function(){
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

  newTableOrder=function(name){newTableOrderV14(name)};
  newTableOrderV14=function(name){
    pdvType='Mesa';
    pdvDraftTable=name;
    go('pdv');
    renderPdv();
    toast('Novo pedido vinculado a '+name+'.','info');
  };

  tableMenu=function(id){tableMenuV14(id)};
  tableMenuV14=function(id){
    const t=state.tables.find(function(x){return x.id===id});
    if(!t)return;
    const os=openOrdersV14(t);
    const total=os.reduce(function(s,o){return s+orderTotal(o)},0);
    const items=os.reduce(function(s,o){return s+o.items.reduce(function(a,i){return a+(Number(i.q)||0)},0)},0);
    openModal(
      '<div class="modal-head"><div><h2>'+esc(t.name)+'</h2><p class="dialog-subtitle">'+esc(tableAreaNameV14(t))+' • '+Number(t.seats||0)+' lugares'+(t.server?' • '+esc(t.server):'')+'</p></div><button class="icon-btn" onclick="closeModal()" aria-label="Fechar">'+icon('x-lg')+'</button></div>'+
      '<div class="table-detail-grid">'+
        '<div><span>Status</span><b class="badge '+(t.status==='free'?'b-green':t.status==='closing'?'b-orange':'b-red')+'">'+tableStatusLabelV14(t.status)+'</b></div>'+
        '<div><span>Pessoas</span><b>'+Number(t.guests||0)+' / '+Number(t.seats||0)+'</b></div>'+
        '<div><span>Pedidos</span><b>'+os.length+'</b></div>'+
        '<div><span>Itens</span><b>'+items+'</b></div>'+
      '</div>'+
      '<div class="table-consumption"><span>Consumo atual</span><strong>'+money(total)+'</strong></div>'+
      '<div class="modal-foot table-modal-actions">'+
        '<button class="btn btn-outline" onclick="editTableV14(\''+id+'\')">'+icon('pencil')+'<span>Editar mesa</span></button>'+
        (t.status!=='free'?'<button class="btn btn-outline" onclick="transferTableV14(\''+id+'\')">'+icon('arrow-left-right')+'<span>Transferir</span></button><button class="btn btn-outline" onclick="tSetV14(\''+id+'\',\'closing\')">'+icon('receipt')+'<span>Fechar conta</span></button><button class="btn btn-green" onclick="tFinishV14(\''+id+'\')">'+icon('check2-circle')+'<span>Receber e liberar</span></button>':'<button class="btn btn-primary" onclick="closeModal();newTableOrderV14(\''+esc(t.name)+'\')">'+icon('plus-lg')+'<span>Novo pedido</span></button>')+
      '</div>'
    );
  };

  transferTable=function(id){return transferTableV14(id)};
  transferTableV14=async function(id){
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

  tSet=function(id,s){tSetV14(id,s)};
  tSetV14=function(id,s){
    const t=state.tables.find(function(x){return x.id===id});
    if(!t)return;
    t.status=s;closeModal();save();
  };

  tFinish=function(id){tFinishV14(id)};
  tFinishV14=function(id){
    const t=state.tables.find(function(x){return x.id===id});
    if(!t)return;
    state.orders.filter(function(o){return o.table===t.name&&!['done','cancelled'].includes(o.status)}).forEach(function(o){o.status='done';o.completedAt=new Date().toISOString()});
    t.status='free';t.guests=0;t.server='';
    closeModal();save();toast('Conta finalizada e mesa liberada.','success');
  };

  createTable=function(){return createTableV14()};
  createTableV14=async function(){
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

  bulkCreateTablesV14=async function(){
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

  editTableV14=async function(id){
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

  deleteTableV14=async function(id){
    const t=state.tables.find(function(x){return x.id===id});
    if(!t)return;
    if(openOrdersV14(t).length||t.status!=='free'){toast('Libere a mesa antes de excluí-la.','warning');return}
    const ok=await confirmDialog('Excluir mesa','Excluir '+t.name+'?',{confirmLabel:'Excluir',danger:true});
    if(!ok)return;
    state.tables=state.tables.filter(function(x){return x.id!==id});
    save();toast('Mesa excluída.','success');manageTablesV14();
  };

  moveTableV14=function(id,dir){
    const t=state.tables.find(function(x){return x.id===id});if(!t)return;
    const list=orderedTablesV14().filter(function(x){return x.area===t.area});
    const index=list.findIndex(function(x){return x.id===id});
    const other=list[index+dir];if(!other)return;
    const a=Number(t.order)||index,b=Number(other.order)||(index+dir);
    t.order=b;other.order=a;save();manageTablesV14();
  };

  manageTablesV14=function(){
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

  addDiningAreaV14=async function(){
    const v=await formDialog({title:'Nova área',fields:[{key:'name',label:'Nome da área',value:'Nova área',required:true}]});
    if(!v?.name)return;
    const name=v.name.trim();
    if(state.diningAreas.some(function(a){return a.name.toLowerCase()===name.toLowerCase()})){toast('Área já existente.','warning');return}
    state.diningAreas.push({id:uid('area-'),name:name});save();manageTablesV14();
  };

  renameDiningAreaV14=async function(id){
    const a=diningAreaV14(id);if(!a)return;
    const v=await formDialog({title:'Renomear área',fields:[{key:'name',label:'Nome',value:a.name,required:true}]});
    if(!v?.name)return;
    a.name=v.name.trim();save();manageTablesV14();
  };

  deleteDiningAreaV14=async function(id){
    const a=diningAreaV14(id);if(!a)return;
    if(state.diningAreas.length<=1){toast('Mantenha pelo menos uma área.','warning');return}
    if(state.tables.some(function(t){return t.area===id})){toast('Mova as mesas desta área antes de excluí-la.','warning');return}
    const ok=await confirmDialog('Excluir área','Excluir '+a.name+'?',{confirmLabel:'Excluir',danger:true});if(!ok)return;
    state.diningAreas=state.diningAreas.filter(function(x){return x.id!==id});save();manageTablesV14();
  };

  renderComandas=function(){return renderComandasV14()};
  function renderComandasV14(){
    const occupied=orderedTablesV14().filter(function(t){return t.status!=='free'});
    return '<div class="card commands-card"><div class="table-shell"><table class="table"><thead><tr><th>Mesa / comanda</th><th>Área</th><th>Responsável</th><th>Pessoas</th><th>Status</th><th>Pedidos</th><th>Total</th><th></th></tr></thead><tbody>'+
      (occupied.map(function(t,i){
        const os=openOrdersV14(t);
        return '<tr><td><b>#C-'+(201+i)+'</b><br><span class="muted">'+esc(t.name)+'</span></td><td>'+esc(tableAreaNameV14(t))+'</td><td>'+esc(t.server||'—')+'</td><td>'+Number(t.guests||0)+' / '+Number(t.seats||0)+'</td><td><span class="badge '+(t.status==='closing'?'b-orange':'b-red')+'">'+tableStatusLabelV14(t.status)+'</span></td><td>'+os.length+'</td><td><b>'+money(os.reduce(function(s,o){return s+orderTotal(o)},0))+'</b></td><td><button class="btn btn-outline btn-sm" onclick="tableMenuV14(\''+t.id+'\')">Abrir</button></td></tr>';
      }).join('')||'<tr><td colspan="8"><div class="empty">Nenhuma comanda aberta.</div></td></tr>')+
      '</tbody></table></div></div>';
  }

  function menuStatsV14(){
    return {
      total:state.products.length,
      visible:state.products.filter(function(p){return p.active&&!p.sold}).length,
      sold:state.products.filter(function(p){return p.sold||Number(p.stock)<=0}).length,
      low:state.products.filter(function(p){return Number(p.stock)>0&&Number(p.stock)<=Number(p.min||0)}).length
    };
  }
  function menuItemsV14(){
    let items=state.products.filter(function(p){return p.cat===selectedCat});
    if(menuStatusV14==='visible')items=items.filter(function(p){return p.active&&!p.sold});
    if(menuStatusV14==='sold')items=items.filter(function(p){return p.sold||Number(p.stock)<=0});
    if(menuStatusV14==='low')items=items.filter(function(p){return Number(p.stock)>0&&Number(p.stock)<=Number(p.min||0)});
    if(menuStatusV14==='paused')items=items.filter(function(p){return !p.active});
    items=items.slice().sort(function(a,b){
      if(menuSortV14==='priceAsc')return a.price-b.price;
      if(menuSortV14==='priceDesc')return b.price-a.price;
      if(menuSortV14==='stock')return a.stock-b.stock;
      return a.name.localeCompare(b.name,'pt-BR');
    });
    return items;
  }

  renderCardapio=function(){
    const root=document.getElementById('cardapio');
    if(!state.categories.some(function(c){return c.id===selectedCat}))selectedCat=state.categories[0]?.id||'';
    menuSelectedV14=new Set([...menuSelectedV14].filter(function(id){return state.products.some(function(p){return p.id===id})}));
    const cat=state.categories.find(function(c){return c.id===selectedCat});
    const stats=menuStatsV14();
    const items=menuItemsV14();
    root.innerHTML=
      '<div class="page-head"><div><h1>Gestor de cardápio</h1><p>Controle categorias, disponibilidade, estoque, custos, preços e estação de preparo com rapidez.</p></div><div class="page-head-actions"><button class="btn btn-outline" onclick="go(\'pdv\')">'+icon('eye')+'<span>Visualizar no PDV</span></button><button class="btn btn-outline" onclick="manageCategoriesV14()">'+icon('folder2')+'<span>Categorias</span></button><button class="btn btn-primary" onclick="addProductV14()">'+icon('plus-lg')+'<span>Novo item</span></button></div></div>'+
      '<div class="menu-kpis"><div><span>Itens</span><b>'+stats.total+'</b></div><div><span>Disponíveis</span><b>'+stats.visible+'</b></div><div><span>Esgotados</span><b>'+stats.sold+'</b></div><div><span>Estoque baixo</span><b>'+stats.low+'</b></div></div>'+
      '<div class="menu-manager">'+
        '<aside class="cat-panel"><div class="panel-section-head"><div><span>Categorias</span><b>'+state.categories.length+'</b></div><button class="icon-btn" onclick="addCategoryV14()" title="Nova categoria">'+icon('plus-lg')+'</button></div>'+
        '<div class="searchbox compact"><span class="search-icon">'+icon('search')+'</span><input placeholder="Buscar categoria" oninput="filterCats(this.value)"></div>'+
        '<div class="cat-list" id="catList">'+state.categories.map(function(c){
          const count=state.products.filter(function(p){return p.cat===c.id}).length;
          return '<button type="button" class="cat-row '+(c.id===selectedCat?'active':'')+'" data-name="'+esc(c.name.toLowerCase())+'" onclick="selectedCat=\''+c.id+'\';menuSelectedV14.clear();renderCardapio()"><span class="cat-row-icon">'+icon('folder2')+'</span><span class="cat-row-name">'+esc(c.name)+'</span><span class="cat-count">'+count+'</span></button>';
        }).join('')+'</div></aside>'+
        '<section class="items-panel"><div class="menu-title-row"><div><h2 class="panel-title"><span class="title-icon">'+icon('journal-richtext')+'</span><span>'+esc(cat?.name||'Categoria')+'</span></h2><p>'+state.products.filter(function(p){return p.cat===selectedCat}).length+' item(ns) nesta categoria</p></div><button class="btn btn-outline btn-sm" onclick="editCategoryV14(\''+esc(selectedCat)+'\')">'+icon('pencil')+'<span>Editar categoria</span></button></div>'+
        '<div class="menu-toolbar-v14"><div class="searchbox"><span class="search-icon">'+icon('search')+'</span><input id="productSearch" placeholder="Buscar produto, descrição ou estação" oninput="filterProductRowsV14(this.value)"></div>'+
        '<select class="select" onchange="menuStatusV14=this.value;renderCardapio()"><option value="all" '+(menuStatusV14==='all'?'selected':'')+'>Todos</option><option value="visible" '+(menuStatusV14==='visible'?'selected':'')+'>Disponíveis</option><option value="sold" '+(menuStatusV14==='sold'?'selected':'')+'>Esgotados</option><option value="low" '+(menuStatusV14==='low'?'selected':'')+'>Estoque baixo</option><option value="paused" '+(menuStatusV14==='paused'?'selected':'')+'>Pausados</option></select>'+
        '<select class="select" onchange="menuSortV14=this.value;renderCardapio()"><option value="name" '+(menuSortV14==='name'?'selected':'')+'>Nome A–Z</option><option value="priceAsc" '+(menuSortV14==='priceAsc'?'selected':'')+'>Menor preço</option><option value="priceDesc" '+(menuSortV14==='priceDesc'?'selected':'')+'>Maior preço</option><option value="stock" '+(menuSortV14==='stock'?'selected':'')+'>Menor estoque</option></select></div>'+
        '<div class="bulk-bar" id="menuBulkBar"><span><b id="menuBulkCount">'+menuSelectedV14.size+'</b> selecionado(s)</span><div><button class="btn btn-outline btn-sm" onclick="bulkMenuV14(\'available\')">Disponibilizar</button><button class="btn btn-outline btn-sm" onclick="bulkMenuV14(\'sold\')">Esgotar</button><button class="btn btn-outline btn-sm" onclick="bulkMenuV14(\'pause\')">Pausar</button><button class="btn btn-outline btn-sm" onclick="bulkMoveMenuV14()">Mover</button></div></div>'+
        '<div class="menu-items-head"><span></span><span>Item</span><span>Estação</span><span>Estoque</span><span>Preço</span><span>Status</span><span></span></div>'+
        '<div id="itemRows">'+(items.map(function(p){return itemRowV14(p)}).join('')||'<div class="empty">Nenhum item corresponde ao filtro.</div>')+'</div>'+
        '<button class="btn btn-outline menu-add-bottom" onclick="addProductV14()">'+icon('plus-lg')+'<span>Adicionar item</span></button>'+
      '</section></div>';
    updateMenuBulkV14();
  };

  itemRow=function(p){return itemRowV14(p)};
  function itemRowV14(p){
    const status=p.sold||p.stock<=0?'sold':!p.active?'paused':p.stock<=p.min?'low':'visible';
    const statusLabel=status==='sold'?'Esgotado':status==='paused'?'Pausado':status==='low'?'Estoque baixo':'Disponível';
    const statusClass=status==='sold'?'b-red':status==='paused'?'b-gray':status==='low'?'b-orange':'b-green';
    const search=(p.name+' '+(p.description||'')+' '+(p.station||'')).toLowerCase();
    return '<div class="menu-item-row" data-search="'+esc(search)+'">'+
      '<label class="menu-check"><input type="checkbox" '+(menuSelectedV14.has(p.id)?'checked':'')+' onchange="toggleMenuSelectedV14(\''+p.id+'\',this.checked)"><span></span></label>'+
      '<div class="menu-item-main"><div class="item-thumb">'+esc(p.emoji||'🍔')+'</div><div><b>'+esc(p.name)+'</b><span>'+esc(p.description||'Sem descrição')+'</span></div></div>'+
      '<div class="menu-station">'+icon('fire')+'<span>'+esc(p.station||'Cozinha')+'</span></div>'+
      '<div class="menu-stock '+(status==='low'||status==='sold'?'attention':'')+'"><b>'+Number(p.stock||0)+'</b><span>mín. '+Number(p.min||0)+'</span></div>'+
      '<div class="menu-price"><b>'+money(p.price)+'</b><span>custo '+money(p.cost||0)+'</span></div>'+
      '<span class="badge '+statusClass+'">'+statusLabel+'</span>'+
      '<div class="menu-item-actions"><button class="icon-btn" onclick="toggleSold(\''+p.id+'\')" title="'+(p.sold?'Disponibilizar':'Esgotar')+'">'+icon(p.sold?'check-circle':'slash-circle')+'</button><button class="icon-btn" onclick="editProductV14(\''+p.id+'\')" title="Editar">'+icon('pencil')+'</button></div>'+
    '</div>';
  }

  filterProductRows=function(){filterProductRowsV14(document.getElementById('productSearch')?.value||'')};
  filterProductRowsV14=function(q){
    q=String(q||'').trim().toLowerCase();
    document.querySelectorAll('#itemRows .menu-item-row').forEach(function(row){row.hidden=Boolean(q&&!row.dataset.search.includes(q))});
  };

  toggleMenuSelectedV14=function(id,checked){
    checked?menuSelectedV14.add(id):menuSelectedV14.delete(id);
    updateMenuBulkV14();
  };
  function updateMenuBulkV14(){
    const count=document.getElementById('menuBulkCount');if(count)count.textContent=menuSelectedV14.size;
    const bar=document.getElementById('menuBulkBar');if(bar)bar.classList.toggle('has-selection',menuSelectedV14.size>0);
  }

  bulkMenuV14=function(action){
    if(!menuSelectedV14.size){toast('Selecione pelo menos um item.','warning');return}
    state.products.filter(function(p){return menuSelectedV14.has(p.id)}).forEach(function(p){
      if(action==='available'){p.active=true;p.sold=p.stock<=0}
      if(action==='sold')p.sold=true;
      if(action==='pause')p.active=false;
    });
    menuSelectedV14.clear();save();toast('Itens atualizados.','success');
  };

  bulkMoveMenuV14=async function(){
    if(!menuSelectedV14.size){toast('Selecione pelo menos um item.','warning');return}
    const options=state.categories.map(function(c){return {value:c.id,label:c.name}});
    const v=await formDialog({title:'Mover itens',fields:[{key:'cat',label:'Categoria de destino',type:'select',value:selectedCat,options:options,required:true}]});
    if(!v)return;
    state.products.filter(function(p){return menuSelectedV14.has(p.id)}).forEach(function(p){p.cat=v.cat});
    menuSelectedV14.clear();selectedCat=v.cat;save();toast('Itens movidos.','success');
  };

  addProduct=function(){return addProductV14()};
  addProductV14=async function(){
    const cats=state.categories.map(function(c){return {value:c.id,label:c.name}});
    const v=await formDialog({title:'Novo item',subtitle:'Cadastre preço, custo, estoque e estação de preparo.',fields:[
      {key:'name',label:'Nome',required:true},
      {key:'description',label:'Descrição',type:'textarea',placeholder:'Descrição curta para o cardápio',full:true},
      {key:'price',label:'Preço de venda',type:'number',min:0.01,step:'0.01',required:true},
      {key:'cost',label:'Custo',type:'number',min:0,step:'0.01',value:0},
      {key:'stock',label:'Estoque atual',type:'number',min:0,step:'1',value:20},
      {key:'min',label:'Estoque mínimo',type:'number',min:0,step:'1',value:5},
      {key:'station',label:'Estação de preparo',type:'select',value:'Cozinha',options:['Cozinha','Chapa','Fritadeira','Bebidas','Bar','Sem preparo']},
      {key:'cat',label:'Categoria',type:'select',value:selectedCat,options:cats,required:true},
      {key:'emoji',label:'Ícone',value:'🍔'}
    ]});
    if(!v)return;
    const price=Math.max(0,Number(v.price)||0),stock=Math.max(0,Number(v.stock)||0);
    state.products.push({id:uid('p'),cat:v.cat,name:v.name.trim(),description:(v.description||'').trim(),price:price,cost:Math.max(0,Number(v.cost)||0),emoji:v.emoji||'🍔',active:true,sold:stock<=0,stock:stock,min:Math.max(0,Number(v.min)||0),station:v.station||'Cozinha'});
    selectedCat=v.cat;save();toast('Item criado.','success');
  };

  editProduct=function(id){return editProductV14(id)};
  editProductV14=async function(id){
    const p=product(id);if(!p)return;
    const cats=state.categories.map(function(c){return {value:c.id,label:c.name}});
    const v=await formDialog({title:'Editar item',subtitle:p.name,fields:[
      {key:'name',label:'Nome',value:p.name,required:true},
      {key:'description',label:'Descrição',type:'textarea',value:p.description||'',full:true},
      {key:'price',label:'Preço de venda',type:'number',value:p.price,min:0,step:'0.01',required:true},
      {key:'cost',label:'Custo',type:'number',value:p.cost||0,min:0,step:'0.01'},
      {key:'stock',label:'Estoque atual',type:'number',value:p.stock,min:0,step:'1'},
      {key:'min',label:'Estoque mínimo',type:'number',value:p.min||0,min:0,step:'1'},
      {key:'station',label:'Estação de preparo',type:'select',value:p.station||'Cozinha',options:['Cozinha','Chapa','Fritadeira','Bebidas','Bar','Sem preparo']},
      {key:'cat',label:'Categoria',type:'select',value:p.cat,options:cats,required:true},
      {key:'active',label:'Visibilidade',type:'select',value:p.active?'1':'0',options:[{value:'1',label:'Visível no cardápio'},{value:'0',label:'Pausado'}]},
      {key:'sold',label:'Disponibilidade',type:'select',value:p.sold?'1':'0',options:[{value:'0',label:'Disponível'},{value:'1',label:'Esgotado'}]}
    ]});
    if(!v)return;
    Object.assign(p,{name:v.name.trim(),description:(v.description||'').trim(),price:Math.max(0,Number(v.price)||0),cost:Math.max(0,Number(v.cost)||0),stock:Math.max(0,Number(v.stock)||0),min:Math.max(0,Number(v.min)||0),station:v.station||'Cozinha',cat:v.cat,active:v.active==='1',sold:v.sold==='1'});
    if(p.stock<=0)p.sold=true;
    selectedCat=v.cat;save();toast('Item atualizado.','success');
  };

  addCategory=function(){return addCategoryV14()};
  addCategoryV14=async function(){
    const v=await formDialog({title:'Nova categoria',fields:[{key:'name',label:'Nome',value:'Nova categoria',required:true}]});
    if(!v?.name)return;
    const name=v.name.trim();
    if(state.categories.some(function(c){return c.name.toLowerCase()===name.toLowerCase()})){toast('Categoria já existente.','warning');return}
    const id=uid('cat');state.categories.push({id:id,name:name});selectedCat=id;save();toast('Categoria criada.','success');
  };

  editCategoryV14=async function(id){
    const c=state.categories.find(function(x){return x.id===id});if(!c)return;
    const v=await formDialog({title:'Editar categoria',fields:[{key:'name',label:'Nome',value:c.name,required:true}]});
    if(!v?.name)return;c.name=v.name.trim();save();toast('Categoria atualizada.','success');
  };

  moveCategoryV14=function(id,dir){
    const i=state.categories.findIndex(function(c){return c.id===id}),j=i+dir;if(i<0||j<0||j>=state.categories.length)return;
    const temp=state.categories[i];state.categories[i]=state.categories[j];state.categories[j]=temp;save();manageCategoriesV14();
  };

  deleteCategoryV14=async function(id){
    const c=state.categories.find(function(x){return x.id===id});if(!c)return;
    const count=state.products.filter(function(p){return p.cat===id}).length;
    if(count){toast('Mova ou exclua os '+count+' item(ns) antes de excluir a categoria.','warning');return}
    if(state.categories.length<=1){toast('Mantenha pelo menos uma categoria.','warning');return}
    const ok=await confirmDialog('Excluir categoria','Excluir '+c.name+'?',{confirmLabel:'Excluir',danger:true});if(!ok)return;
    state.categories=state.categories.filter(function(x){return x.id!==id});if(selectedCat===id)selectedCat=state.categories[0]?.id||'';save();manageCategoriesV14();
  };

  manageCategoriesV14=function(){
    openModal(
      '<div class="modal-head"><div><h2>Organizar categorias</h2><p class="dialog-subtitle">Reordene, renomeie e mantenha o cardápio simples de navegar.</p></div><button class="icon-btn" onclick="closeModal()">'+icon('x-lg')+'</button></div>'+
      '<div class="table-manager-toolbar"><button class="btn btn-primary" onclick="addCategoryV14()">'+icon('plus-lg')+'<span>Nova categoria</span></button></div>'+
      '<div class="category-manager-list">'+state.categories.map(function(c){
        const count=state.products.filter(function(p){return p.cat===c.id}).length;
        return '<div class="category-manager-row"><div><span class="table-manager-icon">'+icon('folder2')+'</span><div><b>'+esc(c.name)+'</b><span>'+count+' item(ns)</span></div></div><div class="table-manager-actions"><button class="icon-btn" onclick="moveCategoryV14(\''+c.id+'\',-1)" title="Subir">'+icon('arrow-up')+'</button><button class="icon-btn" onclick="moveCategoryV14(\''+c.id+'\',1)" title="Descer">'+icon('arrow-down')+'</button><button class="icon-btn" onclick="editCategoryV14(\''+c.id+'\')" title="Editar">'+icon('pencil')+'</button><button class="icon-btn danger-icon" onclick="deleteCategoryV14(\''+c.id+'\')" title="Excluir">'+icon('trash')+'</button></div></div>';
      }).join('')+'</div>'+
      '<div class="modal-foot"><button class="btn btn-outline" onclick="closeModal();renderCardapio()">Concluir</button></div>'
    );
  };
})();
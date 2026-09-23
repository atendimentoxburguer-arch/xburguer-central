/* X Burguer Central V16 — gestão de cardápio */
(function(){
  'use strict';
  let menuStatusV14='all';
  let menuSortV14='name';
  let menuSelectedV14=new Set();

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

  globalThis.selectMenuCategoryV16=function(id){
    if(!state.categories.some(c=>c.id===id))return;
    selectedCat=id;
    menuSelectedV14.clear();
    renderCardapio();
  };
  globalThis.setMenuStatusV16=function(value){
    menuStatusV14=['all','visible','sold','low','paused'].includes(value)?value:'all';
    renderCardapio();
  };
  globalThis.setMenuSortV16=function(value){
    menuSortV14=['name','priceAsc','priceDesc','stock'].includes(value)?value:'name';
    renderCardapio();
  };

  globalThis.renderCardapio=function(){
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
          return '<button type="button" class="cat-row '+(c.id===selectedCat?'active':'')+'" data-name="'+esc(c.name.toLowerCase())+'" onclick="selectMenuCategoryV16(\''+c.id+'\')"><span class="cat-row-icon">'+icon('folder2')+'</span><span class="cat-row-name">'+esc(c.name)+'</span><span class="cat-count">'+count+'</span></button>';
        }).join('')+'</div></aside>'+
        '<section class="items-panel"><div class="menu-title-row"><div><h2 class="panel-title"><span class="title-icon">'+icon('journal-richtext')+'</span><span>'+esc(cat?.name||'Categoria')+'</span></h2><p>'+state.products.filter(function(p){return p.cat===selectedCat}).length+' item(ns) nesta categoria</p></div><button class="btn btn-outline btn-sm" onclick="editCategoryV14(\''+selectedCat+'\')">'+icon('pencil')+'<span>Editar categoria</span></button></div>'+
        '<div class="menu-toolbar-v14"><div class="searchbox"><span class="search-icon">'+icon('search')+'</span><input id="productSearch" placeholder="Buscar produto, descrição ou estação" oninput="filterProductRowsV14(this.value)"></div>'+
        '<select class="select" aria-label="Filtrar produtos" onchange="setMenuStatusV16(this.value)"><option value="all" '+(menuStatusV14==='all'?'selected':'')+'>Todos</option><option value="visible" '+(menuStatusV14==='visible'?'selected':'')+'>Disponíveis</option><option value="sold" '+(menuStatusV14==='sold'?'selected':'')+'>Esgotados</option><option value="low" '+(menuStatusV14==='low'?'selected':'')+'>Estoque baixo</option><option value="paused" '+(menuStatusV14==='paused'?'selected':'')+'>Pausados</option></select>'+
        '<select class="select" aria-label="Ordenar produtos" onchange="setMenuSortV16(this.value)"><option value="name" '+(menuSortV14==='name'?'selected':'')+'>Nome A–Z</option><option value="priceAsc" '+(menuSortV14==='priceAsc'?'selected':'')+'>Menor preço</option><option value="priceDesc" '+(menuSortV14==='priceDesc'?'selected':'')+'>Maior preço</option><option value="stock" '+(menuSortV14==='stock'?'selected':'')+'>Menor estoque</option></select></div>'+
        '<div class="bulk-bar" id="menuBulkBar"><span><b id="menuBulkCount">'+menuSelectedV14.size+'</b> selecionado(s)</span><div><button class="btn btn-outline btn-sm" onclick="bulkMenuV14(\'available\')">Disponibilizar</button><button class="btn btn-outline btn-sm" onclick="bulkMenuV14(\'sold\')">Esgotar</button><button class="btn btn-outline btn-sm" onclick="bulkMenuV14(\'pause\')">Pausar</button><button class="btn btn-outline btn-sm" onclick="bulkMoveMenuV14()">Mover</button></div></div>'+
        '<div class="menu-items-head"><span></span><span>Item</span><span>Estação</span><span>Estoque</span><span>Preço</span><span>Status</span><span></span></div>'+
        '<div id="itemRows">'+(items.map(function(p){return itemRowV14(p)}).join('')||'<div class="empty">Nenhum item corresponde ao filtro.</div>')+'</div>'+
        '<button class="btn btn-outline menu-add-bottom" onclick="addProductV14()">'+icon('plus-lg')+'<span>Adicionar item</span></button>'+
      '</section></div>';
    updateMenuBulkV14();
  };

  globalThis.itemRow=function(p){return itemRowV14(p)};
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

  globalThis.filterProductRows=function(){filterProductRowsV14(document.getElementById('productSearch')?.value||'')};
  globalThis.filterProductRowsV14=function(q){
    q=String(q||'').trim().toLowerCase();
    document.querySelectorAll('#itemRows .menu-item-row').forEach(function(row){row.hidden=Boolean(q&&!row.dataset.search.includes(q))});
  };

  globalThis.toggleMenuSelectedV14=function(id,checked){
    checked?menuSelectedV14.add(id):menuSelectedV14.delete(id);
    updateMenuBulkV14();
  };
  function updateMenuBulkV14(){
    const count=document.getElementById('menuBulkCount');if(count)count.textContent=menuSelectedV14.size;
    const bar=document.getElementById('menuBulkBar');if(bar)bar.classList.toggle('has-selection',menuSelectedV14.size>0);
  }

  globalThis.bulkMenuV14=function(action){
    if(!menuSelectedV14.size){toast('Selecione pelo menos um item.','warning');return}
    state.products.filter(function(p){return menuSelectedV14.has(p.id)}).forEach(function(p){
      if(action==='available'){p.active=true;p.manualSold=false;p.sold=p.stock<=0}
      if(action==='sold'){p.manualSold=true;p.sold=true}
      if(action==='pause')p.active=false;
    });
    menuSelectedV14.clear();save();toast('Itens atualizados.','success');
  };

  globalThis.bulkMoveMenuV14=async function(){
    if(!menuSelectedV14.size){toast('Selecione pelo menos um item.','warning');return}
    const options=state.categories.map(function(c){return {value:c.id,label:c.name}});
    const v=await formDialog({title:'Mover itens',fields:[{key:'cat',label:'Categoria de destino',type:'select',value:selectedCat,options:options,required:true}]});
    if(!v)return;
    state.products.filter(function(p){return menuSelectedV14.has(p.id)}).forEach(function(p){p.cat=v.cat});
    menuSelectedV14.clear();selectedCat=v.cat;save();toast('Itens movidos.','success');
  };

  globalThis.addProduct=function(){return addProductV14()};
  globalThis.addProductV14=async function(){
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
    const item={id:uid('p'),cat:v.cat,name:v.name.trim(),description:(v.description||'').trim(),price:price,cost:Math.max(0,Number(v.cost)||0),emoji:v.emoji||'🍔',active:true,manualSold:false,sold:stock<=0,stock:stock,min:Math.max(0,Number(v.min)||0),station:v.station||'Cozinha'};
    state.products.push(item);
    if(stock)recordStockMovement(item.id,stock,'Estoque inicial','cadastro');
    selectedCat=v.cat;save();toast('Item criado.','success');
  };

  globalThis.editProduct=function(id){return editProductV14(id)};
  globalThis.editProductV14=async function(id){
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
    const beforeStock=Number(p.stock)||0;
    const stock=Math.max(0,Number(v.stock)||0);
    const manualSold=v.sold==='1';
    Object.assign(p,{name:v.name.trim(),description:(v.description||'').trim(),price:Math.max(0,Number(v.price)||0),cost:Math.max(0,Number(v.cost)||0),stock:stock,min:Math.max(0,Number(v.min)||0),station:v.station||'Cozinha',cat:v.cat,active:v.active==='1',manualSold:manualSold,sold:manualSold||stock<=0});
    if(stock!==beforeStock)recordStockMovement(p.id,stock-beforeStock,'Edição de produto','cardapio');
    selectedCat=v.cat;save();toast('Item atualizado.','success');
  };

  globalThis.addCategory=function(){return addCategoryV14()};
  globalThis.addCategoryV14=async function(){
    const v=await formDialog({title:'Nova categoria',fields:[{key:'name',label:'Nome',value:'Nova categoria',required:true}]});
    if(!v?.name)return;
    const name=v.name.trim();
    if(state.categories.some(function(c){return c.name.toLowerCase()===name.toLowerCase()})){toast('Categoria já existente.','warning');return}
    const id=uid('cat');state.categories.push({id:id,name:name});selectedCat=id;save();toast('Categoria criada.','success');
  };

  globalThis.editCategoryV14=async function(id){
    const c=state.categories.find(function(x){return x.id===id});if(!c)return;
    const v=await formDialog({title:'Editar categoria',fields:[{key:'name',label:'Nome',value:c.name,required:true}]});
    if(!v?.name)return;c.name=v.name.trim();save();toast('Categoria atualizada.','success');
  };

  globalThis.moveCategoryV14=function(id,dir){
    const i=state.categories.findIndex(function(c){return c.id===id}),j=i+dir;if(i<0||j<0||j>=state.categories.length)return;
    const temp=state.categories[i];state.categories[i]=state.categories[j];state.categories[j]=temp;save();manageCategoriesV14();
  };

  globalThis.deleteCategoryV14=async function(id){
    const c=state.categories.find(function(x){return x.id===id});if(!c)return;
    const count=state.products.filter(function(p){return p.cat===id}).length;
    if(count){toast('Mova ou exclua os '+count+' item(ns) antes de excluir a categoria.','warning');return}
    if(state.categories.length<=1){toast('Mantenha pelo menos uma categoria.','warning');return}
    const ok=await confirmDialog('Excluir categoria','Excluir '+c.name+'?',{confirmLabel:'Excluir',danger:true});if(!ok)return;
    state.categories=state.categories.filter(function(x){return x.id!==id});if(selectedCat===id)selectedCat=state.categories[0]?.id||'';save();manageCategoriesV14();
  };

  globalThis.manageCategoriesV14=function(){
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
  globalThis.filterCats=function(q){
    q=String(q||'').trim().toLowerCase();
    document.querySelectorAll('#catList .cat-row').forEach(function(row){
      row.hidden=Boolean(q&&!row.dataset.name.includes(q));
    });
  };

  globalThis.toggleSold=function(id){
    const p=product(id);if(!p)return;
    if(p.sold&&!p.manualSold&&Number(p.stock)<=0){toast('Ajuste o estoque antes de disponibilizar este item.','warning');return}
    p.manualSold=!Boolean(p.manualSold);
    p.sold=Boolean(p.manualSold||Number(p.stock)<=0);
    save();
  };


})();

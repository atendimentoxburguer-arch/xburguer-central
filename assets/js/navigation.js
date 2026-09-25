/* Navegação — catálogo, busca por tarefas e página inicial */
// One catalog supplies the sidebar, home directory, breadcrumbs and command search.
const NAV_ITEMS=[
 {id:'inicio',label:'Início',icon:'house',group:'Central',description:'Atalhos e visão da operação',keywords:'home inicio painel ajuda funções'},
 {id:'pedidos',label:'Pedidos',icon:'receipt',group:'Atendimento',description:'Aceitar, acompanhar e consultar pedidos',keywords:'vendas cancelados histórico fila'},
 {id:'pdv',label:'Novo pedido / PDV',icon:'plus-square',group:'Atendimento',description:'Lançar produtos e montar uma venda',keywords:'balcao balcão retirada venda lanche'},
 {id:'salao',label:'Mesas e comandas',icon:'grid',group:'Atendimento',description:'Abrir mesa, lançar consumo e fechar conta',keywords:'salao salão garçons garcons dividir pagamento'},
 {id:'kds',label:'Cozinha',icon:'fire',group:'Atendimento',description:'Organizar o preparo dos pedidos',keywords:'kds produção producao preparar'},
 {id:'entregas',label:'Entregas',icon:'truck',group:'Atendimento',description:'Acompanhar delivery e entregadores',keywords:'motoboy endereço endereco rota'},
 {id:'caixa',label:'Caixa',icon:'wallet2',group:'Gestão',description:'Abertura, fechamento, entradas e saídas',keywords:'sangria suprimento dinheiro turno'},
 {id:'cardapio',label:'Cardápio',icon:'journal',group:'Gestão',description:'Produtos, categorias, preços e fotos',keywords:'cadastrar produto preco preço lanche categoria'},
 {id:'estoque',label:'Estoque',icon:'box-seam',group:'Gestão',description:'Consultar saldos e registrar movimentações',keywords:'repor entrada baixa inventario inventário'},
 {id:'financeiro',label:'Financeiro',icon:'bank',group:'Gestão',description:'Contas a pagar e a receber',keywords:'despesas receitas vencimentos pagar'},
 {id:'relatorios',label:'Relatórios',icon:'file-earmark-bar-graph',group:'Gestão',description:'Vendas, pagamentos e resultados detalhados',keywords:'faturamento exportar csv relatório relatorio'},
 {id:'performance',label:'Desempenho',icon:'graph-up',group:'Gestão',description:'Indicadores e evolução das vendas',keywords:'ticket medio metas resultados'},
 {id:'equipe',label:'Equipe',icon:'person-badge',group:'Gestão',description:'Colaboradores e permissões',keywords:'usuarios usuários funcionarios funcionários'},
 {id:'clientes',label:'Clientes',icon:'people',group:'Relacionamento',description:'Cadastro, contatos e histórico de clientes',keywords:'telefone nome consumidor'},
 {id:'marketing',label:'Fidelidade e promoções',icon:'gift',group:'Relacionamento',description:'Campanhas e benefícios para clientes',keywords:'cashback desconto cupom promocao promoção'},
 {id:'atendimento',label:'Atendimento',icon:'chat-dots',group:'Relacionamento',description:'Consultar conversas e canais de atendimento',keywords:'whatsapp mensagem contato'},
 {id:'config',label:'Configurações',icon:'sliders2',group:'Sistema',description:'Dados da loja, impressão e backup',keywords:'impressoras impressora imprimir agente print backup taxa horario'}
];
const QUICK_COMMANDS=[
 {id:'print',label:'Configurar impressoras',icon:'printer',group:'Ação',description:'Conexão do Print Agent e destinos de impressão',keywords:'mp 4200 epson cozinha impressão imprimir agente',run:()=>printerCenter()},
 {id:'commands',label:'Fechar uma mesa',icon:'receipt-cutoff',group:'Ação',description:'Escolher uma comanda aberta para conferir e pagar',keywords:'fechar conta mesa receber pagamento comanda',run:()=>{salaoTab='comandas';go('salao')}},
 {id:'times',label:'Tempos de atendimento',icon:'clock',group:'Ação',description:'Ajustar os prazos de balcão e delivery',keywords:'tempo espera prazo minutos',run:()=>settingsTimes()}
];
if(globalThis.XB_RUNTIME?.connected){
 [
  ['shop','Abrir cardápio online','shop','Compartilhar o cardápio com clientes','link loja comprar público'],
  ['coupon','Criar cupom online','ticket','Desconto com validade e limite de usos','promoção codigo cupom'],
  ['loyalty','Consultar e resgatar cashback','gift','Saldos dos clientes e resgate em pedidos','fidelidade saldo pontos'],
  ['user','Criar acesso da equipe','person-plus','Login e permissões no servidor','senha garçom cozinha usuario'],
  ['table','Criar link da mesa','qr-code','Pedido do cliente vinculado à mesa','qr code mesa autoatendimento'],
  ['audit','Consultar auditoria','clock-history','Últimas alterações registradas no servidor','histórico alterações']
 ].forEach(([id,label,icon,description,keywords])=>QUICK_COMMANDS.push({id:'cloud-'+id,label,icon,description,keywords,group:'Conectado',run:()=>XBCloud.manage(id)}));
}
function buildNavigation(){
 const root=document.getElementById('navigation');if(!root)return;
 root.innerHTML=['Central','Atendimento','Gestão','Relacionamento','Sistema'].map(group=>
  `${group==='Central'?'':`<div class="side-title">${group}</div>`}<nav class="nav" aria-label="${group}">${NAV_ITEMS.filter(x=>x.group===group).map(x=>`<button type="button" data-page="${x.id}" title="${x.description}"><span class="ico">${icon(x.icon)}</span><span>${x.label}</span>${x.id==='pedidos'?'<span class="count" id="sideNewCount">0</span>':''}</button>`).join('')}</nav>`).join('');
 root.addEventListener('click',event=>{const button=event.target.closest('[data-page]');if(button)go(button.dataset.page)});
}
function commandMatches(query){
 const terms=normalizeSearchText(query).trim().split(/\s+/).filter(Boolean);
 return [...QUICK_COMMANDS,...NAV_ITEMS].filter(item=>terms.every(term=>normalizeSearchText([item.label,item.description,item.group,item.keywords].join(' ')).includes(term)));
}
function runNavigationCommand(id){
 const item=[...QUICK_COMMANDS,...NAV_ITEMS].find(x=>x.id===id);if(!item)return;
 closeModal();requestAnimationFrame(()=>{if(item.run)item.run();else go(item.id)});
}
function renderCommandResults(query=''){
 const results=commandMatches(query),root=document.getElementById('commandResults');if(!root)return;
 root.innerHTML=results.map(item=>`<button type="button" class="command-result" data-command="${item.id}"><span class="command-icon">${icon(item.icon)}</span><span><b>${item.label}</b><small>${item.description}</small></span><span class="command-group">${item.group}</span>${icon('arrow-up-right')}</button>`).join('')||'<div class="empty">Nenhuma função encontrada. Tente “pedido”, “mesa”, “caixa” ou “impressora”.</div>';
 document.getElementById('commandCount').textContent=results.length+' resultado(s)';
}
function openCommandCenter(){
 if(document.getElementById('modal')?.classList.contains('open'))return;
 toggleSide(false);
 openModal(`<div class="command-center"><div class="command-search">${icon('search')}<input id="commandInput" type="search" aria-label="Buscar telas e ações" placeholder="O que você quer fazer?" autocomplete="off"><button class="icon-btn" onclick="closeModal()" aria-label="Fechar busca">${icon('x-lg')}</button></div><div class="command-caption"><h2>Encontre uma função</h2><span id="commandCount" role="status" aria-live="polite"></span></div><div id="commandResults" class="command-results" aria-label="Resultados da busca"></div><div class="command-help">Digite o nome de uma tela ou ação · ↑ ↓ navegar · Enter abrir · Esc fechar</div></div>`);
 renderCommandResults();
 const input=document.getElementById('commandInput'),results=document.getElementById('commandResults');
 input.addEventListener('input',()=>renderCommandResults(input.value));
 input.addEventListener('keydown',e=>{if(['ArrowDown','Enter'].includes(e.key)){e.preventDefault();const first=results.querySelector('button');if(e.key==='Enter')first?.click();else first?.focus()}});
 results.addEventListener('click',e=>{const hit=e.target.closest('[data-command]');if(hit)runNavigationCommand(hit.dataset.command)});
 results.addEventListener('keydown',e=>{if(!['ArrowDown','ArrowUp'].includes(e.key))return;e.preventDefault();const buttons=[...results.querySelectorAll('button')],index=buttons.indexOf(document.activeElement),next=index+(e.key==='ArrowDown'?1:-1);if(next<0)input.focus();else buttons[Math.min(next,buttons.length-1)]?.focus()});
}
function renderHome(){
 const active=state.orders.filter(o=>!['done','cancelled'].includes(o.status));
 const counts=[['pedidos','Pedidos em andamento',active.length,'receipt'],['salao','Mesas ocupadas',state.tables.filter(t=>t.status!=='free').length,'grid'],['kds','Pedidos em preparo',active.filter(o=>o.status==='production').length,'fire'],['entregas','Entregas prontas',active.filter(o=>o.type==='Delivery'&&o.status==='ready').length,'truck']];
 document.getElementById('inicio').innerHTML=`<div class="home-intro"><div><span class="eyebrow">SUA CENTRAL DE TRABALHO</span><h1>Vamos cuidar da operação.</h1><p>Pedidos, mesas e gestão. Tudo no lugar certo.</p></div><span class="home-date">${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</span></div>
 <div class="home-launch"><div><span class="eyebrow">COMECE POR AQUI</span><h2>O próximo pedido começa aqui.</h2><p>Abra o balcão, escolha os produtos e acompanhe o pedido até a entrega.</p><button class="btn" onclick="go('pdv')">${icon('plus-lg')} Novo pedido ${icon('arrow-right')}</button></div><div class="home-launch-side"><button onclick="go('salao')">${icon('grid')}<span><b>Atender uma mesa</b><small>Consumo, comandas e fechamento</small></span>${icon('arrow-up-right')}</button><button onclick="printerCenter()">${icon('printer')}<span><b>Central de impressão</b><small>Conexão e destinos das impressoras</small></span>${icon('arrow-up-right')}</button></div></div>
 <div class="home-stats">${counts.map(([id,label,count,name])=>`<button onclick="go('${id}')"><span>${icon(name)} ${label}</span><b>${count}</b><small>Ver detalhes ${icon('arrow-right')}</small></button>`).join('')}</div>
 <div class="home-directory-head"><div><h2>Encontre o que precisa</h2><p>Escolha uma área ou busque pelo nome de uma função.</p></div><button class="btn btn-outline" onclick="openCommandCenter()">${icon('search')} Buscar função <kbd>Ctrl K</kbd></button></div>
 <div class="home-directory">${['Atendimento','Gestão','Relacionamento','Sistema'].map(group=>`<section><h3>${group}</h3>${NAV_ITEMS.filter(x=>x.group===group).map(x=>`<button onclick="go('${x.id}')"><span class="directory-icon">${icon(x.icon)}</span><span><b>${x.label}</b><small>${x.description}</small></span>${icon('chevron-right')}</button>`).join('')}</section>`).join('')}</div>`;
}
buildNavigation();

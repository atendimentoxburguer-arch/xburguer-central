/* Dados conectados — revisão otimista, sessão e migração explícita */
(function(){
 let revision=0,committed=null,inflight=null,failed=false,connected=false;
 const client=globalThis.XBPlatform;
 const runtime=()=>Boolean(globalThis.XB_RUNTIME?.connected);
 function withoutLocal(source){
  const copy=JSON.parse(JSON.stringify(source));
  if(copy.settings?.printing)delete copy.settings.printing;
  copy.printOutbox=[];
  return copy;
 }
 function apply(document){
  const printing=state?.settings?.printing,spool=state?.printOutbox;
  state=document;
  if(printing)state.settings.printing=printing;
  if(spool)state.printOutbox=spool;
  normalize();
  committed=structuredClone(state);
 }
 function gate(message){
  document.querySelector('.app')?.setAttribute('inert','');
  let screen=document.getElementById('platformGate');
  if(!screen){screen=document.createElement('section');screen.id='platformGate';screen.className='platform-gate';document.body.append(screen)}
  screen.innerHTML='<div class="card"><h1>X Burguer Central</h1>'+message+'</div>';
  return screen;
 }
 async function login(){
  const screen=gate('<p>Entre para acessar os dados compartilhados da loja.</p><form id="platformLogin"><div class="field"><label for="cloudEmail">E-mail</label><input id="cloudEmail" type="email" autocomplete="username" required></div><div class="field"><label for="cloudPassword">Senha</label><input id="cloudPassword" type="password" autocomplete="current-password" required minlength="12"></div><p id="cloudError" role="alert"></p><button class="btn btn-primary">Entrar</button></form>');
  screen.querySelector('form').onsubmit=async event=>{
   event.preventDefault();const button=screen.querySelector('button');button.disabled=true;
   try{await client.request('login',{method:'POST',data:{email:screen.querySelector('#cloudEmail').value,password:screen.querySelector('#cloudPassword').value}});await start()}
   catch(error){screen.querySelector('#cloudError').textContent=error.message;button.disabled=false}
  };
 }
 function renderImport(){
  const screen=gate('<h2>Trazer os dados da loja</h2><p>No sistema atual, use Configurações → Exportar backup. Escolha esse arquivo para a migração inicial. O servidor vazio receberá os dados uma única vez.</p><form><div class="field"><label for="cloudImport">Backup do X Burguer</label><input id="cloudImport" type="file" accept=".json,application/json" required></div><p role="alert"></p><button class="btn btn-primary">Validar e migrar</button></form>');
  screen.querySelector('form').onsubmit=async event=>{
   event.preventDefault();const button=screen.querySelector('button');button.disabled=true;
   try{const file=screen.querySelector('input').files[0];if(file.size>5*1024*1024)throw new Error('Backup maior que 5 MB.');
    const parsed=JSON.parse(await file.text()),candidate=parsed.state||parsed;
    const printing=structuredClone(candidate.settings?.printing||state.settings.printing);
    printing.agent=structuredClone(state.settings.printing.agent);
    await client.request('state/import',{method:'POST',data:withoutLocal(candidate)});
    state.settings.printing=printing;state.printOutbox=[];persistWorkstation();await start()}
   catch(error){screen.querySelector('[role=alert]').textContent=error.message;button.disabled=false}
  };
 }
 async function start(){
  if(!runtime())return;
  try{
   const session=await client.request('session');
   if(session.user.role!=='admin'){location.replace('equipe-online.html');return}
   if(!state)load();
   const result=await client.request('state');revision=result.revision;apply(result.document);
   connected=true;failed=false;document.getElementById('platformGate')?.remove();document.querySelector('.app')?.removeAttribute('inert');
   syncTables();setHeader();go(currentPage,{historyMode:'replace'});globalThis.initPrintAgentClient?.();
   clearInterval(start.timer);start.timer=setInterval(refresh,10000);
  }catch(error){
   if(error.status===401)return login();
   if(error.status===503)return renderImport();
   gate('<h2>Conexão indisponível</h2><p>'+esc(error.message)+'</p><button class="btn" onclick="location.reload()">Tentar novamente</button>');
  }
 }
 async function refresh(){
  if(!connected||inflight||document.getElementById('modal')?.classList.contains('open')||document.visibilityState==='hidden')return;
  const requestedRevision=revision;
  try{const result=await client.request('state');if(inflight||requestedRevision!==revision||document.getElementById('modal')?.classList.contains('open'))return;if(result.revision>revision){revision=result.revision;apply(result.document);renderAll()}failed=false;updateConnectionStatus()}
  catch(error){failed=true;updateConnectionStatus();if(error.status===401){connected=false;login()}}
 }
 function save(options={}){
  persistWorkstation();
  if(!connected||inflight){toast('Aguarde a conexão com o servidor antes de alterar os dados.','warning');return false}
  const proposed=structuredClone(state);
  if(JSON.stringify(withoutLocal(proposed))===JSON.stringify(withoutLocal(committed))){
   committed=proposed;if(options.render!==false)renderAll();return true;
  }
  const panel=document.createElement('div');panel.className='platform-saving';panel.setAttribute('role','status');panel.textContent='Salvando no servidor…';document.body.append(panel);
  document.querySelector('.app')?.setAttribute('inert','');
  inflight=client.request('state',{method:'PUT',headers:{'If-Match':String(revision)},data:withoutLocal(proposed)})
   .then(result=>{revision=result.revision;apply(structuredClone(proposed));failed=false;return true})
   .catch(async error=>{
    failed=true;stashRejectedChange(proposed);apply(structuredClone(committed));
    toast(error.message+' A alteração não foi confirmada; uma cópia foi preservada neste aparelho.','error');
    if(error.status===409){try{const latest=await client.request('state');revision=latest.revision;apply(latest.document)}catch{}}
    return false;
   }).finally(()=>{inflight=null;panel.remove();document.querySelector('.app')?.removeAttribute('inert');renderAll()});
  return true;
 }
 async function manage(action){
  const actions=action?{action}:await formDialog({title:'Plataforma conectada',fields:[{key:'action',label:'O que deseja fazer?',type:'select',
   options:[{value:'shop',label:'Abrir cardápio público'},{value:'user',label:'Criar acesso da equipe'},{value:'users',label:'Consultar e desativar acessos'},{value:'coupon',label:'Criar cupom online'},{value:'loyalty',label:'Saldos e resgate de cashback'},{value:'table',label:'Criar link de pedido da mesa'},{value:'audit',label:'Consultar auditoria'},{value:'recovery',label:'Exportar alteração que não foi confirmada'},{value:'logout',label:'Sair da conta'}]}]});
  if(!actions)return;
  try{
   if(actions.action==='shop'){window.open('loja.html','_blank','noopener');return}
   if(actions.action==='recovery'){exportRejectedChange();return}
   if(actions.action==='users'){
    const users=await client.request('users');
    openModal('<div class="modal-head"><h2>Acessos ao sistema</h2><button class="icon-btn" onclick="closeModal()">×</button></div><p>Desativar um acesso encerra suas sessões. O cadastro operacional do colaborador é preservado.</p><div id="cloudUsers" class="table-shell"><table class="table"><thead><tr><th>Nome</th><th>Perfil</th><th>Status</th><th>Ação</th></tr></thead><tbody>'+users.map(u=>'<tr><td>'+esc(u.name)+'<br><small>'+esc(u.email)+'</small></td><td>'+esc({admin:'Administrador',cashier:'Atendimento',waiter:'Garçom',kitchen:'Cozinha'}[u.role])+'</td><td>'+(u.active?'Ativo':'Desativado')+'</td><td>'+(u.active?'<button class="btn btn-outline btn-sm" data-user="'+esc(u.id)+'">Desativar</button>':'—')+'</td></tr>').join('')+'</tbody></table></div>');
    document.getElementById('cloudUsers').onclick=async event=>{
     const id=event.target.closest('[data-user]')?.dataset.user;if(!id)return;
     if(!await confirmDialog('Desativar acesso?','As sessões deste usuário serão encerradas.'))return;
     try{await client.request('users/deactivate',{method:'POST',data:{id}});await manage('users')}
     catch(error){toast(error.message,'error')}
    };return;
   }
   if(actions.action==='loyalty'){
    const customers=await client.request('loyalty');
    const orders=state.orders.filter(o=>!['done','cancelled'].includes(o.status)&&o.customerId&&!(o.settlements||[]).length);
    const available=orders.map(order=>({order,customer:customers.find(c=>c.id===order.customerId)})).filter(x=>x.customer?.balanceCents>0);
    if(!available.length){
     openModal('<div class="modal-head"><h2>Cashback dos clientes</h2><button class="icon-btn" onclick="closeModal()">×</button></div><p>O resgate exige pedido aberto, cliente cadastrado e saldo disponível. O crédito é gerado após o pagamento integral e conclusão da compra.</p>'+customers.map(c=>'<div class="list-row"><span>'+esc(c.name)+'</span><b>'+money(c.balanceCents/100)+'</b></div>').join(''));return;
    }
    const v=await formDialog({title:'Resgatar cashback',subtitle:'Confira a identidade do cliente antes do resgate. Pedidos com resgate não podem ter os preços alterados.',fields:[
     {key:'orderId',label:'Pedido e saldo disponível',type:'select',options:available.map(x=>({value:x.order.id,label:x.customer.name+' · #'+x.order.id+' · saldo '+money(x.customer.balanceCents/100)}))},
     {key:'amount',label:'Valor a resgatar (R$)',type:'number',min:0.01,step:'0.01',required:true}
    ]});
    if(v){await client.request('loyalty/redeem',{method:'POST',data:{orderId:v.orderId,amountCents:Math.round(v.amount*100)}});await refresh();toast('Cashback aplicado ao pedido.','success')}return;
   }
   if(actions.action==='logout'){await client.request('logout',{method:'POST',data:{}});location.reload();return}
   if(actions.action==='user'){
    const v=await formDialog({title:'Acesso da equipe',fields:[{key:'name',label:'Nome',required:true},{key:'email',label:'E-mail',type:'email',required:true},{key:'password',label:'Senha inicial (mínimo 12 caracteres)',type:'password',required:true},{key:'role',label:'Perfil',type:'select',options:[{value:'waiter',label:'Garçom'},{value:'kitchen',label:'Cozinha'},{value:'cashier',label:'Atendimento'},{value:'admin',label:'Administrador'}]}]});
    if(v){await client.request('users',{method:'POST',data:v});toast('Acesso criado. Entre pelo endereço da loja.','success')}return;
   }
   if(actions.action==='coupon'){
    const v=await formDialog({title:'Cupom do cardápio online',fields:[{key:'code',label:'Código',required:true},{key:'percent',label:'Desconto (%)',type:'number',min:1,max:100,required:true},{key:'minimum',label:'Compra mínima (R$)',type:'number',min:0,step:'0.01',value:0},{key:'maxUses',label:'Limite de utilizações',type:'number',min:1,value:100},{key:'expiresAt',label:'Validade',type:'datetime-local',required:true}]});
    if(v){await client.request('coupons',{method:'POST',data:{...v,minimumCents:Math.round(v.minimum*100),expiresAt:new Date(v.expiresAt).toISOString()}});toast('Cupom ativo no cardápio online.','success')}return;
   }
   if(actions.action==='table'){
    const v=await formDialog({title:'Link da mesa',subtitle:'Gerar outro link revoga o anterior.',fields:[{key:'tableId',label:'Mesa',type:'select',options:state.tables.map(t=>({value:t.id,label:t.name}))}]});
    if(v){const result=await client.request('table-links',{method:'POST',data:v});
     openModal('<div class="modal-head"><h2>Pedido direto na mesa</h2><button class="icon-btn" onclick="closeModal()">×</button></div><p>Use este endereço para criar o QR da mesa. O link anterior foi revogado.</p><div class="field"><label>Endereço</label><input readonly value="'+esc(result.url)+'"></div>');
    }return;
   }
   const events=await client.request('audit');
   openModal('<div class="modal-head"><h2>Últimas alterações</h2><button class="icon-btn" onclick="closeModal()">×</button></div><div class="table-shell"><table class="table"><tr><th>Quando</th><th>Ação</th></tr>'+events.map(e=>'<tr><td>'+esc(new Date(e.created_at).toLocaleString('pt-BR'))+'</td><td>'+esc(e.action)+'</td></tr>').join('')+'</table></div>');
  }catch(error){toast(error.message,'error')}
 }
 async function renderMarketing(){
  const root=document.getElementById('marketing');
  root.innerHTML='<div class="page-head"><div><h1>Fidelidade e promoções</h1><p>Cupons do cardápio online e cashback de compras pagas.</p></div><div class="row-actions"><button class="btn btn-primary" onclick="XBCloud.manage(\'coupon\')">Criar cupom</button><button class="btn btn-outline" onclick="XBCloud.manage(\'loyalty\')">Resgatar cashback</button></div></div><div id="onlineMarketing" class="card">Carregando saldos e cupons…</div>';
  try{
   const [coupons,customers]=await Promise.all([client.request('coupons'),client.request('loyalty')]);
   const target=document.getElementById('onlineMarketing');if(!target)return;
   target.innerHTML='<h2>Cupons online</h2><div class="table-shell"><table class="table"><thead><tr><th>Código</th><th>Desconto</th><th>Utilizações</th><th>Validade</th></tr></thead><tbody>'+coupons.map(c=>'<tr><td>'+esc(c.code)+'</td><td>'+c.percent+'%</td><td>'+c.uses+' / '+c.max_uses+'</td><td>'+esc(new Date(c.expires_at).toLocaleString('pt-BR'))+'</td></tr>').join('')+'</tbody></table></div><h2>Saldos de cashback</h2><p class="muted">Crédito após pagamento integral e conclusão. Resgates e estornos ficam registrados no servidor.</p>'+customers.map(c=>'<div class="list-row"><span>'+esc(c.name)+'</span><b>'+money(c.balanceCents/100)+'</b></div>').join('');
  }catch(error){const target=document.getElementById('onlineMarketing');if(target)target.textContent=error.message}
 }
 let sending=false,messageKey='',messageBody='';
 async function sendMessage(){
  if(sending)return;
  const input=document.getElementById('chatMsg'),text=input?.value.trim();
  if(!text)return;
  const data={chatId,text},serialized=JSON.stringify(data);
  if(serialized!==messageBody){messageBody=serialized;messageKey=crypto.randomUUID().replaceAll('-','')}
  sending=true;
  try{
   await client.request('whatsapp/send',{method:'POST',headers:{'Idempotency-Key':messageKey},data});
   input.value='';messageBody='';messageKey='';await refresh();toast('Mensagem aceita pelo WhatsApp.','success');
  }catch(error){toast(error.message,'error')}
  finally{sending=false}
 }
 globalThis.XBCloud={start,save,manage,refresh,sendMessage,renderMarketing,isActive:()=>connected,isPending:()=>!!inflight,
  flush:async()=>inflight?await inflight:!failed,status:()=>failed?'Conexão pendente':inflight?'Salvando…':'Dados compartilhados'};
 for(const type of ['click','keydown','submit','change'])document.addEventListener(type,event=>{
  if(inflight||(runtime()&&!connected&&!event.target.closest?.('#platformGate'))){event.preventDefault();event.stopImmediatePropagation()}
 },true);
})();

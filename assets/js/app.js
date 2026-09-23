/* X Burguer Gestor PRO V10 — app */
function renderPage(id){({pedidos:renderPedidos,pdv:()=>renderPdv(),salao:renderSalao,cardapio:renderCardapio,entregas:renderEntregas,performance:renderPerformance,kds:renderKds,clientes:renderClientes,marketing:renderMarketing,atendimento:renderAtendimento,caixa:renderCaixa,estoque:renderEstoque,financeiro:renderFinanceiro,equipe:renderEquipe,config:renderConfig}[id]||(()=>{}))()}
function renderAll(){syncTables();setHeader();renderPage(currentPage)}
document.getElementById('sideSearch').addEventListener('keydown',e=>{if(e.key!=='Enter')return;const q=e.target.value.trim().toLowerCase();if(!q)return;const map=[['pedido','pedidos'],['balc','pdv'],['mesa','salao'],['comanda','salao'],['card','cardapio'],['entrega','entregas'],['desem','performance'],['cozinha','kds'],['cliente','clientes'],['cupom','marketing'],['whats','atendimento'],['caixa','caixa'],['estoque','estoque'],['finan','financeiro'],['equipe','equipe'],['config','config']];const hit=map.find(([k])=>q.includes(k));if(hit)go(hit[1]);else toast('Tente: pedidos, mesas, cardápio, caixa, estoque...')});
initThemeUI();load();renderAll();


document.addEventListener('keydown',event=>{
  if(event.key==='Escape') closeModal();
});
window.addEventListener('error',event=>{
  console.error('Erro de interface:',event.error||event.message);
});

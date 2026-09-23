/* X Burguer Gestor PRO V10 — ui */
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)}
function openModal(html){const modal=document.getElementById('modal');const card=document.getElementById('modalCard');card.innerHTML=html;modal.classList.add('open');modal.setAttribute('aria-hidden','false');requestAnimationFrame(()=>card.querySelector('button,input,select,textarea')?.focus())}
function closeModal(){const modal=document.getElementById('modal');modal.classList.remove('open');modal.setAttribute('aria-hidden','true')}
document.getElementById('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
function toggleSide(){document.getElementById('sidebar').classList.toggle('open')}
function go(id){const target=document.getElementById(id);if(!target)return;currentPage=id;document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));target.classList.add('active');document.querySelectorAll('.nav button').forEach(b=>{const active=b.dataset.page===id;b.classList.toggle('active',active);active?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current')});document.getElementById('sidebar').classList.remove('open');renderPage(id);window.scrollTo({top:0,behavior:'smooth'})}
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>go(b.dataset.page));

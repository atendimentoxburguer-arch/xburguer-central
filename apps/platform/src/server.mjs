import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { HttpError,requireThat,allow,digest,secret,passwordHash,passwordMatches,emailAddress,cleanText,rateLimiter } from './security.mjs';
import { cleanState,readState,writeState,audit } from './state.mjs';
import { publicCatalog,placeOrder,trackOrder,quoteCart } from './commerce.mjs';
import { whatsappConfigured,verifyWhatsApp,receiveWhatsApp,sendWhatsApp } from './whatsapp.mjs';
import { reconcileLoyalty,redeemLoyalty,balance } from './loyalty.mjs';

const repo = fileURLToPath(new URL('../../../',import.meta.url));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const staffRoles = ['admin','cashier','waiter','kitchen'];
const publicUser = u => ({id:u.id,name:u.name,email:u.email,role:u.role});
const cookieValue = req => /(?:^|;\s*)xb_session=([A-Za-z0-9_-]+)/.exec(req.headers.cookie || '')?.[1] || '';

async function rawBody(req) {
  requireThat(req.headers['content-type']?.startsWith('application/json'), 'Envie JSON.',415);
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    requireThat(size <= 5*1024*1024, 'Arquivo maior que 5 MB.',413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function body(req) {
  const raw=await rawBody(req);
  try { return JSON.parse(raw.toString('utf8')); }
  catch { throw new HttpError(400,'JSON inválido.'); }
}
export async function bootstrapAdmin(db, email, password) {
  if ((await db.query('SELECT id FROM users LIMIT 1')).rows.length) return;
  const normalizedEmail = emailAddress(email);
  const hash = await passwordHash(password);
  await db.query('INSERT INTO users(id,email,name,password_hash,role) VALUES($1,$2,$3,$4,$5)',
    [randomUUID(),normalizedEmail,'Administrador',hash,'admin']);
}
export function application(db, {origin, logger = console, whatsapp = {}} = {}) {
  const originUrl = new URL(origin);
  requireThat(originUrl.protocol === 'https:' ||
    (originUrl.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(originUrl.hostname)),
    'Use HTTPS fora do computador local.');
  const limitLogin = rateLimiter(10), limitPublic = rateLimiter(120), limitOrders=rateLimiter(20);
  const secure = originUrl.protocol === 'https:';
  const setCookie = (res, token, maxAge = 28800) => res.setHeader('Set-Cookie',
    'xb_session='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+maxAge+(secure?'; Secure':''));
  const send = (res, status, value) => {
    res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    res.end(JSON.stringify(value));
  };
  return createServer(async (req,res) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Frame-Options','DENY');
    try {
      const url = new URL(req.url,origin), path = url.pathname, method = req.method;
      if (!['GET','POST','PUT','DELETE'].includes(method)) throw new HttpError(405,'Método não permitido.');
      if (path.startsWith('/api/')) {
        res.setHeader('Cache-Control','no-store');
        if(path==='/api/webhooks/whatsapp'){
          requireThat(whatsappConfigured(whatsapp),'WhatsApp ainda não configurado.',503);
          if(method==='GET'){
            requireThat(url.searchParams.get('hub.mode')==='subscribe'&&
              url.searchParams.get('hub.verify_token')===whatsapp.verifyToken,'Verificação inválida.',403);
            res.writeHead(200,{'Content-Type':'text/plain','Cache-Control':'no-store'});
            return res.end(url.searchParams.get('hub.challenge')||'');
          }
          requireThat(method==='POST','Método inválido.',405);
          const raw=await rawBody(req);verifyWhatsApp(raw,req.headers['x-hub-signature-256'],whatsapp);
          let payload;try{payload=JSON.parse(raw)}catch{throw new HttpError(400,'JSON inválido.')}
          return send(res,200,await receiveWhatsApp(db,payload,whatsapp));
        }
        if (method !== 'GET') {
          requireThat(req.headers.origin === originUrl.origin &&
            req.headers['x-xburguer-request'] === '1','Origem de requisição inválida.',403);
        }
        if (path === '/api/health' && method === 'GET') {
          await db.query('SELECT 1'); return send(res,200,{ok:true});
        }
        if (path === '/api/login' && method === 'POST') {
          limitLogin(req.socket.remoteAddress);
          const input = await body(req), email = emailAddress(input.email);
          const result = await db.query('SELECT * FROM users WHERE email=$1 AND active=true',[email]);
          const user = result.rows[0];
          // Same expensive password derivation for an unknown account.
          const fallback = '00000000000000000000000000000000:'+'00'.repeat(64);
          const valid = await passwordMatches(input.password,user?.password_hash || fallback);
          requireThat(user && valid,'E-mail ou senha incorretos.',401);
          const token = secret();
          await db.query('DELETE FROM sessions WHERE expires_at<now()');
          await db.query('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)',
            [digest(token),user.id,new Date(Date.now()+8*3600000)]);
          setCookie(res,token); return send(res,200,{user:publicUser(user)});
        }
        if (path === '/api/logout' && method === 'POST') {
          await db.query('DELETE FROM sessions WHERE token_hash=$1',[digest(cookieValue(req))]);
          setCookie(res,'',0); return send(res,200,{ok:true});
        }
        if (path.startsWith('/api/public/')) {
          limitPublic(req.socket.remoteAddress);
          if (path === '/api/public/menu' && method === 'GET') return send(res,200,publicCatalog((await readState(db)).document));
          if (path === '/api/public/orders' && method === 'POST') {
            limitOrders(req.socket.remoteAddress);
            return send(res,201,await placeOrder(db,await body(req),req.headers['idempotency-key']));
          }
          if (path === '/api/public/quote' && method === 'POST') {
            const quote=await quoteCart(db,(await readState(db)).document,await body(req));
            const {subtotal,discount,fee,totalCents}=quote;
            return send(res,200,{subtotal,discount,fee,totalCents});
          }
          if (path === '/api/public/tracking' && method === 'POST') {
            const input = await body(req); return send(res,200,await trackOrder(db,String(input.token || '')));
          }
          throw new HttpError(404,'Recurso não encontrado.');
        }
        const session = await db.query('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true',
          [digest(cookieValue(req))]);
        const user = session.rows[0];
        requireThat(user,'Entre novamente para continuar.',401);
        if (path === '/api/session' && method === 'GET') return send(res,200,{user:publicUser(user)});
        if (path === '/api/workspace' && method === 'GET') {
          allow(user,staffRoles);
          const {document:state,revision} = await readState(db);
          const orders = state.orders.filter(o => !['done','cancelled'].includes(o.status)).map(o => ({
            id:o.id,type:o.type,table:o.table,status:o.status,notes:o.notes,scheduledAt:o.scheduledAt || '',
            items:o.items.map(i=>({name:state.products.find(p=>p.id===i.p)?.name || 'Produto',quantity:i.q}))
          }));
          return send(res,200,{revision,orders,tables:state.tables.map(t=>({id:t.id,name:t.name,status:t.status})),
            catalog:publicCatalog(state),user:publicUser(user)});
        }
        if (path === '/api/workspace/order' && method === 'POST') {
          allow(user,['admin','cashier','waiter']);
          const input = await body(req);
          return send(res,201,await placeOrder(db,input,req.headers['idempotency-key'],user));
        }
        if (path === '/api/workspace/status' && method === 'POST') {
          allow(user,['admin','cashier','kitchen']);
          const input = await body(req);
          const revision = await db.transaction(async tx => {
            const {document} = await readState(tx,true), order = document.orders.find(o=>o.id===input.id);
            requireThat(order,'Pedido não encontrado.',404);
            requireThat((order.status==='analysis'&&input.status==='production') ||
              (order.status==='production'&&input.status==='ready'),'Transição de pedido inválida.',409);
            requireThat(!order.scheduledAt || Date.parse(order.scheduledAt)<=Date.now(),
              'Pedido agendado: aguarde o horário de início.',409);
            order.status=input.status;
            await audit(tx,user,'order.status',{id:order.id,status:order.status});
            return writeState(tx,document);
          });
          return send(res,200,{revision});
        }
        // Snapshot compatibility is deliberately restricted to the administrator.
        // Other roles only receive minimal domain data and validated commands above.
        allow(user,['admin']);
        if(path==='/api/loyalty'&&method==='GET'){
          const {document}=await readState(db),customers=[];
          for(const customer of document.customers)customers.push({id:customer.id,name:customer.name,balanceCents:await balance(db,customer.id)});
          return send(res,200,customers);
        }
        if(path==='/api/loyalty/redeem'&&method==='POST'){
          return send(res,200,await redeemLoyalty(db,user,await body(req)));
        }
        if(path==='/api/whatsapp/send'&&method==='POST'){
          return send(res,200,await sendWhatsApp(db,user,await body(req),req.headers['idempotency-key'],whatsapp));
        }
        if (path === '/api/state' && method === 'GET') return send(res,200,await readState(db));
        if (path === '/api/state/import' && method === 'POST') {
          const document = cleanState(await body(req));
          await db.transaction(async tx => {
            // Unique singleton row makes parallel first imports mutually exclusive.
            const result = await tx.query('INSERT INTO store_state(id,document) VALUES(1,$1) ON CONFLICT DO NOTHING RETURNING id',
              [JSON.stringify(document)]);
            requireThat(result.rows.length,'A loja já foi migrada. A importação inicial não pode sobrescrever dados.',409);
            await audit(tx,user,'migration.import',{orders:document.orders.length,products:document.products.length});
          });
          return send(res,201,{revision:1});
        }
        if (path === '/api/state' && method === 'PUT') {
          const document = cleanState(await body(req)), expected = Number(req.headers['if-match']);
          requireThat(Number.isInteger(expected) && expected>0,'Informe a revisão dos dados.',428);
          const revision = await db.transaction(async tx => {
            const current = await readState(tx,true);
            requireThat(current.revision===expected,'Outro aparelho alterou os dados. Atualize antes de tentar novamente.',409);
            for (const previous of current.document.orders) {
              const next=document.orders.find(order=>order.id===previous.id);
              requireThat(next,'A loja conectada preserva o histórico. Cancele o pedido em vez de excluí-lo.',409);
              if (previous.scheduledAt && Date.parse(previous.scheduledAt)>Date.now() && next &&
                  previous.status==='analysis') {
                requireThat(['analysis','cancelled'].includes(next.status),
                  'Um pedido agendado ainda não pode entrar em preparo.',409);
              }
            }
            await reconcileLoyalty(tx,current.document,document);
            await audit(tx,user,'state.update',{fromRevision:expected,orders:document.orders.length});
            return writeState(tx,document);
          });
          return send(res,200,{revision});
        }
        if (path === '/api/audit' && method === 'GET') {
          return send(res,200,(await db.query('SELECT id,actor_id,action,details,created_at FROM audit_events ORDER BY id DESC LIMIT 100')).rows);
        }
        if (path === '/api/users' && method === 'GET') {
          return send(res,200,(await db.query('SELECT id,email,name,role,active FROM users ORDER BY name')).rows);
        }
        if (path === '/api/users' && method === 'POST') {
          const input = await body(req), role = input.role, name = cleanText(input.name,120);
          requireThat(staffRoles.includes(role) && name.length>=2,'Nome ou perfil inválido.');
          const email = emailAddress(input.email), hash = await passwordHash(input.password);
          await db.transaction(async tx => {
            await tx.query('INSERT INTO users(id,email,name,password_hash,role) VALUES($1,$2,$3,$4,$5)',
              [randomUUID(),email,name,hash,role]);
            await audit(tx,user,'user.created',{email,role});
          });
          return send(res,201,{ok:true});
        }
        if (path === '/api/users/deactivate' && method === 'POST') {
          const input = await body(req);
          requireThat(input.id!==user.id,'Você não pode desativar seu próprio acesso.');
          await db.transaction(async tx => {
            const updated = await tx.query('UPDATE users SET active=false WHERE id=$1 RETURNING id',[input.id]);
            requireThat(updated.rows.length,'Usuário não encontrado.',404);
            await tx.query('DELETE FROM sessions WHERE user_id=$1',[input.id]);
            await audit(tx,user,'user.deactivated',{id:input.id});
          });
          return send(res,200,{ok:true});
        }
        if (path === '/api/coupons' && method === 'GET') {
          return send(res,200,(await db.query('SELECT * FROM coupons ORDER BY code')).rows);
        }
        if (path === '/api/coupons' && method === 'POST') {
          const input = await body(req), code = cleanText(input.code,32).toUpperCase();
          requireThat(/^[A-Z0-9_-]{3,32}$/.test(code),'Código de cupom inválido.');
          requireThat(Number.isInteger(input.percent) && input.percent>=1 && input.percent<=100 &&
            Number.isInteger(input.minimumCents) && input.minimumCents>=0 &&
            Number.isInteger(input.maxUses) && input.maxUses>0 &&
            Date.parse(input.expiresAt)>Date.now(),'Regras de cupom inválidas.');
          await db.transaction(async tx => {
            await tx.query('INSERT INTO coupons(code,percent,minimum_cents,max_uses,expires_at) VALUES($1,$2,$3,$4,$5)',
              [code,input.percent,input.minimumCents,input.maxUses,new Date(input.expiresAt)]);
            await audit(tx,user,'coupon.created',{code});
          });
          return send(res,201,{ok:true});
        }
        if (path === '/api/table-links' && method === 'POST') {
          const input=await body(req), token=secret();
          await db.transaction(async tx => {
            const {document}=await readState(tx,true);
            requireThat(document.tables.some(t=>t.id===input.tableId),'Mesa não encontrada.',404);
            await tx.query('DELETE FROM table_links WHERE table_id=$1',[input.tableId]);
            await tx.query('INSERT INTO table_links(token_hash,table_id) VALUES($1,$2)',[digest(token),input.tableId]);
            await audit(tx,user,'table.link.rotated',{id:input.tableId});
          });
          return send(res,201,{url:originUrl.origin+'/loja.html#mesa='+token});
        }
        if (path === '/api/integrations' && method === 'GET') {
          return send(res,200,{payments:{status:'not_configured'},fiscal:{status:'not_configured'},
            whatsapp:{status:whatsappConfigured(whatsapp)?'configured':'requires_business_platform'},logistics:{status:'not_configured'}});
        }
        throw new HttpError(404,'Recurso não encontrado.');
      }
      requireThat(method==='GET','Método não permitido.',405);
      if(path==='/assets/js/runtime.js') {
        res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});
        return res.end('globalThis.XB_RUNTIME=Object.freeze({connected:true});');
      }
      // Never expose server sources, environment files, backups or dependencies.
      const requested=path==='/'?'index.html':decodeURIComponent(path).replace(/^\//,'');
      requireThat(['index.html','loja.html','equipe-online.html','manifest.webmanifest','service-worker.js'].includes(requested) ||
        requested.startsWith('assets/'),'Página não encontrada.',404);
      const full=resolve(repo,requested);
      requireThat(full.startsWith(resolve(repo)+sep) && !requested.includes('\\'),'Caminho inválido.',404);
      requireThat(!requested.split('/').includes('..') && types[extname(full)],'Arquivo não encontrado.',404);
      let data=await readFile(full);
      if(requested.endsWith('.html'))data=Buffer.from(data.toString('utf8').replace('<head>',
        '<head><meta name="xb-platform" content="connected">'));
      res.writeHead(200,{'Content-Type':types[extname(full)],'Cache-Control':'no-cache'});
      res.end(data);
    } catch(error) {
      const status=error.status || (error.code==='ENOENT'?404:error.code==='23505'?409:500);
      if(status===500) logger.error('platform.request.failed',{code:error.code || 'internal'});
      send(res,status,{error:status===500?'Não foi possível concluir a operação.':
        error.code==='23505'?'Este cadastro já existe.':status===404?'Recurso não encontrado.':error.message});
    }
  });
}

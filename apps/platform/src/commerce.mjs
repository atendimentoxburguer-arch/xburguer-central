import { randomUUID } from 'node:crypto';
import { digest, secret, requireThat, cleanText } from './security.mjs';
import { readState, writeState, audit } from './state.mjs';

const cents = value => Math.round(Number(value || 0) * 100);
export function publicCatalog(state) {
  return {
    store: { name: state.settings.storeName, open: !!state.settings.storeOpen,
      deliveryFeeCents: cents(state.settings.deliveryFee) },
    categories: state.categories.map(({id,name}) => ({id,name})),
    products: state.products.filter(p => p.active && !p.sold && p.stock > 0).map(p => ({
      id:p.id, category:p.cat, name:p.name, priceCents:cents(p.price), image:p.image || '', emoji:p.emoji || '🍔'
    }))
  };
}
export async function quoteCart(tx,state,input,lock=false) {
  requireThat(state.settings.storeOpen,'A loja está fechada para novos pedidos.',409);
  requireThat(Array.isArray(input.items)&&input.items.length>0&&input.items.length<=50,'Escolha de 1 a 50 itens.');
  requireThat(['Retirada','Delivery','Mesa'].includes(input.type),'Tipo de pedido inválido.');
  const quantities = new Map();
  for (const item of input.items) {
    requireThat(Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 99, 'Quantidade inválida.');
    quantities.set(item.id,(quantities.get(item.id) || 0)+item.quantity);
  }
  const items = [...quantities].map(([id,quantity]) => {
    const p = state.products.find(p => p.id === id);
    requireThat(p && p.active && !p.sold && p.stock >= quantity && quantity <= 99,
      'Um produto ficou indisponível. Atualize o cardápio.', 409);
    return {p:id,q:quantity,price:cents(p.price)/100,cost:Number(p.cost)||0};
  });
  const subtotal = items.reduce((total,item) => total+cents(item.price)*item.q,0);
  let discount = 0;
  if (input.coupon) {
    const code = cleanText(input.coupon,32).toUpperCase();
    const result = await tx.query('SELECT * FROM coupons WHERE code=$1'+(lock?' FOR UPDATE':''),[code]);
    const coupon = result.rows[0];
    requireThat(coupon && coupon.active && new Date(coupon.expires_at).getTime() > Date.now() &&
      coupon.uses < coupon.max_uses && subtotal >= coupon.minimum_cents, 'Cupom inválido, vencido ou indisponível.');
    discount = Math.round(subtotal*coupon.percent/100);
    
  }
  const fee = input.type === 'Delivery' ? cents(state.settings.deliveryFee) :
    input.type === 'Mesa' ? Math.round(subtotal*Number(state.settings.serviceFee || 0)/100) : 0;
  return {items,subtotal,discount,fee,totalCents:subtotal+fee-discount};
}
export async function placeOrder(db, input, key, actor = null) {
  requireThat(typeof key === 'string' && /^[A-Za-z0-9_-]{16,96}$/.test(key), 'Identificador de envio inválido.');
  requireThat(Array.isArray(input.items) && input.items.length > 0 && input.items.length <= 50, 'Escolha de 1 a 50 itens.');
  const requestHash = digest(JSON.stringify(input));
  return db.transaction(async tx => {
    const {document:state} = await readState(tx, true);
    // The store row serializes inventory, coupon redemption and request deduplication.
    const previous = await tx.query('SELECT request_hash,result FROM idempotency_keys WHERE scope=$1 AND key=$2',
      ['order',key]);
    if (previous.rows.length) {
      requireThat(previous.rows[0].request_hash === requestHash, 'Identificador já usado em outro pedido.', 409);
      return previous.rows[0].result;
    }
    requireThat(state.settings.storeOpen, 'A loja está fechada para novos pedidos.', 409);
    requireThat(['Retirada','Delivery','Mesa'].includes(input.type), 'Tipo de pedido inválido.');
    const name = cleanText(input.name,120), phone = cleanText(input.phone,25), address = cleanText(input.address,300);
    requireThat(name.length >= 2, 'Informe seu nome.');
    if (input.type !== 'Mesa') requireThat(phone.replace(/\D/g,'').length >= 10, 'Informe seu telefone com DDD.');
    if (input.type === 'Delivery') requireThat(address.length >= 8, 'Informe o endereço completo.');
    let table = '';
    if (input.type === 'Mesa') {
      const link = actor ? {rows:[{table_id:input.tableId}]} :
        await tx.query('SELECT table_id FROM table_links WHERE token_hash=$1', [digest(String(input.tableToken || ''))]);
      const target = state.tables.find(t => t.id === link.rows[0]?.table_id);
      requireThat(target, 'Link da mesa inválido ou revogado.', 403);
      table = target.name;
    }
    let scheduledAt = '';
    if (input.scheduledAt) {
      const time = Date.parse(input.scheduledAt), now = Date.now();
      requireThat(Number.isFinite(time) && time >= now + 15*60000 && time <= now + 7*86400000,
        'Agende entre 15 minutos e 7 dias a partir de agora.');
      scheduledAt = new Date(time).toISOString();
      requireThat(input.type !== 'Mesa', 'Pedidos da mesa não podem ser agendados.');
    }
    const {items,subtotal,discount,fee,totalCents}=await quoteCart(tx,state,input,true);
    requireThat(input.expectedTotalCents===undefined||input.expectedTotalCents===totalCents,'O total mudou. Confira os valores e envie novamente.',409);
    if(input.coupon)await tx.query('UPDATE coupons SET uses=uses+1 WHERE code=$1',[cleanText(input.coupon,32).toUpperCase()]);
    const highest=state.orders.reduce((max,order)=>Math.max(max,Number(order.id)||0),77500);
    const next=Math.max(highest,Number(state.settings.nextOrderNumber)||0)+1;
    requireThat(Number.isSafeInteger(next),'Sequência de pedidos inválida.');
    state.settings.nextOrderNumber=next;
    const id = String(next), trackingToken = secret();
    let customerId='';
    if(phone){
      const digits=phone.replace(/\D/g,'');
      let customer=state.customers.find(c=>String(c.phone||'').replace(/\D/g,'')===digits);
      if(!customer){customer={id:'customer-'+randomUUID(),name,phone,address};state.customers.push(customer)}
      customerId=customer.id;
    }
    const order = {
      id,type:input.type,table,customer:name,customerId,phone,address,payment:'Não registrado',
      status: !scheduledAt && state.settings.autoAccept ? 'production':'analysis',
      createdAt:new Date().toISOString(),items,notes:cleanText(input.notes,500),courier:'',
      discount:discount/100,surcharge:0,deliveryFee:input.type === 'Delivery' ? fee/100:0,
      serviceFeePct:input.type === 'Mesa' ? Number(state.settings.serviceFee || 0):0,
      scheduled:!!scheduledAt,scheduledAt,source:'cardapio',totalCents:subtotal+fee-discount
    };
    state.orders.push(order);
    for (const item of items) {
      const product = state.products.find(p => p.id === item.p);
      product.stock -= item.q;
      product.sold = Boolean(product.manualSold || product.stock <= 0);
      state.inventoryMovements.push({id:'mov-'+randomUUID(),productId:item.p,delta:-item.q,
        reason:'Pedido online',ref:id,at:new Date().toISOString(),balance:product.stock});
    }
    if (table) state.tables.find(t => t.name === table).status = 'busy';
    const revision = await writeState(tx,state);
    await tx.query('INSERT INTO public_orders(tracking_hash,order_id) VALUES($1,$2)',[digest(trackingToken),id]);
    const result = {id,trackingToken,totalCents:order.totalCents,scheduledAt,revision,paymentStatus:'pending'};
    await tx.query('INSERT INTO idempotency_keys(scope,key,request_hash,result) VALUES($1,$2,$3,$4)',
      ['order',key,requestHash,JSON.stringify(result)]);
    await audit(tx,actor,'order.created',{orderId:id,totalCents:order.totalCents,scheduledAt});
    return result;
  });
}
export async function trackOrder(db, token) {
  const link = await db.query('SELECT order_id FROM public_orders WHERE tracking_hash=$1',[digest(token)]);
  requireThat(link.rows.length, 'Pedido não encontrado.',404);
  const {document} = await readState(db);
  const order = document.orders.find(o => o.id === link.rows[0].order_id);
  requireThat(order, 'Pedido não encontrado.',404);
  // No names, phone numbers, addresses or other customer records in tracking responses.
  const subtotal=order.items.reduce((sum,item)=>sum+cents(item.price)*item.q,0);
  const fees=order.type==='Delivery'?cents(order.deliveryFee):
    order.type==='Mesa'?Math.round(subtotal*Number(order.serviceFeePct || 0)/100):0;
  return {id:order.id,status:order.status,scheduledAt:order.scheduledAt || '',
    totalCents:Math.max(0,subtotal+fees+cents(order.surcharge)-cents(order.discount))};
}

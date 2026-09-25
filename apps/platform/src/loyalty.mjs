import { randomUUID } from 'node:crypto';
import { requireThat } from './security.mjs';
import { readState,writeState,audit } from './state.mjs';

const cents=value=>Math.round(Number(value||0)*100);
export function orderCents(order) {
  const subtotal=order.items.reduce((sum,item)=>sum+cents(item.price)*Number(item.q),0);
  const fees=order.type==='Delivery'?cents(order.deliveryFee):
    order.type==='Mesa'?Math.round(subtotal*Number(order.serviceFeePct||0)/100):0;
  return Math.max(0,subtotal+fees+cents(order.surcharge)-cents(order.discount));
}
async function ledger(tx,customerId,orderId,delta,reason) {
  if(!delta)return;
  await tx.query('INSERT INTO loyalty_ledger(id,customer_id,order_id,delta_cents,reason) VALUES($1,$2,$3,$4,$5)',
    [randomUUID(),customerId,orderId,delta,reason]);
}
export async function balance(tx,customerId) {
  const result=await tx.query('SELECT COALESCE(SUM(delta_cents),0) AS balance FROM loyalty_ledger WHERE customer_id=$1',[customerId]);
  return Number(result.rows[0].balance);
}
export async function reconcileLoyalty(tx,before,after) {
  const previousOrders=new Map(before.orders.map(order=>[order.id,order]));
  const nextOrders=new Map(after.orders.map(order=>[order.id,order]));
  const signature=order=>order?JSON.stringify([order.customerId,order.status,order.type,
    order.items.map(item=>[item.p,item.q,item.price]),order.discount,order.surcharge,
    order.deliveryFee,order.serviceFeePct,order.settlements]):'';
  const changed=after.orders.filter(order=>signature(previousOrders.get(order.id))!==signature(order));
  if(!changed.length)return;
  const redemptions=(await tx.query('SELECT * FROM loyalty_redemptions WHERE refunded=false AND order_id=ANY($1::text[])',
    [changed.map(order=>order.id)])).rows;
  for(const redemption of redemptions) {
    const old=previousOrders.get(redemption.order_id),next=nextOrders.get(redemption.order_id);
    requireThat(next,'Cancele o pedido antes de remover um resgate de cashback.',409);
    if(next.status==='cancelled') {
      await ledger(tx,redemption.customer_id,next.id,redemption.amount_cents,'Resgate devolvido por cancelamento');
      await tx.query('UPDATE loyalty_redemptions SET refunded=true WHERE order_id=$1',[next.id]);
    }else{
      const pricing=o=>JSON.stringify([o.customerId,o.type,o.items.map(i=>[i.p,i.q,i.price]),o.discount,o.surcharge,o.deliveryFee,o.serviceFeePct]);
      requireThat(old&&pricing(old)===pricing(next),'Pedido com cashback resgatado não pode ter preços ou cliente alterados. Cancele e refaça.',409);
    }
  }
  for(const next of changed) {
    const previous=previousOrders.get(next.id);
    if(next.status!=='done'&&previous?.status!=='done')continue;
    const recorded=(await tx.query('SELECT * FROM loyalty_accruals WHERE order_id=$1',[next.id])).rows[0];
    // Historical imports do not manufacture a cashback liability retroactively.
    if(!recorded && previous?.status==='done')continue;
    const customer=after.customers.find(c=>c.id===next.customerId);
    const total=orderCents(next);
    const paid=(next.settlements||[]).reduce((sum,payment)=>sum+Number(payment.amountCents||0),0);
    const rate=recorded?Number(recorded.rate_percent):Number(after.settings.cashback||0);
    const eligible=customer && (recorded||after.settings.loyalty) && next.status==='done' && total>0 && paid>=total;
    const desired=eligible?Math.round(total*rate/100):0;
    if(recorded) {
      requireThat(recorded.customer_id===next.customerId,'Cliente de um pedido com cashback não pode ser alterado.',409);
      if(desired!==Number(recorded.amount_cents)) {
        await ledger(tx,recorded.customer_id,next.id,desired-recorded.amount_cents,'Ajuste por pagamento ou estorno');
        await tx.query('UPDATE loyalty_accruals SET amount_cents=$2 WHERE order_id=$1',[next.id,desired]);
      }
    }else if(desired) {
      await ledger(tx,next.customerId,next.id,desired,'Cashback de compra paga');
      await tx.query('INSERT INTO loyalty_accruals(order_id,customer_id,amount_cents,rate_percent) VALUES($1,$2,$3,$4)',[next.id,next.customerId,desired,rate]);
    }
  }
}
export async function redeemLoyalty(db,user,input) {
  requireThat(Number.isSafeInteger(input.amountCents)&&input.amountCents>0,'Valor de resgate inválido.');
  return db.transaction(async tx=>{
    const {document}=await readState(tx,true),order=document.orders.find(o=>o.id===input.orderId);
    requireThat(order&&!['done','cancelled'].includes(order.status)&&order.customerId,'Escolha um pedido aberto com cliente cadastrado.',409);
    requireThat(!(order.settlements||[]).length,'Resgate antes de registrar pagamentos.',409);
    const exists=(await tx.query('SELECT * FROM loyalty_redemptions WHERE order_id=$1',[order.id])).rows[0];
    if(exists) {
      requireThat(!exists.refunded&&Number(exists.amount_cents)===input.amountCents,'Este pedido já teve resgate de cashback.',409);
      return {ok:true,alreadyApplied:true};
    }
    const available=await balance(tx,order.customerId);
    requireThat(available>=input.amountCents&&orderCents(order)>=input.amountCents,'Saldo ou valor do pedido insuficiente.',409);
    order.discount=(cents(order.discount)+input.amountCents)/100;
    await ledger(tx,order.customerId,order.id,-input.amountCents,'Resgate no pedido');
    await tx.query('INSERT INTO loyalty_redemptions(order_id,customer_id,amount_cents) VALUES($1,$2,$3)',[order.id,order.customerId,input.amountCents]);
    await audit(tx,user,'loyalty.redeemed',{orderId:order.id,amountCents:input.amountCents});
    const revision=await writeState(tx,document);
    return {ok:true,revision,balanceCents:available-input.amountCents};
  });
}

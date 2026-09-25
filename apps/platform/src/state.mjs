import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { requireThat } from './security.mjs';

// Executes only repository-owned code; never evaluates requests or imported backups.
// Sharing the existing validator keeps the migration compatible with the current schema.
const context = vm.createContext({ console, Date, Math, URL, Blob, setTimeout, clearTimeout });
vm.runInContext(readFileSync(new URL('../../../assets/js/core.js', import.meta.url), 'utf8'), context);
const legacy = vm.runInContext('({validateState, defaultState, SCHEMA_VERSION})', context);

export function cleanState(input) {
  requireThat(input && typeof input === 'object' && !Array.isArray(input), 'Backup inválido.');
  const state = structuredClone(input.state || input);
  requireThat(state.schemaVersion === legacy.SCHEMA_VERSION, 'Atualize o sistema antes de migrar este backup.');
  const issue = legacy.validateState(state);
  requireThat(!issue, issue);
  requireThat(state.settings && typeof state.settings === 'object', 'Configurações inválidas.');
  requireThat(typeof state.settings.storeOpen==='boolean','Situação da loja inválida.');
  for(const key of ['deliveryFee','serviceFee','cashback']) {
    requireThat(Number.isFinite(state.settings[key]) && state.settings[key]>=0 &&
      state.settings[key]<=(key==='deliveryFee'?100000:100),'Taxa inválida: '+key);
  }
  for (const product of state.products) {
    requireThat(Number.isFinite(product.price) && product.price >= 0 && product.price <= 100000,
      'Preço de produto inválido.');
    requireThat(Number.isSafeInteger(product.stock) && product.stock >= 0 && product.stock<=1e9, 'Estoque inválido.');
  }
  for (const order of state.orders) {
    requireThat(Array.isArray(order.items) && order.items.length <= 200, 'Itens de pedido inválidos.');
    for (const item of order.items) requireThat(Number.isFinite(item.q) && item.q > 0 &&
      Number.isFinite(item.price) && item.price >= 0, 'Quantidade ou preço inválido.');
    for(const payment of order.settlements||[])requireThat(Number.isSafeInteger(payment.amountCents)&&payment.amountCents>0,
      'Recebimento inválido.');
  }
  // Pairing credentials and local spool must never leave the workstation.
  delete state.settings.printing;
  state.printOutbox = [];
  return state;
}
export const demoState = () => JSON.parse(JSON.stringify(legacy.defaultState()));
export async function readState(db, lock = false) {
  const result = await db.query('SELECT revision, document FROM store_state WHERE id=1' + (lock ? ' FOR UPDATE' : ''));
  requireThat(result.rows.length, 'O administrador ainda não migrou os dados da loja.', 503);
  return result.rows[0];
}
export async function audit(db, actor, action, details = {}) {
  await db.query('INSERT INTO audit_events(actor_id,action,details) VALUES($1,$2,$3)',
    [actor?.id || null, action, JSON.stringify(details)]);
}
export async function writeState(db, document) {
  const result = await db.query('UPDATE store_state SET document=$1,revision=revision+1,updated_at=now() WHERE id=1 RETURNING revision',
    [JSON.stringify(document)]);
  return result.rows[0].revision;
}

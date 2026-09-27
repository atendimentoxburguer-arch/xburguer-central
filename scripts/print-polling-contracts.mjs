import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const timers=new Map(),listeners=new Map(),requests=[];
let sequence=0,releaseHealth;
const context=vm.createContext({
 console,URL,Date,Math,
 state:{settings:{printing:{agent:{enabled:true,token:''}}},printOutbox:[]},
 document:{visibilityState:'visible',getElementById(){return null},addEventListener(name,fn){listeners.set(name,fn)}},
 window:{addEventListener(){}},navigator:{},save(){},
 setTimeout(fn,delay){const id=++sequence;timers.set(id,{fn,delay});return id},
 clearTimeout(id){timers.delete(id)},
 xbPrintDesktop:{request({path}){
  requests.push(path);
  if(path==='/health')return new Promise(resolve=>{releaseHealth=()=>resolve({ok:true,version:'test'})});
  return Promise.resolve({ok:true,queue:{queued:0}});
 }}
});
vm.runInContext(fs.readFileSync('assets/js/print-agent-client.js','utf8'),context);
const settle=()=>new Promise(resolve=>setImmediate(resolve));
context.initPrintAgentClient();context.initPrintAgentClient();
listeners.get('visibilitychange')();listeners.get('visibilitychange')();
assert.deepEqual(requests,['/health'],'Inicialização e foco não sobrepõem uma consulta pendente');
assert.equal(timers.size,0,'Próximo ciclo aguarda a resposta');
releaseHealth();await settle();
assert.deepEqual(requests,['/health','/jobs?limit=1']);
assert.equal(timers.size,1);
assert.equal([...timers.values()][0].delay,15000);
// Fila pendente reutiliza a consulta do ciclo e envia cada job uma vez.
context.state.printOutbox=[{id:'job-1',document:{id:'order-1'}}];
const timer=[...timers.values()][0];timers.clear();timer.fn();
releaseHealth();await settle();
assert.equal(requests.filter(p=>p==='/health').length,2);
assert.equal(requests.filter(p=>p==='/jobs').length,1);
assert.equal(context.state.printOutbox.length,0);
assert.equal(timers.size,1);
context.state.settings.printing.agent.enabled=false;
const before=requests.length;
listeners.get('visibilitychange')();await settle();
assert.equal(requests.length,before,'Agente desativado não recebe consultas');
assert.equal(timers.size,1);
console.log('Print polling contracts OK');

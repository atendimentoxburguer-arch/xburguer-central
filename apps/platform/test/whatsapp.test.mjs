import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { migrate } from '../src/db.mjs';
import { demoState,cleanState } from '../src/state.mjs';
import { verifyWhatsApp,receiveWhatsApp,sendWhatsApp } from '../src/whatsapp.mjs';
import { secret } from '../src/security.mjs';

test('official WhatsApp: signatures, inbound deduplication, reply window and uncertain delivery',async t=>{
 const engine=new PGlite();
 const db={query:(sql,params)=>sql.includes('CREATE TABLE')?engine.exec(sql):engine.query(sql,params),transaction:work=>engine.transaction(work)};
 t.after(()=>engine.close());await migrate(db);
 await db.query('INSERT INTO store_state(id,document) VALUES(1,$1)',[JSON.stringify(cleanState(demoState()))]);
 const config={appSecret:'test-only',verifyToken:'verify-only',phoneNumberId:'123',accessToken:'not-a-real-token',version:'v23.0'};
 const payload={object:'whatsapp_business_account',entry:[{changes:[{value:{metadata:{phone_number_id:'123'},contacts:[{wa_id:'5562999999999',profile:{name:'Cliente'}}],
  messages:[{id:'msg-1',from:'5562999999999',timestamp:String(Math.floor(Date.now()/1000)),type:'text',text:{body:'Olá'}}]}}]}]};
 const raw=Buffer.from(JSON.stringify(payload));
 const signature='sha256='+createHmac('sha256',config.appSecret).update(raw).digest('hex');
 assert.throws(()=>verifyWhatsApp(raw,'sha256=invalid',config),{status:401});
 verifyWhatsApp(raw,signature,config);
 assert.deepEqual(await receiveWhatsApp(db,payload,config),{received:1});
 assert.deepEqual(await receiveWhatsApp(db,payload,config),{received:0});
 const state=(await db.query('SELECT document FROM store_state WHERE id=1')).rows[0].document;
 const chat=state.chats.find(c=>c.provider==='whatsapp');assert.equal(chat.messages.length,1);
 let calls=0;
 const fakeSend=async(url,options)=>{
  calls++;assert.match(url,/^https:\/\/graph\.facebook\.com\/v23\.0\/123\/messages$/);
  assert.equal(JSON.parse(options.body).text.body,'Oi');
  return {ok:true,json:async()=>({messages:[{id:'provider-id'}]})};
 };
 const key=secret(),input={chatId:chat.id,text:'Oi'};
 assert.deepEqual(await sendWhatsApp(db,null,input,key,config,fakeSend),{status:'sent'});
 assert.deepEqual(await sendWhatsApp(db,null,input,key,config,fakeSend),{status:'sent'});
 assert.equal(calls,1);
 const uncertain=secret();
 await assert.rejects(sendWhatsApp(db,null,input,uncertain,config,async()=>{throw Error('timeout')}),{status:502});
 await assert.rejects(sendWhatsApp(db,null,input,uncertain,config,fakeSend),{status:409});
 assert.equal(calls,1);
 const expired=(await db.query('SELECT document FROM store_state WHERE id=1')).rows[0].document;
 expired.chats.find(c=>c.id===chat.id).lastInboundAt=new Date(Date.now()-25*3600000).toISOString();
 await db.query('UPDATE store_state SET document=$1 WHERE id=1',[JSON.stringify(expired)]);
 await assert.rejects(sendWhatsApp(db,null,input,secret(),config,fakeSend),{status:409});
 await assert.rejects(sendWhatsApp(db,null,input,secret(),{},fakeSend),{status:503});
});

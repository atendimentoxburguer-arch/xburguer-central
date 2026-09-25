import { createHmac,timingSafeEqual } from 'node:crypto';
import { requireThat,digest,cleanText,HttpError } from './security.mjs';
import { readState,writeState,audit } from './state.mjs';

export function whatsappConfigured(config) {
  return Boolean(config.appSecret&&config.verifyToken&&config.phoneNumberId&&config.accessToken&&/^v\d+\.\d+$/.test(config.version||''));
}
export function verifyWhatsApp(raw,signature,config) {
  requireThat(whatsappConfigured(config),'WhatsApp ainda não configurado.',503);
  const actual=Buffer.from(String(signature||''));
  const expected=Buffer.from('sha256='+createHmac('sha256',config.appSecret).update(raw).digest('hex'));
  requireThat(actual.length===expected.length&&timingSafeEqual(actual,expected),'Assinatura inválida.',401);
}
export async function receiveWhatsApp(db,payload,config) {
  requireThat(payload.object==='whatsapp_business_account','Evento inválido.');
  let inserted=0;
  await db.transaction(async tx=>{
    const {document}=await readState(tx,true);
    for(const entry of payload.entry||[]){
      for(const change of entry.changes||[]){
        const value=change.value;
        if(value?.metadata?.phone_number_id!==config.phoneNumberId)continue;
        for(const message of value.messages||[]){
          const from=String(message.from||''),externalId=String(message.id||'');
          requireThat(/^\d{8,16}$/.test(from)&&externalId.length>0&&externalId.length<=250,'Mensagem inválida.');
          const duplicate=await tx.query('INSERT INTO message_events(event_id) VALUES($1) ON CONFLICT DO NOTHING RETURNING event_id',[externalId]);
          if(!duplicate.rows.length)continue;
          const id='wa-'+digest(from).slice(0,24);
          let chat=document.chats.find(c=>c.id===id);
          if(!chat){chat={id,phone:from,name:cleanText(value.contacts?.find(c=>c.wa_id===from)?.profile?.name||from,120),messages:[],unread:0,provider:'whatsapp'};document.chats.push(chat)}
          const receivedAt=Number(message.timestamp)*1000;
          requireThat(Number.isFinite(receivedAt)&&receivedAt<=Date.now()+300000,'Horário inválido.');
          chat.lastInboundAt=new Date(Math.max(Date.parse(chat.lastInboundAt)||0,receivedAt)).toISOString();
          // Media download and audio transcription require a separate, consented integration.
          chat.messages.push(['c',message.type==='text'?cleanText(message.text?.body,4000):'[Mensagem de '+cleanText(message.type,40)+' — abra no WhatsApp]']);
          chat.unread=(Number(chat.unread)||0)+1;inserted++;
        }
      }
    }
    if(inserted){await writeState(tx,document);await audit(tx,null,'whatsapp.received',{count:inserted})}
  });
  return {received:inserted};
}
export async function sendWhatsApp(db,user,input,key,config,transport=fetch) {
  requireThat(whatsappConfigured(config),'Configure o acesso oficial do WhatsApp no servidor.',503);
  requireThat(typeof key==='string'&&/^[A-Za-z0-9_-]{16,96}$/.test(key),'Identificador de envio inválido.');
  const text=cleanText(input.text,4000),requestHash=digest(JSON.stringify({chatId:input.chatId,text}));
  requireThat(text.length,'Digite uma mensagem.');
  const claim=await db.transaction(async tx=>{
    const {document}=await readState(tx,true),chat=document.chats.find(c=>c.id===input.chatId&&c.provider==='whatsapp');
    requireThat(chat,'Conversa oficial não encontrada.',404);
    requireThat(Date.parse(chat.lastInboundAt)>Date.now()-24*3600000,
      'A janela de resposta terminou. É necessário um modelo aprovado pela Meta.',409);
    const existing=await tx.query('SELECT * FROM message_outbox WHERE id=$1',[key]);
    if(existing.rows.length){
      requireThat(existing.rows[0].request_hash===requestHash,'Identificador de envio já utilizado.',409);
      requireThat(existing.rows[0].status==='sent','Envio pendente ou incerto. Confira no WhatsApp antes de tentar novamente.',409);
      return {alreadySent:true};
    }
    await tx.query('INSERT INTO message_outbox(id,request_hash,chat_id,status) VALUES($1,$2,$3,$4)',[key,requestHash,chat.id,'pending']);
    return {phone:chat.phone};
  });
  if(claim.alreadySent)return {status:'sent'};
  let providerId;
  try{
    const response=await transport('https://graph.facebook.com/'+config.version+'/'+encodeURIComponent(config.phoneNumberId)+'/messages',{
      method:'POST',headers:{Authorization:'Bearer '+config.accessToken,'Content-Type':'application/json'},
      body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to:claim.phone,type:'text',text:{body:text}}),
      signal:AbortSignal.timeout(10000)
    });
    if(!response.ok)throw new Error('provider_rejected');
    const result=await response.json();providerId=result.messages?.[0]?.id;
    if(!providerId)throw new Error('provider_unknown');
  }catch{
    await db.query("UPDATE message_outbox SET status='uncertain' WHERE id=$1",[key]);
    throw new HttpError(502,'O provedor não confirmou o envio. Confira no WhatsApp; não houve reenvio automático.');
  }
  await db.transaction(async tx=>{
    const {document}=await readState(tx,true),chat=document.chats.find(c=>c.id===input.chatId);
    if(chat){chat.messages.push(['b',text]);chat.unread=0;await writeState(tx,document)}
    await tx.query("UPDATE message_outbox SET status='sent',provider_id=$2 WHERE id=$1",[key,providerId]);
    await audit(tx,user,'whatsapp.sent',{chatId:input.chatId});
  });
  return {status:'sent'};
}

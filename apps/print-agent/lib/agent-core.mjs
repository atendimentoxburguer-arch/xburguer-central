import { Buffer } from 'node:buffer';

const ESC=0x1b,GS=0x1d;
const bytes=(...values)=>Buffer.from(values);
const CMD={
  init:bytes(ESC,0x40),
  alignLeft:bytes(ESC,0x61,0),
  alignCenter:bytes(ESC,0x61,1),
  boldOn:bytes(ESC,0x45,1),
  boldOff:bytes(ESC,0x45,0),
  doubleOn:bytes(GS,0x21,0x11),
  doubleOff:bytes(GS,0x21,0x00),
  cut:bytes(GS,0x56,0x42,0),
  feed:bytes(0x0a)
};

export function sanitizeText(value=''){
  return String(value)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[–—]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'")
    .replace(/[^\x20-\x7E\n]/g,'?');
}
export function paperColumns(paper){return paper==='58mm'?32:48}
export function wrapText(value,width){
  const text=sanitizeText(value),lines=[];
  for(const raw of text.split(/\r?\n/)){
    let line=raw.trim();
    if(!line){lines.push('');continue}
    while(line.length>width){
      let cut=line.lastIndexOf(' ',width);
      if(cut<Math.floor(width*.55))cut=width;
      lines.push(line.slice(0,cut).trimEnd());
      line=line.slice(cut).trimStart();
    }
    lines.push(line);
  }
  return lines;
}
export function moneyText(value){
  return 'R$ '+Math.max(0,Number(value)||0).toFixed(2).replace('.',',');
}
export function pairLine(left,right,width){
  const a=sanitizeText(left),b=sanitizeText(right);
  const room=Math.max(1,width-b.length-1);
  const leftPart=a.length>room?a.slice(0,Math.max(1,room-1))+'~':a;
  return leftPart+' '.repeat(Math.max(1,width-leftPart.length-b.length))+b;
}
function textBuffer(text=''){return Buffer.from(sanitizeText(text),'ascii')}
function line(text=''){return Buffer.concat([textBuffer(text),CMD.feed])}
function separator(width,char='-'){return line(char.repeat(width))}
function centered(text,width){const t=sanitizeText(text).slice(0,width);return line(' '.repeat(Math.max(0,Math.floor((width-t.length)/2)))+t)}

export function renderEscPosJob(job){
  const profile=job?.profile||{},doc=job?.document||{},paper=profile.paper||'80mm';
  const width=paperColumns(paper),parts=[CMD.init,CMD.alignLeft];
  const strong=profile.strongText!==false;
  if(strong)parts.push(CMD.boldOn);

  parts.push(CMD.alignCenter,CMD.doubleOn,centered(doc.store?.name||'X BURGUER',Math.max(16,Math.floor(width/2))),CMD.doubleOff);
  parts.push(centered(
    doc.purpose==='kitchen'?(doc.station&&doc.station!=='all'?'COZINHA - '+doc.station:'COZINHA'):
    doc.purpose==='delivery'?'EXPEDICAO / DELIVERY':'COMPROVANTE',
    width
  ));
  parts.push(CMD.alignLeft,separator(width,'='));
  parts.push(line(pairLine('PEDIDO #'+(doc.id||''),doc.createdAt||'',width)));
  if(doc.type)parts.push(line(pairLine('TIPO',doc.type,width)));
  if(doc.table)parts.push(line(pairLine('MESA',doc.table,width)));
  parts.push(separator(width));

  if(doc.customer&&doc.customer!=='Nao identificado'){
    parts.push(CMD.boldOn,line(doc.customer));
    if(doc.phone)parts.push(line(doc.phone));
    if(doc.address)wrapText(doc.address,width).forEach(x=>parts.push(line(x)));
    parts.push(separator(width));
  }

  for(const item of doc.items||[]){
    const qty=Math.max(0,Number(item.qty)||0);
    const name=(qty?qty+'x ':'')+(item.name||'Item');
    parts.push(CMD.boldOn);
    wrapText(name,width).forEach(x=>parts.push(line(x)));
    if(doc.purpose==='receipt'&&Number.isFinite(Number(item.total))){
      parts.push(line(pairLine('',moneyText(item.total),width)));
    }else if(doc.purpose==='kitchen'&&item.station){
      parts.push(CMD.boldOff,line('['+sanitizeText(item.station).toUpperCase()+']'));
      if(strong)parts.push(CMD.boldOn);
    }
  }
  parts.push(separator(width));

  if(doc.purpose==='receipt'){
    parts.push(line(pairLine('Subtotal',moneyText(doc.subtotal),width)));
    if(Number(doc.fees)>0)parts.push(line(pairLine(doc.feeLabel||'Taxas',moneyText(doc.fees),width)));
    parts.push(CMD.boldOn,line(pairLine('TOTAL',moneyText(doc.total),width)));
    if(doc.payment)parts.push(line(pairLine('Pagamento',doc.payment,width)));
    parts.push(separator(width));
  }else if(doc.purpose==='delivery'){
    if(doc.payment)parts.push(line(pairLine('Pagamento',doc.payment,width)));
    if(Number.isFinite(Number(doc.total)))parts.push(line(pairLine('Total',moneyText(doc.total),width)));
    parts.push(separator(width));
  }

  if(doc.notes){
    parts.push(CMD.boldOn,line('OBSERVACOES:'));
    wrapText(doc.notes,width).forEach(x=>parts.push(line(x)));
    parts.push(separator(width));
  }

  if(doc.footer)wrapText(doc.footer,width).forEach(x=>parts.push(centered(x,width)));
  parts.push(CMD.boldOff,CMD.feed,CMD.feed,CMD.feed,CMD.cut);
  return Buffer.concat(parts);
}

export function validateJob(input){
  if(!input||typeof input!=='object')return 'Job invalido.';
  if(!/^[A-Za-z0-9._:-]{1,96}$/.test(String(input.id||'')))return 'ID do job invalido.';
  if(!String(input.printerName||'').trim())return 'Impressora fisica nao informada.';
  if(String(input.printerName).length>180)return 'Nome da impressora muito longo.';
  if(!['receipt','kitchen','delivery'].includes(input.document?.purpose))return 'Tipo de documento invalido.';
  if(!['58mm','80mm'].includes(input.profile?.paper))return 'Impressao silenciosa suporta papel termico 58 mm ou 80 mm nesta etapa.';
  const copies=Number(input.profile?.copies)||0;
  if(copies<1||copies>3)return 'Numero de copias invalido.';
  if(!Array.isArray(input.document?.items)||input.document.items.length>120)return 'Itens do documento invalidos.';
  return '';
}

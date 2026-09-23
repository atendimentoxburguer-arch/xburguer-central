import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const jsDir=path.join(root,'assets/js');
const js=fs.readdirSync(jsDir).filter(f=>f.endsWith('.js')).map(f=>path.join(jsDir,f));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');

const required=[
  'assets/css/app.css',
  'assets/css/domain-management.css',
  'assets/css/print.css',
  'assets/img/logo.png',
  'assets/img/icon.svg',
  'assets/img/icon-maskable.svg',
  'manifest.webmanifest',
  'service-worker.js',
  'apps/print-agent/server.mjs',
  'apps/print-agent/lib/agent-core.mjs',
  'apps/print-agent/scripts/raw-print.ps1',
  'apps/print-agent/install-windows.ps1',
  'apps/print-agent/package.json',
  'apps/print-agent/INSTALAR-AGENTE.cmd',
  ...js.map(f=>path.relative(root,f))
];

for(const file of required){
  if(!fs.existsSync(path.join(root,file))){
    console.error('Arquivo obrigatório ausente:',file);
    process.exitCode=1;
  }
}

for(const file of js){
  const text=fs.readFileSync(file,'utf8');
  const htmlish=text.replace(/\\"/g,'"');
  if(/(?<!\.)\b(prompt|confirm)\s*\(/.test(text)){
    console.error('Diálogo nativo encontrado:',path.relative(root,file));
    process.exitCode=1;
  }
  if(/javascript\s*:/i.test(text)){
    console.error('javascript: não permitido:',path.relative(root,file));
    process.exitCode=1;
  }
  if(/\$\{p\.emoji\}/.test(text)){
    console.error('Interpolação de emoji sem escape:',path.relative(root,file));
    process.exitCode=1;
  }
  if(/\$\{o\.table\|\|/.test(text)){
    console.error('Interpolação de mesa sem escape:',path.relative(root,file));
    process.exitCode=1;
  }
  if(/^\s{2}[A-Za-z_$][\w$]*V14\s*=\s*(?:async\s+)?function/m.test(text)){
    console.error('Handler V14 global implícito encontrado:',path.relative(root,file));
    process.exitCode=1;
  }
  if(/(?:onclick|onchange)="[^"]*(?:menuSelectedV14|menuStatusV14|menuSortV14)/.test(htmlish)){
    console.error('Handler HTML referencia estado privado do módulo de cardápio:',path.relative(root,file));
    process.exitCode=1;
  }
  if(/onclick="[^"]*esc\(/.test(htmlish)){
    console.error('Valor escapado para HTML usado dentro de JavaScript inline:',path.relative(root,file));
    process.exitCode=1;
  }
}

const localRefs=[];
for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
  const ref=match[1];
  if(/^(https?:|#|mailto:|tel:)/.test(ref)||ref.startsWith('data:'))continue;
  const clean=ref.split('#')[0].split('?')[0];
  if(clean&&clean!=='.'){
    localRefs.push(clean);
    if(!fs.existsSync(path.join(root,clean))){
      console.error('Referência local ausente:',ref);
      process.exitCode=1;
    }
  }
}

const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]);
for(const requiredScript of ['assets/js/core.js','assets/js/ui.js','assets/js/print-agent-client.js','assets/js/printing.js','assets/js/salon-management.js','assets/js/menu-management.js','assets/js/app.js']){
  if(!scripts.includes(requiredScript)){
    console.error('Script essencial ausente do HTML:',requiredScript);
    process.exitCode=1;
  }
}
if(!(scripts.indexOf('assets/js/core.js')<scripts.indexOf('assets/js/ui.js')&&scripts.indexOf('assets/js/ui.js')<scripts.indexOf('assets/js/print-agent-client.js')&&scripts.indexOf('assets/js/print-agent-client.js')<scripts.indexOf('assets/js/printing.js')&&scripts.indexOf('assets/js/printing.js')<scripts.indexOf('assets/js/salon-management.js')&&scripts.indexOf('assets/js/salon-management.js')<scripts.indexOf('assets/js/menu-management.js')&&scripts.indexOf('assets/js/menu-management.js')<scripts.indexOf('assets/js/app.js'))){
  console.error('Ordem de carregamento inválida: core -> ui -> print-agent-client -> printing -> salon-management -> menu-management -> app.');
  process.exitCode=1;
}

for(const ref of localRefs.filter(ref=>/\.(?:css|js|webmanifest)$/.test(ref))){
  if(!sw.includes(`'./${ref}'`)&&!sw.includes(`"./${ref}"`)){
    console.error('Asset local não incluído no APP_SHELL:',ref);
    process.exitCode=1;
  }
}

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const duplicates=ids.filter((id,i)=>ids.indexOf(id)!==i);
if(duplicates.length){
  console.error('IDs HTML duplicados:',[...new Set(duplicates)].join(', '));
  process.exitCode=1;
}

JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
JSON.parse(fs.readFileSync(path.join(root,'apps/print-agent/package.json'),'utf8'));

if(!process.exitCode)console.log('Static checks OK');

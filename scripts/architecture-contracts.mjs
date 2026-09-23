import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const jsDir=path.join(root,'assets/js');
const jsFiles=fs.readdirSync(jsDir).filter(f=>f.endsWith('.js')).sort();
const appCss=fs.readFileSync(path.join(root,'assets/css/app.css'),'utf8');
const domainCss=fs.readFileSync(path.join(root,'assets/css/domain-management.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

const localStorageOwners=[];
const fetchOwners=[];
for(const file of jsFiles){
  const full=path.join(jsDir,file);
  const text=fs.readFileSync(full,'utf8');

  if(/\blocalStorage\b/.test(text))localStorageOwners.push(file);
  if(/\bfetch\s*\(/.test(text))fetchOwners.push(file);

  const firstLine=text.split(/\r?\n/,1)[0];
  if(/\bV\d+(?:\.\d+)?\b/.test(firstLine)){
    throw new Error('Cabeçalho versionado proibido em '+file+': '+firstLine);
  }

  if(file!=='core.js' && /\b(?:APP_VERSION|SCHEMA_VERSION|STORAGE)\s*=/.test(text)){
    throw new Error('Constante de núcleo declarada fora de core.js: '+file);
  }

  if(!['print-agent-client.js','integrations.js'].includes(file) && /['\"`]https?:\\/\\//i.test(text)){
    throw new Error('URL HTTP hardcoded fora do adaptador permitido: '+file);
  }
}

if(localStorageOwners.join(',')!=='core.js'){
  throw new Error('Persistência local deve ficar exclusivamente em core.js. Encontrado em: '+localStorageOwners.join(', '));
}

if(fetchOwners.some(file=>file!=='print-agent-client.js')){
  throw new Error('fetch() direto fora do cliente do agente local: '+fetchOwners.join(', '));
}

if(appCss.length>115000){
  throw new Error('app.css ultrapassou o orçamento de 115 KB e está acumulando overrides: '+appCss.length+' bytes');
}
if(domainCss.length>27000){
  throw new Error('domain-management.css ultrapassou o orçamento de 27 KB: '+domainCss.length+' bytes');
}

for(const [name,text] of [['app.css',appCss],['domain-management.css',domainCss]]){
  if(/\/\*[\s\S]{0,180}?\bV\d+(?:\.\d+)?\b[\s\S]{0,180}?\*\//.test(text)){
    throw new Error(name+' voltou a acumular blocos de release/versionamento.');
  }
}

if(/<style\b/i.test(html)){
  throw new Error('CSS inline em <style> não é permitido no shell principal.');
}

const externalScripts=[...html.matchAll(/<script[^>]+src="(https?:[^"]+)"/gi)].map(m=>m[1]);
if(externalScripts.length){
  throw new Error('SDK externo carregado diretamente no frontend: '+externalScripts.join(', '));
}

console.log('Architecture contracts OK');

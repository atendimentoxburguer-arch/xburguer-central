import fs from 'node:fs';import path from 'node:path';
const root=process.cwd(),jsDir=path.join(root,'assets/js'),js=fs.readdirSync(jsDir).filter(f=>f.endsWith('.js')).map(f=>path.join(jsDir,f)),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const required=['assets/css/app.css','assets/img/logo.png','assets/img/icon.svg','assets/img/icon-maskable.svg','manifest.webmanifest','service-worker.js',...js.map(f=>path.relative(root,f))];
for(const file of required){if(!fs.existsSync(path.join(root,file))){console.error('Arquivo obrigatório ausente:',file);process.exitCode=1}}
for(const file of js){const text=fs.readFileSync(file,'utf8');if(/(?<!\.)\b(prompt|confirm)\s*\(/.test(text)){console.error('Diálogo nativo encontrado:',path.relative(root,file));process.exitCode=1}}
for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){const ref=match[1];if(/^(https?:|#|mailto:|tel:)/.test(ref)||ref.startsWith('data:'))continue;const clean=ref.split('#')[0].split('?')[0];if(clean&&clean!=='.'&&!fs.existsSync(path.join(root,clean))){console.error('Referência local ausente:',ref);process.exitCode=1}}
if(!process.exitCode)console.log('Static checks OK');

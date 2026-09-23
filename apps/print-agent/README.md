# X Burguer Print Agent — V2

Aplicativo Windows da ETAPA 2 de impressão gerenciada do X Burguer Central.

## O que mudou

O agente agora é distribuído como aplicativo Windows instalável. O usuário final não precisa instalar Node.js nem executar PowerShell manualmente.

O aplicativo:
- instala por `.exe` usando NSIS;
- inicia com o Windows por padrão;
- roda em segundo plano com ícone na bandeja;
- possui janela própria de administração;
- mostra código/estado de pareamento;
- lista impressoras instaladas e indica offline/online;
- mostra fila, histórico, último job e erros;
- permite teste de impressão;
- permite reiniciar o agente;
- mantém fila local persistente;
- tenta novamente até 3 vezes;
- evita duplicidade de impressões automáticas;
- envia RAW/ESC-POS ao spooler do Windows;
- verifica se existe uma versão mais nova publicada no GitHub.

## Instalação

1. Baixe o arquivo `X-Burguer-Print-Agent-Setup-<versão>.exe` na página de Releases do projeto.
2. Execute o instalador.
3. O Windows pode exibir SmartScreen porque esta etapa ainda não possui certificado de assinatura de código. Confirme somente se o arquivo tiver sido baixado do repositório oficial.
4. Ao terminar, o **X Burguer Print Agent** será aberto.
5. Copie o código de 6 dígitos mostrado na janela.
6. No X Burguer Central, abra **Configurações → Impressoras → Gerenciar**.
7. Conecte o aplicativo com o código.
8. Em cada destino lógico, mapeie a impressora física do Windows.
9. Faça uma impressão de teste antes de ativar automações.

## Funcionamento em segundo plano

Fechar a janela não encerra o agente: ele continua ativo na bandeja do Windows. Para sair completamente, use **Sair** no menu da bandeja.

Por padrão o aplicativo inicia junto com o Windows. Essa opção pode ser desligada na própria janela do agente ou no menu da bandeja.

## Impressão silenciosa

A impressão silenciosa nesta etapa é focada em impressoras térmicas ESC/POS de 58 mm e 80 mm. O agente recebe jobs do X Burguer Central e os envia diretamente para a impressora física, sem abrir a janela de impressão do navegador.

A4 continua fora do modo silencioso.

## Segurança

- API local apenas em `127.0.0.1:17871`;
- pareamento por código local;
- token gerado no computador;
- token nunca vai para o GitHub;
- CORS restrito ao GitHub Pages oficial e origens locais;
- token removido de backups exportados;
- interface Electron usa `contextIsolation`, `sandbox` e sem `nodeIntegration`;
- links externos são limitados a destinos aprovados.

## Dados locais

Configuração, fila e logs ficam em:

`%APPDATA%\X Burguer Central\Print Agent`

Esses dados não são removidos automaticamente na desinstalação para preservar histórico/configuração.

## Desenvolvimento

A pasta ainda mantém os scripts da ETAPA 1 para desenvolvimento e diagnóstico, mas eles não são necessários para o usuário final.

Build do instalador:

`npm install`

`npm run dist`

O workflow `.github/workflows/print-agent-windows.yml` gera o instalador em um runner Windows e publica um artifact. Tags `print-agent-v*` também publicam o `.exe` em GitHub Releases.

## Limitações

- O instalador ainda não é assinado digitalmente.
- Não houve teste físico neste ambiente com todos os modelos de impressora.
- A compatibilidade depende de RAW/ESC-POS e do driver/firmware.
- A fila ainda é local ao computador; fila centralizada virá junto do backend.

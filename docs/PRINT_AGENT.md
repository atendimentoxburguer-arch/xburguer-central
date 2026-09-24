# Print Agent — ETAPA 2

## Visão geral

A ETAPA 2 transforma a ponte local da V19 em um **aplicativo Windows instalável e autônomo**.

O objetivo é permitir que a operação do restaurante use impressão silenciosa sem instalar Node.js, abrir PowerShell ou manter janelas técnicas abertas.

## Arquitetura

### Painel web
`assets/js/print-agent-client.js`
- detecta o aplicativo local;
- faz pareamento;
- envia jobs estruturados;
- mostra status do agente;
- mapeia destino lógico para impressora física;
- mantém outbox local quando o agente estiver temporariamente indisponível.

### Aplicativo Windows
`apps/print-agent/desktop/`
- Electron;
- janela de administração;
- bandeja do Windows;
- inicialização automática;
- diagnóstico;
- teste de impressão;
- fila/histórico;
- verificação de atualização.

### Serviço de impressão
`apps/print-agent/server.mjs`
- API local;
- pareamento;
- fila persistente;
- deduplicação;
- retry;
- logs;
- descoberta de impressoras;
- integração com spooler Windows.

### Renderização térmica
`apps/print-agent/lib/agent-core.mjs`
- validação do job;
- layout ESC/POS;
- 58 mm e 80 mm;
- alto contraste;
- corte de papel.

### Spooler
`apps/print-agent/scripts/raw-print.ps1`
- ponte RAW com `winspool.drv`.

## Experiência do usuário

Depois de instalar o `.exe`:
1. O Print Agent abre uma janela própria.
2. O usuário vê status, versão e código de pareamento.
3. O agente detecta as impressoras do Windows.
4. O usuário conecta o navegador pelo código.
5. Cada destino do X Burguer Central é mapeado para uma impressora física.
6. Pedidos passam a imprimir silenciosamente conforme as regras configuradas.
7. Fechar a janela deixa o agente ativo na bandeja.

## Janela do aplicativo

A interface do agente mostra:
- agente online/offline;
- tempo ativo;
- código e estado de pareamento;
- impressoras instaladas e offline;
- contadores da fila;
- último job;
- histórico recente;
- falhas;
- logs;
- teste de impressão;
- reinício do agente;
- pasta de dados;
- iniciar com Windows;
- verificação de atualização.

## Deduplicação

Impressões automáticas recebem uma chave determinística baseada em pedido, destino, evento e estação. O agente rejeita uma repetição equivalente já registrada recentemente.

Reimpressões manuais continuam permitidas.

## Build e distribuição

O projeto usa:
- Electron `44.3.0`;
- electron-builder `26.15.3`;
- NSIS para o instalador x64.

O workflow `Print Agent Windows` roda em `windows-latest` e:
1. instala dependências;
2. valida sintaxe;
3. gera o instalador;
4. envia o `.exe` como artifact por 30 dias;
5. em tags `print-agent-v*`, publica o instalador em GitHub Releases.

Nenhum segredo precisa ser salvo no repositório para verificar atualizações. O aplicativo consulta releases públicas do próprio projeto.

## SmartScreen e assinatura

Esta etapa ainda não usa certificado de assinatura de código. O Windows pode exibir um aviso SmartScreen no primeiro download/execução.

Antes de distribuição ampla, a próxima melhoria de segurança é assinar o instalador e o executável com certificado de code signing.

## Reconexão automática V39

Quando o navegador já possui um token de pareamento salvo, ações manuais de impressão e testes tentam reabrir o Print Bridge e reutilizar a autorização existente antes de enviar o job.

Comportamento:

- se o token salvo ainda for válido, o agente é reconectado sem pedir o código novamente;
- a fila local pendente é reenviada após a reconexão;
- se o token tiver expirado ou sido perdido, o sistema abre o fluxo de pareamento;
- ações automáticas continuam indo para a fila local quando não existe uma janela de bridge ativa, evitando pop-ups inesperados.

## Detecção de impressoras 2.3.0

A versão 2.3.0 amplia a descoberta para cinco caminhos:

1. Electron/Windows (`getPrintersAsync`);
2. `Get-Printer`;
3. `Win32_Printer` via CIM;
4. .NET `System.Drawing.Printing.PrinterSettings`;
5. Registro do Windows (HKCU/HKLM).

Se todos os mecanismos retornarem vazio, o painel permite **mapeamento manual pelo nome exato da impressora**. Esse modo é válido porque a impressão RAW abre a fila diretamente pelo nome via `OpenPrinter`, sem depender da enumeração prévia.

O Print Agent também mostra um diagnóstico dos métodos tentados quando nenhuma impressora é listada.

## Detecção de impressoras 2.2.0

A versão 2.2.0 deixa de depender exclusivamente do PowerShell `Get-Printer`.

A enumeração usa esta ordem:

1. lista nativa do Electron/Windows via `webContents.getPrintersAsync()`;
2. PowerShell `Get-Printer`;
3. WMI/CIM via `Get-CimInstance Win32_Printer`.

Isso cobre casos em que a impressora está instalada e funcional no Windows, mas uma das APIs retorna lista vazia.

## Print Bridge 2.1.0

A partir do Print Agent 2.1.0, o transporte principal não depende mais de `fetch()` cross-origin entre o GitHub Pages e `127.0.0.1`.

O painel carrega `http://127.0.0.1:17871/bridge` em um frame local oculto. Essa página pertence ao próprio agente e executa chamadas same-origin para `/health`, `/pair`, `/printers` e `/jobs`. O X Burguer Central e o bridge trocam apenas mensagens estruturadas por `postMessage`.

Benefícios:

- evita falhas de CORS/LNA no fluxo principal;
- mantém o agente preso ao loopback;
- restringe origins aceitos;
- restringe as rotas que a ponte pode executar;
- preserva o `fetch()` direto apenas como fallback para compatibilidade.

Por isso, instalações 2.0.0 devem ser atualizadas para 2.1.0.

## Conexão com navegadores atuais

O painel web usa `http://127.0.0.1:17871` para falar com o aplicativo instalado no mesmo computador.

Como `127.0.0.1` pertence ao espaço de endereços **loopback**, as requisições Fetch do painel declaram `targetAddressSpace: 'loopback'`. Declarar `local` para esse endereço faz o navegador rejeitar a conexão por incompatibilidade de espaço de endereço.

O Service Worker do PWA também ignora explicitamente `127.0.0.1:17871` e `localhost:17871`. Isso é obrigatório para que a chamada de saúde/pareamento saia diretamente da janela do navegador e preserve o contexto de permissão de rede local.

Navegadores Chromium atuais podem exigir uma permissão explícita de **Rede local / Loopback** quando um site HTTPS acessa um serviço local. O X Burguer Central verifica essa permissão e diferencia três situações:

1. **Permissão necessária** — o navegador ainda precisa autorizar o acesso local.
2. **Agente offline** — a permissão não é o problema; o serviço na porta 17871 não respondeu.
3. **Agente encontrado** — o serviço respondeu e falta apenas o código de pareamento.

### Diagnóstico rápido

1. Abra o X Burguer Print Agent e confirme que a janela mostra **Agente online**.
2. No navegador, abra diretamente `http://127.0.0.1:17871`.
3. Se a página local abrir, o serviço está funcionando.
4. Volte ao X Burguer Central e clique em **Conectar agente**.
5. Se o navegador pedir acesso à rede local, escolha **Permitir**.
6. Informe o código de 6 dígitos mostrado no aplicativo.
7. Depois do pareamento, mapeie a impressora física e faça um teste.

Se a página local não abrir, reinicie o Print Agent. Se o aplicativo informar que a porta 17871 já está em uso, feche versões antigas pela bandeja do Windows ou reinicie o computador.

Se a permissão tiver sido negada, abra as permissões do site no navegador, altere **Rede local / Loopback** para **Permitir** e recarregue o X Burguer Central.

## Segurança

- loopback-only;
- token local;
- backup sem token;
- CORS restrito;
- preload Electron limitado;
- `nodeIntegration: false`;
- `contextIsolation: true`;
- `sandbox: true`;
- navegação externa bloqueada na janela;
- atualização consulta apenas GitHub oficial do projeto.

## Limites atuais

- impressão silenciosa apenas térmica ESC/POS 58/80 mm;
- A4 ainda usa fluxo não silencioso;
- não houve teste físico com todos os modelos;
- sem assinatura digital;
- sem fila central multi-PC;
- backend central continua pendente.

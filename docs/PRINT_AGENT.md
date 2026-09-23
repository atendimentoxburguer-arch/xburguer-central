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

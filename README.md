# X Burguer Central

Central operacional da X Burguer publicada como aplicação web estática no GitHub Pages.

## Módulos

Pedidos, PDV, salão/comandas, cardápio, cozinha/KDS, entregas, desempenho, clientes, campanhas, atendimento, caixa, estoque, financeiro, equipe e configurações.

## Estrutura

- `index.html`: shell da aplicação e navegação.
- `assets/css/app.css`: design system e responsividade.
- `assets/js/core.js`: estado, persistência, backup e utilitários.
- `assets/js/ui.js`: navegação, modais acessíveis, diálogos e toasts.
- `assets/js/orders.js`: fluxo de pedidos.
- `assets/js/sales.js`: PDV, salão e cardápio.
- `assets/js/operations.js`: entregas, desempenho e KDS.
- `assets/js/crm.js`: clientes, promoções e atendimento.
- `assets/js/management.js`: caixa, estoque, financeiro, equipe e configurações.
- `assets/js/app.js`: inicialização, roteamento e melhorias progressivas.
- `assets/js/pwa.js`: instalação como app e service worker.
- `assets/js/print-agent-client.js`: comunicação com o agente local de impressão.
- `apps/print-agent/`: agente Windows de impressão silenciosa.
- `manifest.webmanifest` e `service-worker.js`: PWA/offline.

## Dados

A versão atual continua sendo um protótipo: os dados ficam no `localStorage` do navegador. Use **Configurações → Exportar backup** para salvar uma cópia. Limpar os dados do navegador pode apagar alterações locais.

## Atalhos

- `Ctrl/Cmd + K`: buscar módulo.
- `/`: focar a busca lateral.
- `Esc`: fechar modal/menu.

## Produção real

Antes de usar como sistema transacional real, implementar backend, autenticação, autorização, PostgreSQL, logs, backup no servidor e integrações oficiais. Consulte `docs/ARQUITETURA.md`, `docs/AUDITORIA.md`, `docs/ROADMAP.md` e `SECURITY.md`.

## Visual V12

A interface foi refinada com uma hierarquia tipográfica mais forte (Manrope + Inter), espaçamento consistente, cartões e tabelas mais bem enquadrados, ícones mais elegantes, estados semânticos mais suaves e responsividade revisada. O objetivo é manter alta legibilidade e velocidade operacional sem excesso de elementos decorativos.

## Revisão V13

Foi realizada uma auditoria completa de consistência visual: alinhamento de toolbars, grids, cartões, tabelas, formulários, pedidos, PDV, mesas, cardápio, delivery, KDS, marketing, configurações e breakpoints. Estilos de layout que estavam inline foram convertidos para classes reutilizáveis. O service worker passou a buscar CSS/JS pela rede antes do cache para reduzir o risco de uma atualização visual antiga continuar aparecendo após novos deploys.

## Gestão V14

A área de salão ganhou gestão por áreas/seções, capacidade, pessoas sentadas, responsável, ordenação, criação em lote, transferência e administração completa das mesas. O gestor de cardápio ganhou indicadores, filtros, ordenação, edição em massa, disponibilidade/86, estoque mínimo, custo, descrição e estação de preparo.

## Engenharia V15

A V15 consolidou migração de dados no núcleo, separou os módulos de salão e cardápio, adicionou validação de backup/importação, endureceu regras de estoque e delivery e incluiu testes automatizados de estado e regras críticas. Consulte `docs/AUDITORIA_V15.md`.

## Revisão V16

A V16 passou por revisão ponta a ponta de engenharia e QA: fluxo de pedidos e PDV, taxas históricas, caixa físico, estoque auditável, delivery, KDS por estação, clientes, equipe, acessibilidade, tratamento de falhas e testes automatizados. Consulte `docs/AUDITORIA_V16.md`.

## Impressão V17

O sistema agora possui impressão de comprovantes, cozinha e delivery com layouts 58 mm, 80 mm e A4, configuração de destinos e impressão de teste. Consulte `docs/IMPRESSAO.md`.

## Impressão V18

A impressão passou a usar layout vertical compacto, texto de alto contraste e roteamento automático configurável por destino, etapa do pedido e estação de preparo. É possível criar destinos como Caixa, Chapa, Fritadeira, Bebidas, Bar e Expedição. Consulte `docs/IMPRESSAO.md`.

## Impressão gerenciada V19

A ETAPA 1 adiciona um agente local Windows para impressão silenciosa em térmicas ESC/POS, com pareamento, descoberta de impressoras, mapeamento por destino, fila persistente, retry e logs. O navegador mantém uma outbox quando o agente está temporariamente indisponível. Consulte `docs/PRINT_AGENT.md`.

## Print Agent V20

A ETAPA 2 transforma o agente de impressão em aplicativo Windows instalável, com runtime embutido, bandeja, inicialização automática, janela própria de gerenciamento, fila/histórico, teste, diagnóstico, reinício e build `.exe` automatizada pelo GitHub Actions. O usuário final não precisa instalar Node.js. Consulte `docs/PRINT_AGENT.md`.

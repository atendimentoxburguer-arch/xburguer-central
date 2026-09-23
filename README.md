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

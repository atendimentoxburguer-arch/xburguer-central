# X Burguer Central

Central operacional da X Burguer para pedidos, PDV, salão, cardápio, cozinha/KDS, entregas, clientes, marketing, caixa, estoque, financeiro, equipe e configurações.

## Estrutura

- `index.html`: shell da aplicação e navegação.
- `assets/css/app.css`: design system e responsividade.
- `assets/js/core.js`: estado, persistência e utilitários.
- `assets/js/ui.js`: navegação, modal, toast e helpers de interface.
- `assets/js/orders.js`: fluxo de pedidos.
- `assets/js/sales.js`: PDV, salão e cardápio.
- `assets/js/operations.js`: entregas, desempenho e KDS.
- `assets/js/crm.js`: clientes, promoções e atendimento.
- `assets/js/management.js`: caixa, estoque, financeiro, equipe e configurações.
- `assets/js/app.js`: bootstrap da aplicação.

## Execução local

Abra `index.html` no navegador. O protótipo usa `localStorage` e não exige backend.

## Estado atual

Esta é uma base de protótipo operacional. Dados sensíveis, autenticação, pagamentos, WhatsApp, fiscal e persistência real devem ser implementados em backend antes de uso em produção.

Consulte `docs/ARQUITETURA.md` e `docs/ROADMAP.md`.

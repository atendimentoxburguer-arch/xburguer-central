# Arquitetura

## Objetivo

Manter o protótipo simples para validação visual e operacional, mas com responsabilidades separadas o suficiente para evoluir para uma aplicação full stack.

## Camadas atuais

### Apresentação
`index.html` contém apenas o shell principal, regiões de navegação e pontos de montagem das telas.

### Design system
`assets/css/app.css` concentra tokens de cor, tipografia, layout, componentes e regras responsivas.

### Núcleo
`core.js` gerencia estado, persistência local, cálculos e funções compartilhadas.

### Interface
`ui.js` centraliza navegação, modal, feedbacks e interações globais.

### Domínios
- `orders.js`: pedidos e mudanças de status.
- `sales.js`: PDV, mesas/comandas e cardápio.
- `operations.js`: entregas, KDS e desempenho.
- `crm.js`: clientes, campanhas e atendimento.
- `management.js`: caixa, estoque, financeiro, equipe e configurações.

### Inicialização
`app.js` registra eventos globais e inicializa tema, estado e tela atual.

## Persistência

O protótipo usa `localStorage`. Isso é adequado apenas para demonstração local. Produção deve usar API autenticada e banco de dados.

## Próxima arquitetura recomendada

Quando os fluxos estiverem aprovados:
1. TypeScript no front-end.
2. Componentização por domínio.
3. API com autenticação e autorização por perfil.
4. Banco PostgreSQL.
5. Camada de serviços para WhatsApp, pagamentos, fiscal e impressão.
6. Logs, auditoria, backup e monitoramento.
7. Testes automatizados de regras críticas.

## Regras

- Não armazenar chaves, tokens ou senhas no repositório.
- Não misturar regra de negócio com código puramente visual quando houver refatoração.
- Mudanças grandes devem entrar por branch e pull request.
- `main` deve representar a versão estável.

## Módulos V15

- `assets/js/salon-management.js`: áreas, mesas, comandas e organização do salão.
- `assets/js/menu-management.js`: categorias, produtos, disponibilidade e ações em massa.
- `assets/css/domain-management.css`: estilos específicos das áreas de gestão.
- `scripts/state-contracts.mjs`: contratos de esquema e migração.
- `scripts/business-contracts.mjs`: regras críticas de pedido e estoque.

O estado persistido usa esquema local versão 4. Migrações e normalização pertencem exclusivamente ao núcleo, evitando overrides de persistência em módulos de interface.

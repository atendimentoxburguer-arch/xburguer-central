# Arquitetura — X Burguer Central

## Princípio

O sistema deve evoluir por substituição controlada, não por acúmulo. Uma camada nova só entra quando substitui ou encapsula claramente a responsabilidade anterior.

## Arquitetura atual

```text
Browser / PWA
├── UI e módulos por domínio
├── Núcleo de estado e persistência local
├── Serviço de impressão
│   └── Agente Windows local
└── GitHub Pages
```

### Apresentação

`index.html` contém o shell. A interface é renderizada pelos módulos JavaScript por domínio. O sistema visual é mantido em CSS consolidado, com estilos específicos de gestão separados.

### Núcleo

`assets/js/core.js` é o único proprietário de:

- estado global;
- normalização e migração de schema;
- persistência local;
- snapshots e backup;
- cálculos compartilhados;
- utilitários de domínio reutilizados.

Nenhum módulo de feature deve gravar diretamente no `localStorage`.

### Domínios

- Pedidos: `orders.js`
- Vendas/checkout: `sales.js`
- Operações/KDS/delivery: `operations.js`
- CRM: `crm.js`
- Gestão: `management.js`
- Relatórios: `reports.js`
- Salão: `salon-management.js`
- Cardápio: `menu-management.js`
- Impressão: `printing.js`

### Integrações locais

`print-agent-client.js` é o adaptador autorizado a usar HTTP no frontend atual. Ele conversa somente com o agente local de impressão em loopback.

## Arquitetura alvo de produção

```text
Web/PWA
  │
  ├── HTTPS / REST
  └── WebSocket
        │
      Backend
        │
  ┌─────┼─────────┬──────────┬────────────┐
  │     │         │          │            │
Postgres Redis  Pagamentos  Fiscal     WhatsApp
  │     │
  │    Filas
  │     └─────────────── Impressão central
  │                         │
  └──────────────────── Agente Windows
```

### Backend recomendado

- Node.js + TypeScript.
- NestJS/Fastify quando a migração full stack começar.
- PostgreSQL como fonte de verdade.
- Redis/BullMQ somente quando houver necessidade de fila central, jobs e WebSocket em escala.
- Armazenamento de objetos para fotos e documentos fiscais.

### Modelo de integração

Nenhum provedor externo deve vazar para os módulos de negócio.

Exemplo conceitual:

```text
PaymentService
├── MercadoPagoAdapter
├── AsaasAdapter
└── outro provedor

FiscalService
├── NuvemFiscalAdapter
└── FocusNFeAdapter
```

A escolha concreta de provedor é configuração de infraestrutura, não regra de tela.

## Estratégia de migração

### Etapa A — fundação limpa

- consolidar CSS e remover overrides redundantes;
- centralizar persistência;
- definir contratos automáticos de arquitetura;
- manter a aplicação atual estável.

### Etapa B — backend

- autenticação;
- usuários, perfis e permissões;
- PostgreSQL;
- API de produtos, clientes, pedidos, mesas, caixa e estoque;
- auditoria de alterações;
- backup de servidor.

### Etapa C — frontend conectado

Criar uma única camada de dados. Durante a migração, cada domínio troca a fonte local pela API. Não criar uma segunda interface paralela.

### Etapa D — integrações

Somente após o backend ser fonte de verdade:

- Pix/cartão;
- NFC-e;
- WhatsApp;
- fila de impressão central.

## Regras obrigatórias

- Sem segredos no frontend ou repositório.
- Sem SDK financeiro/fiscal carregado diretamente no `index.html`.
- Sem `fetch()` espalhado pelos módulos.
- Sem `localStorage` fora do núcleo enquanto ele existir.
- Sem bloco de CSS por número de release.
- Sem alteração direta de venda concluída sem trilha de auditoria.
- Dinheiro e pagamentos são armazenados em centavos no backend futuro.
- Webhooks de pagamento/fiscal precisam ser idempotentes.
- `main` deve estar sempre publicável e passar pelo Quality.

## Testes de arquitetura

`scripts/architecture-contracts.mjs` impede regressões estruturais, incluindo persistência fora do núcleo, HTTP indevido no frontend, SDK externo no shell e crescimento excessivo do CSS.

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

## Contratos financeiros V16

Pedidos passam a preservar snapshots de preço, custo, taxa de entrega e percentual de serviço. Isso evita que mudanças futuras nas configurações ou custos alterem retrospectivamente vendas já registradas. O estoque mantém uma trilha local de movimentações em `inventoryMovements`, limitada para proteger o armazenamento do navegador.

## Módulo de impressão V18

- `assets/js/printing.js`: geração dos documentos, perfis lógicos e abertura do diálogo de impressão.
- `assets/css/print.css`: layouts térmicos 58/80 mm e A4.
- `scripts/printing-contracts.mjs`: contratos do payload de impressão e normalização de perfis.

A camada de impressão possui roteamento automático por perfil. Cada perfil define finalidade, papel, cópias, estação e eventos do ciclo do pedido. A seleção da impressora física pertence ao navegador/sistema operacional. Impressão silenciosa e seleção direta do dispositivo exigirão uma ponte local/desktop no futuro.

## Print Agent V19

A impressão silenciosa usa uma arquitetura de ponte local. O front-end envia jobs estruturados para `http://127.0.0.1:17871`; o agente valida, persiste em fila e envia RAW/ESC-POS ao spooler do Windows. O agente só aceita loopback, usa pareamento/token local e não contém segredos no repositório. A fila centralizada em backend continua como etapa futura.

## Aplicativo de impressão V20

A camada local agora é empacotada em Electron/NSIS. A janela Electron não possui acesso Node direto no renderer: usa preload restrito, `contextIsolation`, sandbox e IPC. O serviço HTTP continua em loopback para compatibilidade com o painel web. A fila local possui deduplicação de eventos automáticos, retry e histórico. O workflow Windows gera o instalador `.exe`; tags de versão podem publicar o artifact em Releases.

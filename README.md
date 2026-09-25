# X Burguer Central

Sistema operacional da X Burguer para pedidos, PDV, salão/mesas, cardápio, cozinha/KDS, delivery, clientes, caixa, estoque, financeiro, equipe, relatórios e impressão.

## Estado atual

A migração conectada está em desenvolvimento em `apps/platform/`: PostgreSQL, login, cardápio público, equipe no celular, cupons, cashback e adaptador oficial de mensagens. Ela só é ativada quando hospedada junto ao servidor. Consulte [o estado real da migração](docs/MIGRACAO_PLATAFORMA.md) e [a instalação do servidor](apps/platform/README.md). Pagamentos online, fiscal, IA e demais integrações ainda não estão concluídos.

A aplicação web continua funcionando como protótipo operacional instalável (PWA), publicada pelo GitHub Pages. Os dados de negócio ainda são persistidos localmente no navegador e, por isso, esta versão não deve ser tratada como backend transacional de produção.

A impressão silenciosa já possui um agente Windows separado, com fila, retry, mapeamento de impressoras e suporte ao fluxo térmico.

## Estrutura

- `index.html`: shell e regiões principais da aplicação.
- `assets/css/app.css`: estilos globais e sistema visual consolidado.
- `assets/css/domain-management.css`: estilos específicos de salão e cardápio.
- `assets/css/print.css`: documentos de impressão.
- `assets/js/core.js`: estado, persistência, migração, cálculos e utilitários.
- `assets/js/ui.js`: troca de telas, modais, diálogos e feedback.
- `assets/js/navigation.js`: catálogo de funções, busca global e página inicial.
- `assets/vendor/`: Inter e Bootstrap Icons locais, com as licenças.
- `assets/js/integrations.js`: adaptadores externos permitidos no frontend atual.
- `assets/js/orders.js`: pedidos.
- `assets/js/sales.js`: PDV e checkout.
- `assets/js/operations.js`: delivery, desempenho e KDS.
- `assets/js/crm.js`: clientes, campanhas e atendimento.
- `assets/js/management.js`: caixa, estoque, financeiro, equipe e configurações.
- `assets/js/reports.js`: relatórios.
- `assets/js/salon-management.js`: salão, mesas, comandas e garçons.
- `assets/js/menu-management.js`: categorias, produtos, fotos e estoque do cardápio.
- `assets/js/printing.js`: documentos e roteamento de impressão.
- `assets/js/print-agent-client.js`: único adaptador web autorizado a falar com o agente local.
- `apps/print-agent/`: aplicativo Windows de impressão silenciosa.
- `scripts/`: contratos automatizados de estado, negócio, arquitetura, visual e impressão.

## Regras de engenharia

1. Persistência local pertence somente ao núcleo (`core.js`).
2. Módulos de tela não acessam `localStorage` diretamente.
3. URLs e provedores externos ficam em adaptadores explícitos; módulos de tela não conhecem fornecedor.
4. Pagamento, fiscal, WhatsApp e demais provedores futuros devem ser integrados no backend por adaptadores próprios.
5. CSS não deve crescer por blocos de versão sobrepostos. O CI aplica orçamento de tamanho e contratos de estabilidade.
6. Mudanças grandes entram por branch + pull request; `main` deve permanecer estável.
7. Segredos, certificados e tokens nunca entram no repositório.

## Dados e backup

Enquanto o backend não estiver concluído, os dados ficam no `localStorage`. Use **Configurações → Exportar backup** para manter uma cópia. Limpar os dados do navegador pode apagar alterações locais.

## Qualidade

O workflow `Quality` valida:

- sintaxe JavaScript;
- estrutura estática do projeto;
- limites e contratos de arquitetura;
- estabilidade visual;
- migração e estado;
- regras de pedidos, caixa e estoque;
- salão e checkout;
- impressão;
- agente local de impressão.

## Próxima evolução

A migração para produção deve ocorrer sem manter dois sistemas concorrentes. A ordem definida é:

1. criar backend autenticado e PostgreSQL;
2. introduzir uma camada de acesso a dados no frontend;
3. migrar pedidos, produtos, clientes, mesas, caixa e estoque por domínio;
4. retirar o `localStorage` como fonte principal;
5. integrar pagamentos, NFC-e e WhatsApp no backend;
6. centralizar a fila de impressão e observabilidade;
7. somente então considerar migração do shell para React/Next.js, se trouxer ganho real sem duplicar a aplicação.

Consulte `docs/ARQUITETURA.md`, `docs/ROADMAP.md`, `docs/DESIGN_SYSTEM.md` e `SECURITY.md`.

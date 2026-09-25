# Roadmap

> A evolução conectada agora tem código e testes em `apps/platform/`. O andamento detalhado, as limitações e as dependências externas estão em [MIGRACAO_PLATAFORMA.md](MIGRACAO_PLATAFORMA.md). Os itens abaixo descrevem a arquitetura final; implementar a ponte de migração não conclui automaticamente a operação de produção.

## Base atual — concluída

- [x] Shell web/PWA estável.
- [x] Módulos separados por domínio.
- [x] Estado, migração e persistência centralizados no núcleo.
- [x] Pedidos, PDV, salão, cardápio, KDS, delivery, CRM, caixa, estoque, financeiro e relatórios.
- [x] Checkout com conta inteira, divisão, produto, fração de produto, pagamento misto e estorno.
- [x] Impressão térmica e agente Windows com fila, retry e mapeamento físico.
- [x] Sistema visual responsivo e contratos de estabilidade.
- [x] Fundação V28: CSS consolidado, antiacúmulo, persistência isolada e adaptadores explícitos de integração.

## Próxima etapa — backend de produção

- [ ] Criar API TypeScript autenticada.
- [ ] PostgreSQL como fonte de verdade.
- [ ] Usuários, perfis e permissões.
- [ ] Auditoria de alterações.
- [ ] API de produtos e categorias.
- [ ] API de clientes.
- [ ] API de pedidos e itens.
- [ ] API de mesas/comandas/garçons.
- [ ] API de caixa e pagamentos.
- [ ] API de estoque e movimentações.
- [ ] Backup e restauração no servidor.

## Migração de dados do frontend

A migração será feita domínio a domínio, sem criar uma segunda interface paralela.

- [ ] Criar camada única de acesso a dados.
- [ ] Migrar produtos/cardápio.
- [ ] Migrar clientes.
- [ ] Migrar pedidos.
- [ ] Migrar salão/mesas.
- [ ] Migrar caixa/pagamentos.
- [ ] Migrar estoque.
- [ ] Remover `localStorage` como fonte principal após a última migração.

## Integrações

Entram somente depois que o backend for fonte de verdade.

- [ ] Pix automatizado.
- [ ] Cartão/TEF ou SmartPOS homologado.
- [ ] NFC-e por provedor fiscal.
- [ ] WhatsApp Business oficial.
- [ ] Fila de impressão central sincronizada com o agente local.
- [ ] QR de mesa conectado ao backend.
- [ ] Webhooks idempotentes para pagamento e fiscal.

## Produção

- [ ] Ambiente de homologação.
- [ ] CI/CD com deploy controlado.
- [ ] Monitoramento e alertas.
- [ ] Logs estruturados.
- [ ] Backups automáticos.
- [ ] Política de retenção e restauração.
- [ ] Gestão de segredos.
- [ ] Assinatura digital do instalador do agente Windows.

## Regra de evolução

Não adicionar uma nova biblioteca, framework ou provedor só para “modernizar”. Cada tecnologia nova deve substituir uma responsabilidade existente ou resolver uma necessidade de produção concreta, com teste e plano de migração.

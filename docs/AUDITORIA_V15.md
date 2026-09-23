# Auditoria de Engenharia V15

## Escopo

Revisão do X Burguer Central como aplicação web estática publicada no GitHub Pages, cobrindo arquitetura, estado local, segurança do front-end, regras críticas de negócio, PWA, modularização, testes e manutenibilidade.

## Correções aplicadas

### Estado e migração
- Versão da aplicação alinhada para 15.0.0.
- Esquema local elevado para versão 4.
- Migração de áreas do salão, metadados de mesas e metadados de produtos centralizada em `core.js`.
- Removido o monkey patch de `normalize()` que existia na camada de gestão.
- Recuperação de estado local inconsistente com snapshot antes do reset.

### Backup e integridade
- Limite de 5 MB para importação.
- Rejeição de backup criado por esquema mais novo.
- Validação de IDs, IDs duplicados, nomes duplicados de mesas e categorias órfãs.
- Snapshot automático antes de importação e restauração da demonstração.

### Segurança do front-end
- Corrigidas interpolações sem escape em ícones de produtos e cabeçalhos do KDS.
- IDs importados passam por validação antes de entrarem no estado.
- Verificações estáticas impedem regressões conhecidas.

### Regras de negócio
- Delivery pronto não pode ser finalizado sem entregador.
- Cancelamento restaura estoque e disponibilidade corretamente.
- Disponibilidade manual de produto foi separada do esgotamento por estoque através de `manualSold`.
- Fechamento de mesa bloqueia enquanto houver pedido em análise ou produção e exige confirmação.

### Arquitetura
- Gestão de salão e gestão de cardápio foram separadas em módulos próprios.
- Funções públicas das novas camadas são expostas explicitamente em `globalThis`.
- Módulos de domínio executam em modo estrito.
- CSS de gestão deixou de ter nome acoplado a uma versão específica.

### PWA
- Cache atualizado para V15.
- Verificação de atualização do service worker ocorre ao carregar e ao voltar para a aba.
- CSS e JavaScript locais continuam usando estratégia network-first.

### Qualidade
- Check estático ampliado para arquivos, ordem de módulos, APP_SHELL, IDs HTML duplicados, diálogos nativos, javascript: e padrões de interpolação inseguros.
- Testes de contrato de estado/migração.
- Testes de regras críticas de pedido, entrega e estoque.

## Riscos que continuam por decisão arquitetural

A aplicação ainda é um protótipo local-first baseado em GitHub Pages e `localStorage`. Portanto ainda não oferece, de forma adequada para produção:

1. autenticação real;
2. autorização validada no servidor;
3. sincronização simultânea entre computadores;
4. banco de dados transacional;
5. auditoria imutável de ações;
6. recuperação centralizada de desastre;
7. segredos e integrações protegidos no servidor;
8. garantias transacionais para caixa, estoque e pedidos;
9. testes end-to-end em navegador no CI.

A CSP ainda precisa de `unsafe-inline` porque a interface histórica usa handlers HTML inline. Remover isso exige uma migração planejada para event delegation/componentes, sem benefício suficiente para justificar uma reescrita arriscada nesta etapa.

## Próxima arquitetura recomendada

Antes de uso transacional real:
- front-end tipado (TypeScript) mantendo o design aprovado;
- API autenticada;
- PostgreSQL;
- RBAC por função;
- eventos/auditoria para pedidos e caixa;
- WebSocket/SSE para sincronização;
- testes unitários, integração e E2E;
- ambiente de homologação separado da produção.

## Critério de estabilidade atual

A versão está adequada para prototipação, demonstração e validação operacional em um único navegador. Não deve ser considerada fonte oficial de pedidos, estoque ou caixa entre múltiplos dispositivos até a implantação do backend.

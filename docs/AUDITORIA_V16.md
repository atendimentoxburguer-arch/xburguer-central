# Auditoria Geral V16 — Engenharia + QA

## Objetivo

Revisão ponta a ponta do X Burguer Central como aplicação operacional local-first. A auditoria cobriu regras de negócio, persistência, segurança do front-end, fluxo de pedidos, PDV, salão, entregas, KDS, clientes, caixa, estoque, financeiro, equipe, PWA, acessibilidade, responsividade e testes automatizados.

## Correções de alta prioridade

### Pedidos e PDV
- Busca de pedidos deixou de re-renderizar toda a tela a cada tecla, preservando foco e cursor.
- Filtros atualizam contadores visíveis sem recriar a página.
- Delivery pronto sem entregador encaminha para a gestão de entregas.
- PDV preserva cliente e forma de pagamento ao alterar quantidades.
- Quantidade em edição respeita estoque atual + quantidade originalmente reservada.
- Pedido de mesa iniciado pelo salão usa a mesa já selecionada sem pedir novamente.
- Taxa de entrega e taxa de serviço são exibidas antes da finalização.
- Taxas e custos do produto são gravados como snapshot no pedido para não alterar o histórico quando configurações/custos mudarem.

### Salão
- Ações usam IDs internos, evitando inserir nomes editáveis de mesas em JavaScript inline.
- Novo pedido de mesa começa com rascunho limpo no PDV.
- Mantidas áreas, capacidade, ocupação, responsáveis, transferência, comandas e organização.

### Delivery
- Fluxo separado em Em preparo, Aguardando entregador e Em rota.
- Entregador só pode ser atribuído se estiver ativo.
- Entregador com entrega ativa não pode ser desativado.
- Cadastro rejeita duplicidade de nome/telefone.

### KDS
- Filtro por estação de preparo.
- Fila ordenada por antiguidade.
- Visualização por setor mostra somente os itens do setor.
- Conclusão total do pedido permanece disponível na visão geral para evitar marcar parcialmente um pedido como pronto.

### Caixa
- Corrigida a diferença entre faturamento e dinheiro físico.
- Saldo da gaveta = fundo inicial + vendas em dinheiro + suprimentos - sangrias.
- PIX e cartão não entram no saldo físico.
- Sangria não pode exceder o dinheiro estimado em caixa.
- Fechamento armazena resumo por meios de pagamento e congela a janela temporal da sessão.

### Estoque
- Criada trilha local de movimentações de estoque.
- Venda, edição de pedido, cancelamento, cadastro de produto e ajuste manual alimentam o histórico.
- Ajuste manual exige um motivo.
- Disponibilidade manual foi separada do esgotamento automático por estoque zero.
- Histórico é limitado para evitar crescimento indefinido do localStorage.

### Financeiro
- Removida margem bruta fixa.
- Margem estimada agora deriva de vendas finalizadas e custos registrados.
- Custos são congelados no item do pedido para preservar histórico após mudanças futuras de custo.

### Clientes
- Pedidos podem manter referência estável por customerId.
- Alterar nome de cliente não quebra histórico de compras.
- Cadastro e edição bloqueiam duplicidade de nome/telefone.

### Equipe
- Cadastro bloqueia nomes duplicados.
- Colaborador pode ser editado/ativado/desativado.
- Último administrador ativo não pode ser desativado.
- Permissões continuam informativas até existir autenticação/RBAC no backend.

## Confiabilidade e dados

- APP_VERSION: 16.0.0.
- SCHEMA_VERSION: 5.
- Migrações criam snapshot antes de alterar o estado e passam a persistir o resultado normalizado.
- Snapshots antigos são limitados.
- Importação continua validando tamanho, IDs, referências, tipos e estrutura.
- Novas referências cliente/pedido e movimento/produto são verificadas.
- Erro isolado de renderização de uma página não derruba todo o sistema; a tela oferece tentativa de recuperação.
- Rejeições assíncronas não tratadas entram no monitor global de erros.

## UI/UX e acessibilidade

- Resumo de subtotal/taxas/total no PDV e detalhes do pedido.
- Central de alertas operacional no sino do topo.
- Melhor foco visível, estados disabled, contraste aumentado e reduced-motion.
- Modal recebe aria-labelledby/aria-describedby automaticamente.
- Sidebar e switch da loja atualizam estado ARIA; switch aceita teclado.
- Ajustes adicionais para caixa, estoque, delivery e KDS em telas menores.
- Título do navegador acompanha a área atual.

## QA automatizado

O pipeline valida:
- sintaxe de todos os JavaScripts;
- existência e ordem dos assets;
- APP_SHELL do PWA;
- IDs HTML duplicados;
- diálogos nativos proibidos;
- padrões conhecidos de interpolação insegura;
- acesso indevido a estado privado de módulos;
- contratos de migração/esquema;
- delivery sem entregador;
- restauração de estoque por cancelamento;
- trilha de estoque;
- separação entre vendas totais e dinheiro físico;
- taxas de delivery e serviço.

## Limitações arquiteturais remanescentes

Esta versão é robusta para demonstração e operação local em um único navegador, mas ainda não deve ser tratada como sistema transacional multiusuário oficial.

Para produção são necessários:
- backend;
- PostgreSQL;
- login;
- autorização real por perfil;
- sincronização entre dispositivos;
- transações de banco para pedido/estoque/caixa;
- auditoria server-side;
- backup central;
- homologação;
- testes E2E em navegador;
- integrações oficiais de WhatsApp, pagamentos e fiscal.

A CSP ainda contém unsafe-inline devido aos handlers históricos inline. A remoção completa deve ocorrer junto de uma futura migração para eventos delegados/componentes, evitando uma reescrita de alto risco apenas por estética técnica.

# Auditoria inicial de pedidos e delivery

## Estrutura encontrada

| Responsabilidade | Arquivos |
| --- | --- |
| Navegação e telas | `index.html`, `assets/js/app.js`, `assets/js/navigation.js`, `assets/js/ui.js` |
| Dados, migração e cálculos | `assets/js/core.js` |
| Pedidos e checkout | `assets/js/orders.js`, `assets/js/sales.js` |
| Delivery e cozinha | `assets/js/operations.js` |
| Gestão do cardápio | `assets/js/menu-management.js`, `assets/css/domain-management.css` |
| Impressão | `assets/js/printing.js`, `assets/js/print-agent-client.js`, `assets/css/print.css`, `apps/print-agent/` |

A aplicação é estática. A navegação usa páginas internas e hash; não há API de pedidos, banco remoto nem WebSocket de pedidos. O estado de negócio fica no navegador. O servidor em `apps/print-agent/` atende exclusivamente à impressão local.

## Correções desta etapa

- Subtotais arredondados por linha, taxas e ajustes convertidos em centavos antes de compor o total. Exemplo: item de R$ 10,05 com serviço de 10% resulta em taxa de R$ 1,01 e total de R$ 11,06.
- PDV reutiliza os cálculos do núcleo, preservando taxas históricas ao editar pedidos e taxa de entrega explicitamente zero.
- Bloqueio de chamadas concorrentes à finalização enquanto o formulário assíncrono está aberto, evitando duplicação por duplo clique na mesma aba.
- Consulta periódica do agente aguarda o ciclo anterior terminar. Inicialização repetida não cria novos ciclos, e a fila reutiliza a consulta de saúde já concluída.
- Cache PWA atualizado; novo teste do ciclo de impressão incluído no Quality.
- Teste visual aceita as quebras de linha CRLF do checkout Windows.

Os cálculos continuam aceitando e retornando reais para compatibilidade com o estado atual; a composição monetária usa centavos. Valores antigos com mais de duas casas decimais podem apresentar diferença de arredondamento. Esta etapa não migra o armazenamento nem altera os registros de pagamentos já efetuados.

## Próximas etapas do escopo

1. Backend autenticado e PostgreSQL, conforme `ARQUITETURA.md`, antes de sincronizar pedidos entre aparelhos. O bloqueio de duplo clique não resolve concorrência entre abas ou dispositivos.
2. Definir e implementar regras de cumulatividade dos cupons, elegibilidade, limites e ordem dos descontos. Atualmente existe ajuste manual de desconto; não há motor de cupons.
3. Implementar tabela de bairros ou cálculo por distância, com origem, cobertura e política de arredondamento explícitas. Atualmente há taxa fixa, preservada no pedido.
4. Construir o cardápio público de compra conectado ao backend. A tela atual é de gestão; não é um checkout público de clientes.
5. Integrar alertas sonoros e visuais à chegada de pedidos, com ativação de áudio pelo operador e deduplicação por evento.

O painel de pedidos e a impressão térmica 58/80 mm já existem. Seus contratos automatizados foram mantidos. Impressão física e operação entre dispositivos exigem homologação com a infraestrutura correspondente.

## Validação

- Sintaxe JavaScript e verificações estáticas, arquitetura, visual, estado, relatórios, negócio, salão/checkout, impressão e serviço do agente.
- Regressões de arredondamento, entrega gratuita, desconto acima do total, duplo clique e consultas concorrentes do ciclo de impressão.
- Navegador Edge: 204 combinações de módulo, largura e tema, além de busca, rascunho do PDV, checkout, modal e navegação mobile.

# Revisão complementar V22 — 23/09/2026

Continuação da branch `feat/v22-salon-checkout-reports`, iniciada no commit `87b0361`. O conteúdo desse commit já havia sido integrado à main pelo PR #14. Esta revisão preserva a implementação V22 e corrige falhas encontradas em código e no navegador.

## Correções

- PDV atualiza total da conta e valor por pessoa ao trocar o atendimento e preserva taxas históricas durante edição.
- O botão de fechamento no PDV salva as alterações antes de abrir a conferência. Pedidos encerrados não podem ser salvos novamente.
- Pedidos de loja no quadro e o atalho legado do salão passam pela conferência do checkout.
- Recebimento exige pedido pronto e forma de pagamento; cancelados/concluídos não são recebidos novamente nem editados pelo checkout.
- Liberação de mesa limpa pessoas/responsável e remove o estado de fechamento quando não há pedidos abertos.
- Descontos respeitam o valor bruto; rateio consolidado conserva centavos, inclusive com bases zeradas.
- Fechar um diálogo não apaga o conteúdo de outro aberto no mesmo frame.
- Relatório de caixas aplica o período aos fechamentos; datas futuras e inválidas são excluídas.
- Linhas zeradas do PDV ficam ocultas; miniaturas mantêm tamanho fixo; checkout tem largura adequada em desktop.
- Cache do service worker atualizado para `v22-2`.

## Validação local

Passaram a verificação de sintaxe dos arquivos cobertos pelo workflow Quality, `git diff --check` e todas as sete suítes em `scripts/*.mjs`. Os contratos de salão/checkout incluem regressões para as correções acima, incluindo a transição de modais.

Inspeção visual em navegador Chromium da cópia local: quadro de pedidos, PDV, checkout, mesas, QR, comandas, garçons, configurações do salão e os sete relatórios. Verificações responsivas com viewport configurado para desktop (1440×1000) e celular (390×844); tabelas largas mantêm rolagem interna. As 16 imagens QR carregaram. Nenhum erro de console foi observado ao final do fluxo.

Fluxo executado com dados de demonstração: item de R$ 28,90 passou a totalizar R$ 31,79 ao selecionar Mesa; desconto de R$ 5,00 na conta de R$ 89,98 retornou corretamente à conferência; recebimento sem pagamento foi bloqueado; recebimento de R$ 84,98 em dinheiro concluiu o pedido e elevou o saldo de R$ 100,00 para R$ 184,98, liberando a mesa.

## Limites da revisão

As imagens originais de referência não estavam disponíveis nesta tarefa: a inspeção verifica a interface implementada, sem certificar fidelidade pixel a pixel às referências. Permanecem os limites já informados pela V22: dados em localStorage, QR de identificação (sem pedido remoto), comandas vinculadas às mesas e relatório de cupons sem histórico de uso. Não foram alterados impressão, backend ou regras de estoque.

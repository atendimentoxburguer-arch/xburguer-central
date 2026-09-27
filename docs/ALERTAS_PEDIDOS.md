# Alertas de pedidos

Na tela **Pedidos**, use **Ativar som dos pedidos**. A ativação toca uma amostra. O botão **Silenciar pedidos** desativa o áudio; os avisos visuais continuam ativos. É necessário ativar novamente após recarregar a página. Se o navegador suspender o áudio, o botão volta a oferecer a ativação.

Pedidos novos salvos nesta sessão geram um aviso no topo da aplicação e uma indicação no cartão. **Ver pedidos** abre o painel e **Ciente** limpa os avisos. Pedidos concluídos ou cancelados deixam de contar como pendentes. Uma gravação repetida ou uma mudança de status não repete o som. Pedidos com aceite automático também geram aviso.

O histórico carregado na abertura e pedidos restaurados por backup não disparam alertas. Falha ao gravar os dados não dispara um aviso de pedido salvo.

O Kanban e o KDS atualizam os indicadores de tempo a cada 30 segundos enquanto a página está visível e ao retornar à aba. O limite existente de atraso, acima de 35 minutos em produção, permanece. A atualização altera apenas textos e classes dos indicadores, preservando busca, foco e formulários.

## Integração

- `assets/js/order-alerts.js` controla áudio, deduplicação em memória, avisos e relógio.
- `core.js` chama a observação depois de persistir. `save({notifyOrders:false})` redefine a referência em restaurações.
- `orders.js`, `operations.js` e `index.html` fornecem os controles e indicadores.
- `app.js` inicializa uma única vez; o service worker inclui o novo módulo para uso offline.
- Contratos automatizados cobrem áudio indisponível/suspenso, ativação/silenciamento, gravações repetidas, restauração, falha de persistência e atualização dos tempos. Os testes de navegador cobrem os controles reais e a preservação da busca/foco.

## Limites

Esta funcionalidade acompanha o estado local deste navegador. Não sincroniza abas ou aparelhos, não recebe pedidos remotos e não emite notificações com a aplicação fechada. A chegada de pedidos externos depende da futura API autenticada. A detecção usa o identificador e a data de criação do pedido; a integração futura deve preservar ambos.

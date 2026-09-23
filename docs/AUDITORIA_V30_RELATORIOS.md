# Auditoria de Relatórios V30

## Objetivo

Transformar a área de relatórios em uma ferramenta de análise operacional específica, usando apenas dados realmente registrados pelo sistema.

## Relatórios disponíveis

- Visão geral
- Vendas e pedidos
- Pagamentos
- Produtos
- Categorias
- Canais
- Clientes
- Mesas
- Garçons
- Descontos e acréscimos
- Cancelamentos
- Caixa
- Estoque
- Financeiro

## Períodos

- Hoje
- Últimos 7 dias
- Últimos 30 dias
- Últimos 90 dias
- Todo o histórico
- Período personalizado

## Indicadores

Os relatórios podem detalhar, conforme o domínio:

- faturamento;
- ticket médio;
- subtotal;
- taxas de serviço e delivery;
- descontos e acréscimos;
- custo dos produtos;
- margem bruta estimada;
- quantidade de itens;
- participação percentual;
- tempo de conclusão;
- forma de pagamento;
- canal de atendimento;
- estoque e movimentações;
- motivos de cancelamento;
- sessões e fechamentos de caixa.

## Exportação

O relatório principal de cada aba pode ser exportado em CSV com codificação UTF-8 e separador compatível com planilhas em português.

## Limitações transparentes

- Pedidos antigos não registravam o garçom historicamente. Eles aparecem como “Não registrado”.
- Novos pedidos de mesa passam a salvar o responsável no próprio pedido.
- O sistema ainda não registra “WhatsApp” como origem separada do Delivery. Essa distinção deve entrar quando o backend de atendimento for conectado.
- Margem é estimada com base no custo unitário registrado nos itens; não substitui DRE contábil.

## Qualidade

O workflow Quality executa um contrato específico para garantir a existência das abas, filtros de período, exportação, cálculo de pagamentos, custos, cancelamentos, estoque e responsável histórico.

# Impressão — X Burguer Central V18

## Padrão de impressão

A impressão foi otimizada para **retrato/vertical**, com foco em economia de bobina e leitura rápida.

- papel térmico 58 mm;
- papel térmico 80 mm;
- A4 em retrato;
- margens mínimas;
- espaçamento compacto;
- texto preto puro e reforçado;
- divisórias simples, sem fundos que gastem impressão;
- logo opcional e desativado por padrão na V18 para economizar papel;
- tamanho da fonte configurável.

A densidade física/temperatura da cabeça térmica continua sendo uma configuração do driver/impressora. O sistema reforça peso, contraste e cor do texto no documento.

## Destinos de impressão

Em **Configurações → Impressoras → Gerenciar** é possível criar quantos destinos lógicos forem necessários, por exemplo:

- Balcão / Caixa;
- Cozinha geral;
- Chapa;
- Fritadeira;
- Bebidas;
- Bar;
- Expedição / Delivery.

Cada destino pode definir:
- documento: comprovante, cozinha ou expedição;
- papel: 58 mm, 80 mm ou A4;
- 1 a 3 cópias;
- setor da cozinha;
- ativo/inativo;
- eventos automáticos.

## Automação

O botão de raio de cada destino abre o roteamento automático. É possível selecionar:

- **Ao criar pedido**;
- **Ao entrar em produção**;
- **Ao ficar pronto**;
- **Ao concluir pedido**.

Exemplos:

- **Chapa** → cozinha → setor Chapa → automático ao entrar em produção;
- **Fritadeira** → cozinha → setor Fritadeira → automático ao entrar em produção;
- **Bebidas** → cozinha → setor Bebidas → automático ao entrar em produção;
- **Expedição** → delivery → automático ao ficar pronto;
- **Caixa** → comprovante → automático ao criar ou concluir.

Se vários destinos corresponderem ao mesmo evento, o sistema tenta abrir uma impressão para cada destino.

## Impressão física

A aplicação publicada no GitHub Pages usa a impressão nativa do navegador. O X Burguer Central controla:

- conteúdo;
- layout;
- papel;
- cópias;
- estação/setor;
- momento em que a impressão é aberta.

A **impressora física** ainda é escolhida no diálogo do Windows/navegador. Browsers não permitem que uma página comum selecione silenciosamente qualquer impressora instalada.

Para impressão realmente silenciosa e roteamento direto para dispositivos físicos diferentes, será necessária uma ponte local/desktop autorizada no computador do restaurante.

## Pontos manuais de impressão

- **Pedidos → Detalhes → Imprimir**;
- **KDS → Imprimir ficha**;
- **Entregas → Imprimir**;
- **Central de impressão → Impressão de teste**.

## Layout econômico

Em **Layout da impressão** é possível configurar:

- espaçamento compacto ou confortável;
- fonte pequena, normal ou grande;
- texto padrão ou escuro/reforçado;
- mostrar/ocultar logo.

A orientação permanece vertical para manter consistência e reduzir desperdício.

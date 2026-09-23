# Impressão — X Burguer Central V20

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

Se vários destinos corresponderem ao mesmo evento, o sistema cria um job separado para cada impressora física mapeada.

## Impressão física gerenciada

A ETAPA 2 utiliza o **X Burguer Print Agent**, agora distribuído como aplicativo Windows instalável e executado em segundo plano. Com o agente pareado e o destino mapeado, impressões térmicas 58/80 mm são enviadas diretamente ao spooler do Windows em RAW/ESC-POS, sem abrir a aba de impressão do navegador.

Cada destino lógico pode ser vinculado a uma impressora física instalada no computador. Exemplo:
- Caixa → EPSON TM-T20;
- Chapa → ELGIN i9 Chapa;
- Bebidas → ELGIN i9 Bar;
- Expedição → EPSON Expedição.

O agente mantém fila local, retry e histórico recente de jobs. Consulte `docs/PRINT_AGENT.md`.

A4 continua fora do modo silencioso nesta etapa.

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

## Aplicativo Windows

O usuário final instala o arquivo `X-Burguer-Print-Agent-Setup-<versão>.exe`. O aplicativo inclui o runtime necessário, inicia com o Windows por padrão e permanece ativo na bandeja. A janela própria permite acompanhar impressoras, fila, falhas, último job, logs e executar testes.

O instalador ainda não é assinado digitalmente nesta etapa; por isso o Windows SmartScreen pode exibir um aviso inicial.

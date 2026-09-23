# Impressão — X Burguer Central V17

## O que funciona agora

O sistema gera documentos próprios para:
- comprovante de balcão/caixa;
- ficha de cozinha;
- ficha de cozinha por estação;
- expedição/delivery.

Os layouts suportam papel térmico de 58 mm, 80 mm e A4. Cada destino lógico pode definir formato e número de cópias.

## Como a impressão funciona

A aplicação publicada no GitHub Pages usa a impressão nativa do navegador. Ao imprimir, o navegador abre o diálogo do sistema operacional; nele o operador escolhe a impressora física instalada, USB, rede ou compartilhada.

O X Burguer Central não tenta selecionar uma impressora do Windows silenciosamente. Isso é uma restrição deliberada da arquitetura web e evita depender de APIs experimentais ou específicas de fabricante.

## Central de impressão

Em **Configurações → Impressoras → Gerenciar** é possível:
- ativar/desativar impressão;
- definir papel 58 mm, 80 mm ou A4;
- definir 1 a 3 cópias;
- configurar comprovante, cozinha e expedição;
- limitar o destino de cozinha a uma estação;
- realizar impressão de teste;
- editar o rodapé;
- abrir impressão da cozinha ao aceitar pedido;
- abrir comprovante ao salvar pedido no PDV.

## Pontos de impressão

- **Pedidos → Detalhes → Imprimir:** comprovante, cozinha ou expedição.
- **KDS:** imprimir a ficha do pedido/estação atual.
- **Entregas:** imprimir a ficha de expedição.
- **PDV:** impressão opcional automática após salvar.
- **Aceite do pedido:** impressão opcional automática da cozinha.

## Próxima etapa para impressão silenciosa

Para impressão direta sem o diálogo do navegador, o projeto precisará de um componente local/desktop ou serviço de impressão autorizado. Esse componente faria a ponte entre o navegador e impressoras térmicas/ESC-POS, com mapeamento de dispositivo físico por estação.

WebUSB não foi escolhido como base principal porque sua disponibilidade entre navegadores é limitada e a integração com impressoras depende do protocolo/dispositivo.

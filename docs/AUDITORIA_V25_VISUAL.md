# Auditoria visual V25

## Problema encontrado

A V24 inseriu o bloco completo de estilos do checkout dentro de uma regra responsiva global `@media(max-width:820px)` já existente em `assets/css/app.css`. Como consequência, o desktop não recebia corretamente os estilos novos do checkout e a cascata responsiva de outras telas ficava reorganizada de forma incorreta em larguras menores.

## Correção

- Restaurado todo o CSS global exatamente à base estável anterior à V24.
- Reaplicado o bloco visual do checkout V24 no nível raiz da folha de estilo.
- Mantidos os estilos V24 restritos a seletores `checkout-*` e ao modal que contém `.checkout-shell-v24`.
- Renovado o cache do service worker para impedir que navegadores continuem servindo o CSS quebrado.
- Adicionado contrato automatizado de CSS para detectar:
  - chaves desbalanceadas;
  - checkout aninhado dentro de media query ou outra regra;
  - duplicação do bloco V24;
  - vazamento de seletores globais para o bloco do checkout;
  - ausência de seletores estruturais das telas principais.

## Áreas verificadas

- Estrutura principal, sidebar e topbar
- Pedidos
- PDV
- Gestão de salão e mesas
- Gestor de cardápio
- Entregas
- Performance
- Cozinha / KDS
- Clientes
- Marketing e atendimento
- Frente de caixa
- Estoque
- Financeiro
- Equipe
- Relatórios
- Configurações
- Modal de fechamento de mesa V24
- Breakpoints de 1120, 820, 620 e 560 px

## Resultado esperado

As telas gerais voltam ao comportamento visual estável da V23, enquanto o checkout de mesa mantém o layout V24 sem interferir no restante da aplicação.

# Auditoria visual V29 — Desktop Blue

## Objetivo

Transformar o X Burguer Central em uma interface desktop de retaguarda com linguagem visual estritamente baseada em azul, branco e cinza.

## Mudanças

- Interface desktop-first.
- Sidebar fixa azul-marinho com item ativo em azul.
- Topbar branca e compacta.
- Área principal cinza muito clara.
- Cards e módulos em branco.
- Inter como única família tipográfica externa.
- Azul reservado a ações, foco, seleção, links e indicadores ativos.
- Estados secundários usam cinza e texto/ícone.
- Kanban de pedidos com três colunas bem delimitadas.
- PDV com quatro produtos por linha em monitores amplos.
- Tabelas simplificadas e sem células em formato de card.
- Raios menores (6–10 px) e sombras discretas.
- Hover sem movimentação de componentes.
- Salão, cardápio, KDS, relatórios e checkout alinhados ao mesmo sistema visual.
- Tema escuro preservado apenas como alternativa, usando azul e cinza.

## Proteções automáticas

O Quality impede:
- retorno de cores verde, vermelho, laranja ou dourado à interface;
- retorno da fonte Manrope;
- perda dos tokens principais de azul;
- quebra dos seletores estruturais de desktop;
- crescimento descontrolado do CSS.

## Resultado esperado

Em 1366 px, 1440 px e Full HD, a interface deve priorizar densidade operacional, leitura rápida e baixo cansaço visual.

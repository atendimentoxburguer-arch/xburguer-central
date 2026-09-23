# Auditoria visual V31 — Tipografia e contraste

## Objetivo

Aumentar levemente a legibilidade do sistema sem perder a densidade operacional do layout desktop.

## Ajustes aplicados

- Corpo base passa de 15 px para 16 px.
- Títulos de página aumentados para aproximadamente 22 px.
- Botões, filtros, selects e campos aumentados em aproximadamente 1 px.
- Tabelas com cabeçalhos e células mais legíveis.
- Pedidos, PDV, mesas, cardápio, KDS, checkout e relatórios com textos operacionais maiores.
- Labels e metadados pequenos receberam aumento proporcional.
- Texto principal do tema claro escurecido para #111827.
- Texto secundário do tema claro escurecido para #475569.
- O tema escuro mantém contraste próprio para não prejudicar leitura.

## Princípio

A alteração foi feita modificando o sistema visual atual e os estilos de domínio existentes, sem adicionar uma nova camada de overrides de versão.

## Proteção

O contrato visual passa a verificar:
- texto principal #111827;
- texto secundário #475569;
- corpo base de 1rem;
- tipografia Inter;
- identidade azul, branco e cinza.

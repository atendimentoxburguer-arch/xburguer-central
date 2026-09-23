# Design System — X Burguer Central

## Direção visual

Interface operacional premium, limpa e rápida para restaurante. O visual usa azul como cor de ação, superfícies neutras e cores semânticas apenas para estado e urgência.

## Tipografia

- Manrope: títulos, navegação, botões e elementos de destaque.
- Inter: textos, formulários, tabelas e informações operacionais.
- Tamanhos maiores em títulos e métricas; corpo próximo de 15px para legibilidade em monitores de operação.

## Espaçamento

Escala baseada em múltiplos consistentes de 4 e 8 px para reduzir desalinhamentos e aumentar previsibilidade visual.

## Ícones

Ícones ficam dentro de áreas com tamanho e alinhamento consistentes. Evitar símbolos decorativos que não tenham significado operacional. Em botões com texto, o ícone acompanha a ação e recebe menos destaque que o rótulo.

## Componentes

- Cards: borda sutil, sombra suave e raio consistente.
- Tabelas: linhas enquadradas como blocos, com cabeçalho discreto.
- Formulários: campos mais altos, labels claros e foco visível.
- Pedidos: status por cor + texto; nunca depender apenas de cor.
- Modais: hierarquia clara, ações no rodapé e foco inicial.
- Sidebar: navegação de alta frequência com ícones centralizados e estado ativo evidente.

## Responsividade

Desktop prioriza densidade e leitura simultânea. Em tablet e celular, grids são reduzidos e ações passam a ocupar largura maior.

## Referências de princípios

A organização de espaçamento e densidade segue princípios comuns em design systems maduros, como Carbon. A direção de iconografia prioriza formas limpas e consistentes, semelhante ao princípio de bibliotecas SVG como Lucide.

## Regras de alinhamento V13

- Toolbars usam uma grade previsível: conteúdo flexível à esquerda e ações à direita; em larguras menores viram uma coluna.
- Componentes operacionais não devem se mover ao passar o mouse; feedback usa borda/sombra em vez de deslocamento.
- Ícones e botões têm caixas fixas para evitar desalinhamento vertical.
- Textos longos usam truncamento ou quebra controlada conforme o contexto.
- Tabelas mantêm alinhamento de colunas e usam rolagem horizontal em telas pequenas.
- Cards de pedidos, mesas, PDV e KDS seguem a mesma escala de espaçamento e raios.
- Estilos de layout não devem ser adicionados inline; usar classes reutilizáveis.

## Gestão operacional V14

- Salão é organizado por áreas/seções, com mesas exibindo capacidade, ocupação, responsável e consumo.
- Mesas podem ser criadas individualmente ou em lote, reordenadas, transferidas e administradas em um painel próprio.
- Cardápio usa uma visão de gestão com KPIs, filtros de disponibilidade/estoque, ordenação, seleção múltipla e ações em massa.
- Produto concentra nome, descrição, preço, custo, estoque, mínimo, estação de preparo, categoria, visibilidade e status de esgotado.
- Cores de status continuam acompanhadas de texto e não são usadas como único indicador.

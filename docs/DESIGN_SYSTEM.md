# Design System — X Burguer Central

## Direção visual V26

A interface deve parecer um sistema operacional de restaurante profissional: rápida de ler, compacta sem ficar apertada, consistente entre módulos e alinhada à identidade da X Burguer. A marca usa **vermelho escuro/bordô como ação principal**, **dourado/mostarda como acento**, branco e neutros quentes. Cores semânticas continuam reservadas para estados como sucesso, alerta e erro.

## Tipografia

- **Manrope**: títulos, navegação, botões, métricas e destaques.
- **Inter**: textos, formulários, tabelas e informações operacionais.
- Base desktop: 16 px no HTML, com corpo visual próximo de 15 px.
- Títulos de página: aproximadamente 23 px; títulos internos ficam entre 14 e 18 px conforme hierarquia.
- Textos auxiliares não devem ficar menores que o necessário para leitura operacional.
- Evitar excesso de caixa alta. Usar caixa alta apenas em labels curtas e cabeçalhos de tabela.

## Iconografia

- Biblioteca principal: Bootstrap Icons.
- Ícone aparece antes do texto em botões.
- Ícones de ação usam tamanho e caixa consistentes.
- Dourado pode destacar navegação/identidade; vermelho bordô identifica ações primárias.
- Cores de estado nunca dependem apenas do ícone: sempre combinar com texto.

## Escala e densidade

- Espaçamentos seguem múltiplos previsíveis de 4 px.
- Cards padrão: raio entre 10 e 14 px.
- Botões padrão: altura aproximada de 40 px; compactos, 32 px.
- Campos: altura aproximada de 40 px.
- Sombras são sutis; borda e hierarquia devem fazer a maior parte do trabalho visual.
- Evitar animações que movam componentes no hover. Mudanças de borda, fundo e sombra são preferíveis.

## Componentes

- **Sidebar:** bordô escuro, ícones dourados e estado ativo em vermelho da marca.
- **Topbar:** clara, compacta, com logo circular preservada.
- **Page head:** superfície neutra com filete lateral dourado → bordô.
- **Botões primários:** bordô; sucesso usa verde; exclusão/erro usa vermelho semântico.
- **Cards:** branco/neutro com borda discreta.
- **Métricas:** filete superior dourado → bordô.
- **Tabelas:** cabeçalho neutro e linhas simples, sem blocos visuais excessivos.
- **Formulários:** labels mais legíveis, foco visível e campos consistentes.
- **Modais:** hierarquia clara, ações no rodapé.
- **Checkout:** mantém o layout V24, mas recebe a tipografia, cores e densidade V26.

## Responsividade

Desktop prioriza leitura simultânea e densidade operacional. Em tablet e celular:
- grids reduzem colunas progressivamente;
- ações podem ocupar largura maior;
- tabelas usam rolagem horizontal;
- sidebar vira painel móvel;
- texto mantém legibilidade sem reduzir excessivamente.

## Regras de engenharia visual

- Novos estilos globais devem ficar em blocos de versão no nível raiz do CSS, nunca aninhados acidentalmente em media queries.
- Regras específicas do checkout devem permanecer isoladas.
- Estilos de domínio carregados depois de `app.css` precisam manter a mesma escala visual.
- Mudanças visuais devem preservar foco de teclado, contraste e `prefers-reduced-motion`.
- O workflow Quality executa contratos de estabilidade visual para impedir regressões de cascata.

## Gestão operacional

- Pedidos, mesas, PDV e KDS compartilham a mesma escala de espaçamento, tipografia e ícones.
- Status operacionais usam texto + cor.
- Valores financeiros devem destacar total e saldo sem competir visualmente com ações.
- Cardápio prioriza leitura do produto, foto, preço e disponibilidade.
- Salão prioriza mesa, responsável, ocupação e consumo.

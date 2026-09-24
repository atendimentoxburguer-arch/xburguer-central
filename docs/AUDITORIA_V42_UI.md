# Revisão visual da interface

Base: `fe4e618`, que já contém o PR #35 de inicialização automática / Print Agent 2.5.0. A revisão visual não modifica o agente, os modelos térmicos nem os mapeamentos de impressoras.

## Problemas tratados

- Larguras divergentes entre sidebar e coluna do aplicativo.
- Cabeçalhos, indicadores e formulários com caixas decorativas excessivas.
- Metadados menores que 12 px no desktop em vários componentes.
- Superfícies brancas fixas com texto claro no tema escuro.
- Indicador de loja usando cores fora da identidade.
- Status e ações do cardápio disputando espaço.
- Título parcialmente encoberto pela barra fixa ao abrir a rota inicial.

## Implementação

As definições dos componentes existentes foram editadas diretamente nos dois arquivos de estilos. Foram retiradas 116 declarações sobrescritas por definições posteriores equivalentes. Não há uma nova folha de overrides, biblioteca de componentes ou alteração de persistência. A fonte continua Inter, com identidade azul, branco e cinza. O cache do aplicativo foi atualizado para distribuir os estilos novos.

O cabeçalho de página organiza título, descrição e ações sem um cartão extra. A navegação tem rótulos mais curtos e três grupos. Os campos mantêm label e controle sem uma segunda caixa. Pedidos recebem mais espaço entre informações, enquanto a grade do cardápio reorganiza status e ações em telas menores. Superfícies e ações usam tokens adequados aos temas.

## Validação

- Contratos existentes: arquitetura, visual, estado, negócio, salão/checkout, relatórios, impressão e Print Agent, além de estrutura estática e sintaxe.
- Teste de navegador reproduzível: 192 combinações de módulo, largura e tema, com verificações de título, estado de navegação, erro de renderização e transbordamento horizontal fora de áreas roláveis.
- Regressão específica de sobreposição entre status e ações no cardápio.
- Interações: adicionar produto ao rascunho do PDV, abrir e fechar ajuste, abrir checkout nos dois temas e navegar pelo menu móvel.
- Capturas das áreas principais nos temas claro e escuro para inspeção visual.

Limites: os testes de impressão utilizam os contratos e simulações existentes. Não foi feita impressão física na MP-4200 TH ou EPSON COZINHA, nem novo teste de inicialização com o Windows. A revisão de telas usa dados demonstrativos, sem acesso aos dados locais da operação real. Os testes de layout não equivalem a uma auditoria completa de acessibilidade nem a validação manual de todos os diálogos.

# Design System — X Burguer Central

## Direção visual atual

A interface é **desktop-first** e deve funcionar como software operacional de retaguarda: rápida, limpa, estável e confortável para uso prolongado.

A identidade visual usa somente:

- **Azul** para ação, seleção, links, foco e indicadores ativos.
- **Branco** para cartões e superfícies principais.
- **Cinza** para fundos secundários, divisórias, textos auxiliares e estados neutros.

Estados operacionais são diferenciados por texto, ícone, peso e variações de azul/cinza, evitando depender de múltiplas cores. No tema claro, o texto principal usa grafite profundo (#111827) e o texto secundário usa cinza-azulado mais escuro (#475569) para manter contraste durante uso prolongado.

## Tipografia

A fonte oficial é **Inter**, com fallback para Segoe UI, Roboto, Arial e sans-serif do sistema.

Escala principal:

- título de página: 22–24 px;
- títulos internos: 15–17 px;
- texto operacional: 13–16 px;
- labels e metadados: 12–13 px no desktop;
- valores financeiros: 17–26 px conforme prioridade.

A interface deve evitar textos pequenos demais e não deve usar mais de uma família tipográfica sem necessidade funcional.

## Layout desktop

- Sidebar fixa entre 228 e 248 px.
- A largura da sidebar acompanha a coluna do shell, sem medidas conflitantes.
- Navegação agrupada em Operação, Relacionamento e Gestão, com rótulos curtos.
- Topbar próxima de 64 px.
- Conteúdo com largura fluida até 1920 px.
- Espaçamentos principais entre 8 e 24 px.
- Cabeçalhos de página sem cartão adicional; título, descrição e ações com quebra de linha quando necessário.
- Pedidos usam Kanban em três colunas no desktop.
- PDV prioriza grade de produtos + resumo da venda.
- Mesas e KDS priorizam leitura simultânea sem excesso de rolagem.

## Componentes

### Sidebar
- Azul-marinho muito escuro.
- Ícones em azul claro.
- Item ativo em azul principal.
- Hover discreto, sem deslocamento.

### Cards
- Fundo branco.
- Borda cinza clara.
- Raio entre 8 e 10 px.
- Sombra mínima; hover usa principalmente mudança de borda.

### Botões
- Primário: azul.
- Secundário: branco com borda cinza.
- Ações destrutivas: cinza escuro + confirmação explícita.
- Altura padrão próxima de 40 px.

### Formulários
- Fundo branco.
- Bordas cinza.
- Foco azul visível.
- Labels curtos e legíveis.
- Evitar envolver cada campo em outra caixa cinza: label e controle já formam o componente.

### Tabelas
- Cabeçalho cinza muito claro.
- Linhas brancas.
- Hover cinza suave.
- Sem cartões individuais por célula.

### Kanban de pedidos
- Fundo das colunas em cinza muito claro.
- Cards brancos.
- Azul indica ação/seleção.
- Atraso ou atenção usa texto e ícone, não uma paleta paralela.

### Modais
- Fundo branco.
- Overlay azul-grafite translúcido.
- Ações alinhadas e previsíveis.

## Feedback

Hover e active devem ser claros, mas discretos:

- azul mais escuro em ações primárias;
- fundo azul muito claro em seleções;
- borda azul em elementos interativos;
- sem animações de salto ou movimento constante.

## Responsividade

Desktop é o alvo principal. Tablet e celular são fallback operacional, mantendo as funções essenciais sem redefinir a experiência inteira.

## Regras de engenharia visual

- Não criar blocos CSS por número de versão.
- Não adicionar uma segunda biblioteca visual paralela.
- Não reintroduzir dourado, verde, laranja ou vermelho como cores da interface.
- Não adicionar outra fonte ao sistema sem justificativa.
- Preferir variáveis e componentes existentes.
- O Quality valida tokens, tipografia, seletores estruturais e cores proibidas.

## Temas e contraste

Superfícies de componentes usam `--surface`, `--surface-2` e `--surface-3` em vez de branco fixo. O azul de texto (`--primary`) pode clarear no tema escuro; o azul de ações preenchidas (`--action`) permanece escuro para preservar contraste com texto branco. Informações de status mantêm texto explícito.

## Referências de projeto

Princípios aplicados à implementação existente, sem introduzir uma biblioteca paralela nem depender de um arquivo Figma:

- [Figma — Typography systems](https://www.figma.com/best-practices/typography-systems-in-figma/): hierarquia tipográfica e estilos reutilizáveis.
- [Figma — Auto layout](https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout): espaçamento, alinhamento e distribuição adaptáveis ao conteúdo.
- [Figma — Components, styles and shared libraries](https://www.figma.com/best-practices/components-styles-and-shared-libraries/): consistência a partir de componentes compartilhados.

## Verificação no navegador

O workflow Quality executa `scripts/browser-check.cjs` com Playwright em Chromium. Verifica as 16 áreas em seis larguras (390, 768, 1024, 1366, 1440 e 1920 px), nos dois temas, além de rascunho no PDV, diálogo de ajuste, checkout de mesa e menu móvel. O teste usa apenas dados demonstrativos em um contexto isolado.

Execução local: instalar Playwright 1.62.1 e seu Chromium e executar `node scripts/browser-check.cjs`. `BROWSER_CHANNEL=msedge` permite testar com Edge instalado; `UI_SCREENSHOTS` define uma pasta opcional de capturas. `PLAYWRIGHT_MODULE` permite usar uma instalação externa das ferramentas de teste.

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
- labels e metadados: 11–13 px;
- valores financeiros: 17–26 px conforme prioridade.

A interface deve evitar textos pequenos demais e não deve usar mais de uma família tipográfica sem necessidade funcional.

## Layout desktop

- Sidebar fixa entre 228 e 248 px.
- Topbar próxima de 64 px.
- Conteúdo com largura fluida até 1920 px.
- Espaçamentos principais entre 8 e 24 px.
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

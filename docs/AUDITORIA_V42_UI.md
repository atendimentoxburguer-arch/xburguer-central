# Navegação por tarefas e revisão da experiência

Base: fe4e618, que já contém o PR #35 de inicialização automática / Print Agent 2.5.0. O trabalho está isolado no PR #36, sem alterar a main.

## Resultado

- Página inicial com situação da operação, atalhos e diretório de todas as funções.
- Menu organizado por tarefas e contexto de navegação na barra superior.
- Busca global por nome ou intenção, por botão, Ctrl K e /. Ignora acentos e abre telas ou formulários; não executa pagamentos nem impressões automaticamente.
- Sidebar, diretório, contexto e busca compartilham um único catálogo, evitando nomes divergentes.
- Pedidos exibem resumo dos produtos e ações claras. Prazos e aceite automático ficam em Preferências, fora da fila.
- PDV com busca por produto e pedido na lateral. Identificação e total sempre visíveis; pagamento e ajustes agrupados. Limpar um rascunho pede confirmação.
- Salão prioriza atendimento; cadastro em lote e organização de mesas continuam disponíveis no gerenciador.
- Tema claro mais leve, títulos e espaçamentos maiores, tema escuro com superfícies adequadas.
- Inter e ícones distribuídos localmente, com licenças e cache offline.

## Preservação da operação

Permanecem as regras de cálculo, estoque, pagamento, persistência, impressão e roteamento. O esquema de dados não mudou. Os layouts foram modificados nos componentes existentes, sem biblioteca de interface paralela ou arquivo de overrides por versão. Foram eliminadas declarações sobrescritas e os estilos do antigo cartão de automação, que deixou de existir.

## Verificação

- Todos os contratos existentes de arquitetura, estado, negócio, salão/checkout, relatórios, impressão e Print Agent, além de sintaxe e estrutura estática.
- 204 combinações de 17 telas, seis larguras (390 a 1920 px) e dois temas.
- Sobreposição de status e ações do cardápio, título, erro de renderização, estado de navegação e transbordamento horizontal fora de áreas roláveis.
- Busca sem acentos, intenção “fechar mesa”, resultados vazios e proteção de formulários abertos.
- Busca de produtos, manutenção do pedido ao navegar e cancelamento da limpeza do rascunho.
- Criação de pedido de demonstração: cliente, pagamento, preço e quantidade preservados; estoque reduzido na quantidade correta.
- Checkout nos dois temas e navegação móvel.
- Serviços externos bloqueados no teste para verificar fonte e ícones locais.

Limites: impressão física na MP-4200 TH / EPSON COZINHA e inicialização real do Windows não foram testadas; o agente permanece sem alterações. Não há acesso aos dados reais da operação. Os testes não equivalem a uma auditoria completa de acessibilidade ou verificação manual de todos os diálogos.

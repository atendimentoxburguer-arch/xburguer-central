# Migração para operação conectada

Esta evolução é implementada no próprio X Burguer, com recursos equivalentes de gestão e vendas. Não copia código, marca ou dados do Anota AI. Nenhuma conta externa ou base real é migrada automaticamente.

## O que esta etapa entrega

| Recurso | Implementação | Limite atual |
| --- | --- | --- |
| Dados compartilhados | PostgreSQL, revisão transacional, histórico de ações e importação inicial única | Requer servidor; sincronização de telas a cada 10 segundos |
| Login e equipe | Senha derivada por scrypt, sessão HttpOnly, perfis e revogação de acesso | Administrador usa o PDV completo; atendimento/garçom/cozinha usam a visão operacional restrita |
| Cardápio público | Produtos, busca, carrinho, conferência de total e pedido com estoque reservado | Pagamento combinado com a loja; não cobra online |
| Mesa pelo celular | Link revogável por mesa e lançamento pelo garçom | O endereço pode ser convertido em QR; a geração gráfica integrada ainda usa o identificador local antigo |
| Cupons | Percentual, compra mínima, validade e limite de usos no servidor | Válidos no cardápio público; campanhas locais antigas não são convertidas em regras automaticamente |
| Cashback | Livro de créditos/débitos, saldo, resgate administrativo, devolução por cancelamento | Exige cliente cadastrado, conclusão e recebimentos explícitos; não credita histórico antigo |
| Agendamento | Janela entre 15 minutos e 7 dias, identificação na fila e bloqueio de preparo antecipado | Reserva estoque no envio; aceite é feito pela operação quando chegar o horário |
| WhatsApp oficial | Webhook assinado, deduplicação, recebimento e resposta de texto no Atendimento | Precisa de credenciais da Business Platform; não ativado nem testado no número real |
| Impressão | Credenciais e fila preservadas no aparelho; impressão espera confirmação do servidor | Pedidos externos não têm despacho central automático; fila distribuída permanece pendente |

As alterações não ativam o modo conectado no GitHub Pages. Ele continua sendo a versão local. O servidor fornece a mesma interface com a fonte de dados remota. Se a API falhar, o modo conectado bloqueia a entrada e não abre uma demonstração local.

## Recursos que ainda NÃO estão concluídos

- Cobrança Pix/cartão, confirmação, estorno pelo provedor e conciliação: selecionar e homologar provedor.
- Fiscal/NFC-e: selecionar provedor, cadastrar dados fiscais/certificado no ambiente seguro e homologar.
- IA conversacional, montagem de pedidos pela conversa e transcrição de áudios: desenvolvimento e provedor ainda pendentes.
- Instagram/Facebook: conexão de canais e permissões ainda pendentes.
- Recuperação automática de carrinho, campanhas e modelos de mensagem aprovados: desenvolvimento, consentimento e configuração ainda pendentes.
- Logística externa/Entrega Fácil: provedor e desenvolvimento pendentes.
- Pixel e mensuração de anúncios: configuração e desenvolvimento pendentes.
- Autoatendimento de cashback: exige identidade verificada do cliente; o resgate atual é feito pelo administrador.
- Backup automático gerenciado, restauração de produção e monitoramento: dependem de infraestrutura configurada.
- Impressão central com confirmação de um único agente e liberação automática de pedidos agendados: desenvolvimento pendente.
- Modelo relacional completo por domínio e comandos financeiros específicos: próxima fase; a compatibilidade atual usa documento JSONB revisionado.

Não apresentar estes itens como ativos só por existir uma tela ou configuração. A equivalência completa com uma plataforma comercial continua em andamento.

## Migração sem duas fontes de dados

1. Disponibilizar PostgreSQL e servidor HTTPS em ambiente de homologação.
2. Configurar as variáveis de ambiente apenas no servidor (ver apps/platform/README.md).
3. No sistema local usado pela loja, exportar um backup. Guardar também uma cópia antes de qualquer mudança.
4. Entrar como administrador no novo endereço e importar esse arquivo. A importação só funciona quando o servidor está vazio.
5. Conferir produtos, estoque, clientes, mesas, caixa, histórico e contas com o arquivo de origem.
6. Parear o Print Agent nesse novo endereço. Tokens, fila e destinos físicos continuam específicos do computador.
7. Testar vendas, cancelamentos, fechamento e impressão física com a equipe.
8. Somente depois da conferência, passar todos os aparelhos para o endereço conectado e encerrar os lançamentos no endereço antigo.

Importar uma cópia para homologação não move os dados da loja nem interrompe sua operação. Não usar simultaneamente o site local antigo e o servidor para registrar vendas reais.

## Permissões

- Administrador: interface completa, migração inicial, cadastros de acesso, cupons, cashback, auditoria e atendimento oficial.
- Atendimento: visão operacional, lançamento em mesa, início de preparo e marcação como pronto.
- Garçom: catálogo, mesas, pedidos sem dados financeiros privados e lançamento de consumo.
- Cozinha: itens, observações, estado de preparo e marcação como pronto.
- Cliente: catálogo, cotação, envio e acompanhamento por token; não acessa cadastros, custos, saldos ou dados de outros clientes.

O cadastro de colaboradores operacionais da versão local permanece separado dos logins autenticados. Criar um colaborador antigo não concede acesso ao servidor. Criar o acesso por Configurações → Plataforma ou pela busca global.

## Conflitos e falhas

A revisão do servidor é obrigatória para gravar alterações administrativas. Uma atualização desatualizada recebe conflito; não sobrescreve pedidos de outro aparelho. A proposta rejeitada é preservada localmente sem credenciais de impressão e pode ser exportada em Plataforma → Exportar alteração que não foi confirmada. Ela não é uma venda confirmada nem deve ser importada sobre o servidor.

O modo conectado requer rede para confirmar vendas. Não acumula vendas offline para conciliação posterior. A interface aguarda a confirmação antes de imprimir. Dados de negócio remotos não são gravados na antiga chave local.

## Cashback

O percentual vigente é fixado na primeira concessão do pedido. Mudar a configuração não recalcula créditos históricos. Só há crédito após conclusão com pagamentos registrados suficientes. Resgate reduz o total de um pedido aberto e é permitido uma vez por pedido. Pedidos com resgate não aceitam alteração posterior de preço ou cliente. Cancelar devolve o resgate uma vez.

Estornar uma compra remove o crédito correspondente. Se o cliente já gastou esse saldo, ele pode ficar negativo; novos resgates ficam bloqueados até haver saldo suficiente. A operação deve conferir a identidade do cliente antes do resgate manual.

## Validação

- Contratos da aplicação local e testes de navegação existentes.
- Testes de API: autenticação, origem, isolamento de dados, migração, conflitos, cotação, cupons, estoque concorrente, repetição de pedido, links de mesa, agendamento e auditoria.
- Testes de cashback: concessão única, percentual histórico, resgate repetido, cancelamento e estorno.
- WhatsApp com transporte simulado: assinatura, deduplicação, janela de resposta e envio incerto sem reenvio automático.
- Navegador: migração por arquivo, alteração confirmada, pedido público, conflito, garçom em celular e falha de API sem retorno à demonstração.
- CI executa a API principal em PostgreSQL 17; testes locais usam PGlite, que executa PostgreSQL via WebAssembly.
- Impressão física, número real do WhatsApp, hospedagem e restauração operacional precisam de homologação específica.

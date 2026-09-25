# X Burguer Platform

Servidor opcional da aplicação existente, catálogo público e estação da equipe. Não é iniciado pelo Print Agent e não muda a operação local do GitHub Pages.

## Executar

Requisitos: Node.js 22 ou superior, PostgreSQL 17 e HTTPS para acesso fora do computador local.

1. Instalar as dependências em apps/platform com `npm ci`.
2. Copiar `.env.example` para `.env` e preencher no ambiente seguro.
3. Definir DATABASE_URL, PUBLIC_ORIGIN, ADMIN_EMAIL e ADMIN_PASSWORD (mínimo 12 caracteres).
4. Executar `npm start`. A migração de banco é idempotente. O administrador inicial só é criado em banco sem usuários.
5. Abrir PUBLIC_ORIGIN, entrar e importar o backup inicial da aplicação.
6. Remover ADMIN_PASSWORD da configuração depois da criação inicial. A senha não é impressa nos logs.

PUBLIC_ORIGIN deve ser a origem exata, sem subdiretório, por exemplo o domínio HTTPS do servidor. HTTP só é aceito em loopback para testes. Atrás de proxy, usar HTTPS na borda e restringir o acesso direto à porta interna. A API não habilita CORS e exige mesma origem nas ações do navegador.

Para container, construir a partir da raiz do repositório:

```sh
docker build -f apps/platform/Dockerfile -t xburguer-platform .
docker run --env-file /caminho/seguro/platform.env -p 127.0.0.1:3080:3080 xburguer-platform
```

O banco fica fora do container. Não usar dados reais em banco temporário. O container não foi executado neste ambiente Windows sem Docker; o código do servidor é testado diretamente.

## Endereços

- `/`: login e interface administrativa existente.
- `/loja.html`: cardápio e pedidos públicos.
- `/equipe-online.html`: operação autenticada para atendimento, garçom e cozinha.
- `/api/health`: disponibilidade da aplicação e banco.
- `/api/webhooks/whatsapp`: verificação e eventos oficiais da Meta.

Buscar no sistema por “cupom online”, “cashback”, “acesso da equipe”, “link da mesa” ou “cardápio online” para acessar as funções conectadas.

## WhatsApp

O aplicativo WhatsApp Business informado pelo proprietário ainda não confirma acesso à Business Platform. Configurar apenas quando a conta oficial disponibilizar App Secret, token de verificação, Phone Number ID, access token e versão da Graph API suportada.

Configurar o callback HTTPS acima no aplicativo Meta e assinar os eventos de mensagens. O webhook valida HMAC sobre os bytes originais e ignora números de conta diferentes. Repetir um evento não duplica mensagens. Respostas de texto só são permitidas dentro da janela de 24 horas da última mensagem do cliente.

Não existem respostas automáticas, campanhas, modelos aprovados ou transcrição de áudio nesta etapa. Mensagens recebidas de mídia são sinalizadas sem baixar o conteúdo. Envio sem confirmação fica incerto e não é reenviado automaticamente. Conferir no provedor antes de uma nova tentativa.

Referências oficiais:
- https://whatsappbusiness.com/developers/developer-hub/
- https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/
- https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api

## Dados e evolução

PostgreSQL é a fonte única no modo conectado. O documento legado fica em store_state com revisão e trava transacional enquanto os domínios migram para comandos próprios. Pedidos públicos, estoque e cupons são confirmados juntos. Login, sessões, idempotência, auditoria, cashback e mensagens têm tabelas próprias.

A ponte de validação executa somente o core.js pertencente ao repositório, nunca código do usuário. A extração futura de regras de domínio compartilhadas substituirá essa ponte; não duplicar normalizadores no frontend e backend. O servidor usa módulos JavaScript compatíveis com o projeto atual; adoção de TypeScript fica para a extração dos domínios, sem introduzir compilação apenas para mudar a linguagem.

A compatibilidade de snapshot administrativo limita a importação e cada gravação a 5 MB. Ela serve à transição, não a histórico ilimitado ou centenas de fotos em base64. Antes de aumentar volume, extrair os domínios para tabelas e imagens para armazenamento de objetos.

O exportador do navegador contém o estado operacional, mas não usuários, sessões, ledger de cashback ou auditoria. Para backup completo, configurar snapshots/PITR do PostgreSQL ou `pg_dump` no ambiente operacional, com cópia externa e teste de restauração em banco isolado. Isso ainda não foi configurado em serviço real.

## Testes

```sh
npm test
```

Sem TEST_DATABASE_URL, os testes usam PostgreSQL embarcado via PGlite. O workflow Quality fornece PostgreSQL 17 real para a suíte HTTP. A variável TEST_DATABASE_URL só deve apontar para banco descartável.

Na raiz, executar `node scripts/platform-browser-check.cjs` depois de instalar Playwright. O teste cria um servidor e banco isolados e não toca a loja real.

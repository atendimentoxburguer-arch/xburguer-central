# Auditoria técnica — X Burguer Gestor PRO V10

## Contexto analisado
**Objetivo:** sistema de gestão para restaurante/lanchonete com pedidos, PDV, mesas/comandas, cardápio, cozinha/KDS, delivery, clientes, caixa, estoque, financeiro e equipe.  
**Stack atual:** HTML5 + CSS + JavaScript no navegador, Bootstrap 5 para base visual, Bootstrap Icons, `localStorage` para persistência do protótipo.

## 1. Arquitetura e código
### Problemas encontrados na V9
- Um único HTML com milhares de linhas e CSS acumulado de diversas versões.
- Regras CSS repetidas e sobrescritas várias vezes, aumentando risco de regressão visual.
- Logo em Base64 dentro do HTML/JS, elevando o tamanho e dificultando cache/manutenção.
- Toda a lógica de domínio e renderização concentrada em um script global.
- Dependência de IDs globais implícitos do navegador em alguns formulários.
- Muitos handlers inline; aceitáveis no protótipo offline, mas inadequados para backend real/CSP estrita.

### Refatoração aplicada na V10
- CSS consolidado em **um design system único** (`assets/css/app.css`).
- JavaScript separado por domínio: `core`, `ui`, `orders`, `sales`, `operations`, `crm`, `management`, `app`.
- Logo convertida em asset (`assets/img/logo.png`).
- Navegação, modal, tema, storage e helpers isolados.
- Validação defensiva em navegação, persistência e configurações.
- Mantidos scripts clássicos em vez de ES Modules para garantir abertura direta por `file://` no Chrome.

## 2. Design (UI)
- Sistema visual azul profissional com tokens centralizados.
- Dark mode completo e persistente.
- Hierarquia tipográfica consistente, Inter + fallback de sistema.
- Bordas, cartões, sombras e raios padronizados.
- Estados semânticos mantidos: azul para ação, verde para sucesso, laranja para atenção, vermelho para erro/atraso.
- Ícones Bootstrap Icons padronizados; símbolos improvisados foram reduzidos.

## 3. Experiência do usuário (UX)
- Breakpoints para desktop, tablet e celular.
- Sidebar móvel, tabelas roláveis e grids adaptativos.
- `focus-visible`, labels, `aria-label`, `aria-current`, modal com foco inicial e Escape para fechar.
- Toast com `aria-live` para feedback acessível.
- Mensagens vazias, estados de atraso e status mais legíveis.
- Fluxos operacionais preservados para evitar reaprendizado da equipe.

## 4. Performance e segurança
### Aplicado agora
- HTML significativamente menor ao remover CSS histórico e Base64 da logo.
- Assets separados permitem cache quando servido por HTTP.
- Scripts com `defer`; Bootstrap JS removido porque não era necessário.
- `esc()` continua escapando dados exibidos em HTML, reduzindo risco de XSS no protótipo.
- SEO de aplicação interna: `noindex,nofollow`; não faz sentido indexar o painel administrativo.

### Obrigatório antes de produção real
- Não confiar em `localStorage` como banco de dados.
- Backend com autenticação, autorização por perfil (RBAC), sessões/tokens seguros e logs de auditoria.
- Validação e sanitização também no servidor; nunca confiar apenas no front-end.
- Banco relacional com transações para pedido, pagamento, estoque e caixa.
- HTTPS obrigatório, rate limiting, proteção contra brute force, CSP estrita, headers de segurança e backups.
- Segredos/API keys somente no backend; nunca embutidos no HTML/JS.

## 5. Qualidade, testes e evolução
O pedido mencionou cinco parâmetros, mas listou quatro; completei a auditoria com qualidade/testabilidade.
- Adicionar testes unitários para totais, transições de status, caixa e estoque.
- Testes E2E para pedido → produção → pronto → finalizado e mesa → fechamento.
- Linter/formatter (`ESLint` + `Prettier`) quando o projeto migrar para npm/Vite.
- Próxima arquitetura recomendada para produção: **React + TypeScript + Vite** no front-end e **Node/NestJS ou FastAPI** no backend, PostgreSQL, Redis para filas/cache e WebSocket/SSE para atualização em tempo real.

## Estrutura da V10
```text
X_Burguer_Gestor_PRO_v10/
├── index.html
├── assets/
│   ├── css/app.css
│   ├── img/logo.png
│   └── js/
│       ├── core.js
│       ├── ui.js
│       ├── orders.js
│       ├── sales.js
│       ├── operations.js
│       ├── crm.js
│       ├── management.js
│       └── app.js
└── AUDITORIA.md
```

## Como abrir
Abra `index.html` no Chrome. O protótipo permanece offline para dados e usa `localStorage`. A fonte, o Bootstrap CSS e os ícones são carregados por CDN quando houver internet; o layout principal possui CSS próprio local.
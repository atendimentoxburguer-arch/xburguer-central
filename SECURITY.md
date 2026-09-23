# Segurança

O projeto atual é um protótipo local e não deve receber credenciais reais no código.

## Nunca versionar
- senhas;
- tokens;
- chaves de API;
- credenciais fiscais;
- chaves de pagamento;
- dados pessoais exportados de clientes.

## Produção
Antes de uso real, implementar autenticação, autorização no servidor, validação de entrada, proteção de sessão, logs de auditoria, backups e gestão de segredos por ambiente.

O repositório está público no momento; trate todo conteúdo versionado como público.

## Validações V15

Backups importados passam por limite de tamanho, validação de estrutura, IDs seguros, unicidade e integridade mínima de referências. Campos dinâmicos identificados na auditoria passam por escape antes de renderização. Ainda assim, esta é uma aplicação estática sem servidor: autenticação, autorização e proteção de dados precisam ser implementadas no backend antes da produção.

## Hardening V16

A validação local cobre referências entre pedidos/clientes e movimentos/produtos, tipos/status de pedido, limites básicos de conteúdo e importações. A interface reduz inserção de valores editáveis dentro de handlers inline. A CSP ainda permite `unsafe-inline` por compatibilidade com a arquitetura atual; remover essa exceção requer a migração dos handlers HTML para listeners/event delegation.

## Impressão V17

A impressão usa documentos gerados localmente e o diálogo nativo do navegador. O módulo não recebe comandos remotos de impressão e não tenta acessar dispositivos USB diretamente. Dados dinâmicos são escapados antes de compor os documentos impressos.

## Print Agent V19

O agente de impressão escuta somente em `127.0.0.1`, exige pareamento e token local para rotas protegidas, restringe CORS ao GitHub Pages oficial/origens locais e rejeita URLs de agente que não sejam loopback. O token não é versionado e é removido de backups exportados. Logs, fila e token ficam em `%APPDATA%\X Burguer Central\Print Agent`.

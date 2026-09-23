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

# X Burguer Print Agent

Agente local da ETAPA 1 de impressão gerenciada do X Burguer Central.

## Objetivo

Permitir impressão silenciosa em impressoras térmicas instaladas no Windows, sem abrir a aba de impressão do navegador.

O agente:
- escuta apenas em 127.0.0.1:17871;
- descobre impressoras instaladas no Windows;
- recebe jobs autorizados do X Burguer Central;
- mantém fila local persistente;
- tenta novamente até 3 vezes em falhas transitórias;
- grava logs locais;
- envia dados RAW/ESC-POS ao spooler do Windows.

## Requisitos

- Windows 10/11;
- Node.js 20 LTS ou superior;
- impressora térmica instalada no Windows;
- impressora compatível com RAW/ESC-POS para o modo silencioso da ETAPA 1.

## Instalação manual

1. Dê duplo clique em `INSTALAR-AGENTE.cmd`. Como alternativa, abra PowerShell nesta pasta e execute `powershell -ExecutionPolicy Bypass -File .\install-windows.ps1`.
2. A página http://127.0.0.1:17871/ abrirá mostrando o código de pareamento.
3. No X Burguer Central, abra Configurações → Impressoras → Gerenciar agente.
4. Informe o código de pareamento.
5. Mapeie cada destino lógico para uma impressora física.

## Segurança

- não existem tokens ou credenciais no GitHub;
- o token é gerado localmente na primeira execução;
- requisições protegidas exigem X-XB-Print-Token;
- CORS aceita apenas o GitHub Pages oficial e origens locais;
- o agente não escuta na rede LAN, somente no próprio computador.

## Dados locais

Configuração, fila e logs ficam em:
%APPDATA%\X Burguer Central\Print Agent

## Limitações da ETAPA 1

O modo silencioso é focado em térmicas ESC/POS de 58/80 mm. A4 continua disponível no modo de impressão do navegador. Não houve validação física com todos os modelos de impressoras; teste o perfil antes de ativar automações.

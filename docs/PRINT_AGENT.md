# Print Agent — ETAPA 1

## Visão geral

A ETAPA 1 adiciona uma ponte local entre o X Burguer Central e as impressoras térmicas do Windows.

Quando o agente está instalado, pareado e o destino lógico está mapeado para uma impressora física, o sistema envia o job diretamente para a fila do Windows sem abrir a aba de impressão do navegador.

## Componentes

- `assets/js/print-agent-client.js`: comunicação segura entre o painel web e o agente local.
- `apps/print-agent/server.mjs`: API local, fila, retry, logs e descoberta de impressoras.
- `apps/print-agent/lib/agent-core.mjs`: renderização RAW/ESC-POS.
- `apps/print-agent/scripts/raw-print.ps1`: ponte com o spooler RAW do Windows.
- `apps/print-agent/install-windows.ps1`: instalação/inicialização local.

## Fluxo

1. Pedido muda de etapa.
2. O roteamento identifica os destinos configurados.
3. Cada destino precisa ter uma impressora física mapeada.
4. O navegador envia um job estruturado ao agente em `127.0.0.1:17871`.
5. O agente grava o job na fila local.
6. O agente converte o documento em ESC/POS.
7. O spooler do Windows recebe os bytes RAW.
8. Em erro, o agente tenta novamente até 3 vezes.
9. Jobs com falha permanecem disponíveis para nova tentativa.

Se o agente estiver temporariamente offline, o navegador mantém uma pequena outbox local e tenta reenviar quando o agente voltar.

## Segurança

- O agente escuta somente em `127.0.0.1`, não na rede local.
- O pareamento usa um código de 6 dígitos exibido localmente.
- Após o pareamento, o navegador recebe um token local.
- O token é enviado no header `X-XB-Print-Token`.
- O token não é versionado e é removido de backups exportados.
- A URL do agente é restrita a `localhost` ou `127.0.0.1`.
- CORS permite apenas o GitHub Pages oficial do projeto e origens locais de desenvolvimento.

## Instalação da ETAPA 1

Pré-requisitos:
- Windows 10/11;
- Node.js 20 LTS ou superior;
- impressora térmica 58/80 mm instalada no Windows;
- suporte da impressora a RAW/ESC-POS.

Procedimento:
1. Obter a pasta `apps/print-agent` deste repositório.
2. Dar duplo clique em `INSTALAR-AGENTE.cmd` (ou executar o `install-windows.ps1` pelo PowerShell).
3. O navegador abrirá `http://127.0.0.1:17871/`.
4. Copiar o código de pareamento exibido.
5. No X Burguer Central: **Configurações → Impressoras → Gerenciar**.
6. Conectar o agente com o código.
7. Em cada destino, mapear a impressora física do Windows.
8. Executar uma impressão de teste.
9. Somente depois ativar os eventos automáticos desejados.

## Impressoras suportadas nesta etapa

A impressão silenciosa é focada em térmicas ESC/POS 58/80 mm. Muitas Epson, Elgin, Bematech e compatíveis trabalham nesse modelo, mas o comportamento depende do driver/firmware.

A4 e impressoras que não aceitam RAW/ESC-POS não fazem parte da impressão silenciosa da ETAPA 1.

## Limites conhecidos

- Não foi executado teste físico neste ambiente com uma impressora real.
- A versão inicial translitera caracteres acentuados no RAW para aumentar compatibilidade entre firmwares.
- Ainda não existe instalador `.exe` assinado; a instalação atual usa PowerShell + Node.js.
- Ainda não há servidor central: fila e mapeamento são locais a este computador.

A próxima evolução é empacotar o agente como aplicativo Windows e, depois, conectar a fila ao backend central.

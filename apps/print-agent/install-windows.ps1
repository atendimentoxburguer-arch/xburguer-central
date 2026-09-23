param([switch]$NoStartup)
$ErrorActionPreference="Stop"
$AgentDir=Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "X Burguer Central - Instalacao do Print Agent" -ForegroundColor Cyan
$node=Get-Command node -ErrorAction SilentlyContinue
if(-not $node){ throw "Node.js 20 ou superior nao foi encontrado. Instale Node.js LTS antes de continuar." }
$versionText=& node -p "process.versions.node"
$major=[int]($versionText.Split('.')[0])
if($major -lt 20){ throw "Node.js 20+ necessario. Versao atual: $versionText" }

if(-not $NoStartup){
  $startup=[Environment]::GetFolderPath("Startup")
  $shortcutPath=Join-Path $startup "X Burguer Print Agent.lnk"
  $wsh=New-Object -ComObject WScript.Shell
  $shortcut=$wsh.CreateShortcut($shortcutPath)
  $shortcut.TargetPath=$node.Source
  $shortcut.Arguments='"' + (Join-Path $AgentDir 'server.mjs') + '"'
  $shortcut.WorkingDirectory=$AgentDir
  $shortcut.WindowStyle=7
  $shortcut.Description="X Burguer Central Print Agent"
  $shortcut.Save()
  Write-Host "Inicializacao automatica configurada." -ForegroundColor Green
}

Start-Process -FilePath $node.Source -ArgumentList ('"' + (Join-Path $AgentDir 'server.mjs') + '"') -WorkingDirectory $AgentDir
Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:17871/"
Write-Host "Agente iniciado. A pagina local exibira o codigo de pareamento." -ForegroundColor Green

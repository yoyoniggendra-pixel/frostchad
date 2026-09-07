Set-Location $PSScriptRoot
if (!(Test-Path node_modules)) { npm install }
Start-Process powershell -ArgumentList '-NoExit','-Command','npm start' -WorkingDirectory $PSScriptRoot
Start-Sleep -Seconds 3
Start-Process 'http://127.0.0.1:3000'

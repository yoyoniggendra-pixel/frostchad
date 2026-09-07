@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing Frostlink dependencies...
  call npm install
)
start "FROSTLINK SERVER" cmd /k "npm start"
timeout /t 3 >nul
start http://127.0.0.1:3000

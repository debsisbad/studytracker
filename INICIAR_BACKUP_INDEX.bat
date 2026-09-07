@echo off
cd /d "%~dp0"
title Backup automatico - index.html
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0watch-index.ps1"
pause

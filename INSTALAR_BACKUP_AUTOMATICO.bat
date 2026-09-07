@echo off
setlocal
cd /d "%~dp0"

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET=%STARTUP%\Study Tracker - Backup Index.bat"

(
  echo @echo off
  echo start "" /min powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File "%~dp0watch-index.ps1"
) > "%TARGET%"

echo.
echo Backup automatico configurado para iniciar com o Windows.
echo Arquivo criado em:
echo %TARGET%
echo.
echo Para testar agora, execute INICIAR_BACKUP_INDEX.bat
echo.
pause

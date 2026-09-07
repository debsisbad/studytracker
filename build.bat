@echo off
setlocal
cd /d "%~dp0"

title Atualizar Study Tracker

echo ========================================
echo        ATUALIZAR STUDY TRACKER
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERRO: Node.js nao foi encontrado.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo ERRO: npm nao foi encontrado.
  pause
  exit /b 1
)

if not exist "%~dp0package.json" (
  echo ERRO: package.json nao encontrado nesta pasta.
  pause
  exit /b 1
)

for /f "delims=" %%V in ('node -p "require('./package.json').version"') do set "OLD_VERSION=%%V"

echo Versao atual: %OLD_VERSION%
echo.
echo Criando nova versao...

call npm version major --no-git-tag-version
if errorlevel 1 (
  echo.
  echo ERRO: nao foi possivel atualizar a versao.
  pause
  exit /b 1
)

for /f "delims=" %%V in ('node -p "require('./package.json').version"') do set "NEW_VERSION=%%V"

echo.
echo Nova versao: %NEW_VERSION%
echo Sincronizando versao com o GitHub/PWA...

call npm run sync-version
if errorlevel 1 (
  echo.
  echo ERRO: nao foi possivel sincronizar version.json/service-worker.js.
  call npm version %OLD_VERSION% --no-git-tag-version --allow-same-version >nul 2>&1
  call npm run sync-version >nul 2>&1
  pause
  exit /b 1
)

echo.
echo Limpando builds antigos para economizar espaco...
if exist "%~dp0dist" rmdir /s /q "%~dp0dist"

echo.
echo Gerando SOMENTE o instalador do Windows...
echo Nao sera criado executavel portable.
echo.

call npm run dist
if errorlevel 1 (
  echo.
  echo ========================================
  echo O BUILD FALHOU.
  echo Restaurando a versao %OLD_VERSION%...
  echo ========================================
  call npm version %OLD_VERSION% --no-git-tag-version --allow-same-version >nul 2>&1
  call npm run sync-version >nul 2>&1
  echo.
  echo A versao foi restaurada para %OLD_VERSION%.
  echo Veja a mensagem de erro acima.
  pause
  exit /b 1
)

rem win-unpacked e apenas uma pasta intermediaria.
rem Depois que o instalador foi criado, podemos remove-la.
if exist "%~dp0dist\win-unpacked" rmdir /s /q "%~dp0dist\win-unpacked"

rem Arquivos de diagnostico nao sao necessarios para instalar/atualizar.
if exist "%~dp0dist\builder-debug.yml" del /q "%~dp0dist\builder-debug.yml"
if exist "%~dp0dist\builder-effective-config.yaml" del /q "%~dp0dist\builder-effective-config.yaml"
if exist "%~dp0dist\builder-effective-config.yml" del /q "%~dp0dist\builder-effective-config.yml"

set "INSTALLER=%~dp0dist\Study Tracker Setup %NEW_VERSION%.exe"

echo.
echo ========================================
echo BUILD CONCLUIDO COM SUCESSO
echo Versao: %NEW_VERSION%
echo ========================================
echo.
echo A pasta dist agora mantem apenas o necessario.
echo O instalador Electron ainda tera cerca de 70-80 MB,
echo pois ele inclui o Chromium/Node.
echo.

if exist "%INSTALLER%" (
  echo Abrindo o instalador...
  start "" "%INSTALLER%"
) else (
  echo O build terminou, mas nao encontrei:
  echo "%INSTALLER%"
  echo.
  echo Abrindo a pasta dist.
  start "" "%~dp0dist"
  pause
)

exit /b 0

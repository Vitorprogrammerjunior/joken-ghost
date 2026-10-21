@echo off
echo ==========================================
echo   JokenGhost - Caçada em Turnos
echo ==========================================
echo.
echo Verificando dependências...

REM Verifica se Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python não encontrado! 
    echo Por favor, instale Python 3.8+ em https://python.org
    pause
    exit /b 1
)

REM Instala pygame se não estiver instalado
echo Verificando Pygame...
python -c "import pygame" >nul 2>&1
if errorlevel 1 (
    echo 📦 Instalando Pygame...
    pip install pygame
)

echo ✅ Dependências verificadas!
echo.
echo 🎮 Iniciando JokenGhost...
echo.
python jokenghost.py

pause

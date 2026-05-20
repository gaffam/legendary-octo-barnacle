@echo off
chcp 65001 >nul
title Atelier - Kurulum
color 0E
echo.
echo   ╔═══════════════════════════════════════════════════╗
echo   ║                                                   ║
echo   ║          Atelier — Kurulum                        ║
echo   ║          Kisisel yazi atolyesi                    ║
echo   ║                                                   ║
echo   ╚═══════════════════════════════════════════════════╝
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo   [HATA] Node.js bulunamadi.
    echo.
    echo   Lutfen once https://nodejs.org/ adresinden Node.js LTS surumunu indirin.
    echo.
    pause
    exit /b 1
)

echo   Node.js bulundu:
node --version
echo.

echo   Bagimliliklar yukleniyor (3-5 dakika surebilir)...
echo.
call npm install
if errorlevel 1 (
    echo.
    echo   [HATA] npm install basarisiz oldu.
    pause
    exit /b 1
)

echo.
echo   ╔═══════════════════════════════════════════════════╗
echo   ║   Kurulum tamamlandi.                             ║
echo   ║                                                   ║
echo   ║   Calistirmak icin: calistir.bat                  ║
echo   ║   EXE olusturmak icin: exe-olustur.bat            ║
echo   ╚═══════════════════════════════════════════════════╝
echo.
pause

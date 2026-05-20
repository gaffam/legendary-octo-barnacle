@echo off
chcp 65001 >nul
title Atelier - EXE Olustur
color 0A
echo.
echo   Atelier kurulum dosyasi (.exe) olusturuluyor...
echo   Bu islem 2-4 dakika surebilir.
echo.
call npm run dist:win
if errorlevel 1 (
    echo.
    echo   [HATA] Olusturma basarisiz oldu.
    pause
    exit /b 1
)

echo.
echo   ╔════════════════════════════════════════════════════════╗
echo   ║   EXE olusturuldu!                                     ║
echo   ║                                                        ║
echo   ║   Dosya konumu: release\Atelier Setup 1.0.0.exe        ║
echo   ║                                                        ║
echo   ║   Cift tiklayarak Windows'a kurabilirsiniz.            ║
echo   ╚════════════════════════════════════════════════════════╝
echo.

start "" "release"
pause

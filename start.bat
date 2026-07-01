@echo off
title PustakaPOS - Cover Processor + Next.js

echo ============================================
echo   PustakaPOS - Image Service + Next.js
echo ============================================
echo.
echo Image Service  : http://127.0.0.1:8000
echo Next.js        : http://127.0.0.1:3000
echo.
echo Press Ctrl+C di jendela mana pun untuk stop
echo ============================================
echo.

:: Buka dua terminal
start "Image Service" cmd /k "cd /d D:\pustaka-pos\image-service && python main.py"
timeout /t 3 /nobreak >nul
start "Next.js Dev" cmd /k "cd /d D:\pustaka-pos && npm run dev"

echo.
echo Kedua service sudah jalan! Buka http://localhost:3000
echo.
pause

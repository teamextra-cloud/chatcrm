@echo off
echo ==========================
echo Starting ChatCRM System
echo ==========================

echo.
echo Starting Next.js Dashboard...
start cmd /k "cd /d C:\dev\chatcrm-v1\dashboard && npm run dev"

timeout /t 2 >nul

echo.
echo Starting Webhook Server...
start cmd /k "cd /d C:\dev\chatcrm-v1\server && node server.js"

timeout /t 2 >nul

echo.
echo Starting ngrok tunnel...
start cmd /k "C:\dev\ngrok\ngrok.exe http 4000"

echo.
echo ChatCRM is starting...
pause
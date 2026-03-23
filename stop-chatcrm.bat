@echo off
echo ==========================
echo Stopping ChatCRM
echo ==========================

echo Killing Node processes...
taskkill /F /IM node.exe >nul 2>&1

echo Killing ngrok...
taskkill /F /IM ngrok.exe >nul 2>&1

echo Done.
pause
@echo off
:menu
cls
echo ==========================
echo ChatCRM Dev Tools
echo ==========================
echo.
echo 1 Start ChatCRM
echo 2 Stop ChatCRM
echo 3 Restart ChatCRM
echo 4 Open Dashboard
echo 5 Exit
echo.
set /p choice=Select option:

if "%choice%"=="1" call start-chatcrm.bat
if "%choice%"=="2" call stop-chatcrm.bat
if "%choice%"=="3" (
    call stop-chatcrm.bat
    call start-chatcrm.bat
)
if "%choice%"=="4" start http://localhost:3000
if "%choice%"=="5" exit

goto menu
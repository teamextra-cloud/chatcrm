@echo off
echo ==========================
echo PANIC RESET
echo ==========================
echo Restoring last checkpoint...
echo.

cd /d C:\dev\chatcrm-v1

git reset --hard HEAD

echo.
echo Project restored successfully
pause
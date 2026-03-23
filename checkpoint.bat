@echo off
echo ==========================
echo Creating Safe Checkpoint
echo ==========================

cd /d C:\dev\chatcrm-v1

git add .

git commit -m "checkpoint: %date% %time%"

echo.
echo Checkpoint created successfully
echo.
pause
@echo off
echo ==========================
echo AI SAFE EDIT MODE
echo ==========================
echo Creating checkpoint before AI changes...
echo.

cd /d C:\dev\chatcrm-v1

git add .
git commit -m "AI checkpoint: %date% %time%"

echo.
echo Opening project in Cursor...
echo.

start cursor .

echo.
echo AI Safe Mode Ready
pause
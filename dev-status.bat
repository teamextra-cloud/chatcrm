@echo off
echo ==========================
echo ChatCRM Dev Status
echo ==========================

cd /d C:\dev\chatcrm-v1

echo.
echo Git Status
git status

echo.
echo Recent Commits
git log --oneline -5

echo.
pause
@echo off
cd /d "%~dp0"
where node >nul 2>&1 || (echo Install Node.js 22 LTS first: https://nodejs.org/ & pause & exit /b 1)
echo Open http://localhost:8787 in your browser.
node src\local.js
pause

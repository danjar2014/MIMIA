@echo off
cd /d "%~dp0"
start "" http://localhost:8082
python -m http.server 8082 2>nul || npx --yes serve -l 8082 .

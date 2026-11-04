@echo off
rem Spusteni aplikace ze zdrojoveho kodu (potrebuje Python 3.10+ z python.org)
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
  echo Python neni nainstalovany. Stahni ho z https://www.python.org/downloads/
  echo Pri instalaci zaskrtni "Add python.exe to PATH".
  pause
  exit /b 1
)
if not exist ".venv\Scripts\pythonw.exe" (
  echo Prvni spusteni - instaluji knihovny, chvili to potrva...
  py -3 -m venv .venv || goto :err
  ".venv\Scripts\python.exe" -m pip install --upgrade pip >nul
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt || goto :err
)
start "" ".venv\Scripts\pythonw.exe" app.py
exit /b 0
:err
echo Instalace selhala.
pause
exit /b 1

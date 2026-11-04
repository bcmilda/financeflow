@echo off
rem Sestavi samostatny ChromeMultiProfile.exe do slozky dist\
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" py -3 -m venv .venv
".venv\Scripts\python.exe" -m pip install -r requirements.txt pyinstaller || goto :err
".venv\Scripts\pyinstaller.exe" --noconfirm --onefile --windowed --name ChromeMultiProfile app.py || goto :err
echo.
echo Hotovo: dist\ChromeMultiProfile.exe
pause
exit /b 0
:err
echo Sestaveni selhalo.
pause
exit /b 1

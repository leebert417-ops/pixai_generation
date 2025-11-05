@echo off
echo ========================================
echo Deploy PixAI Extension to SillyTavern
echo ========================================
echo.

set DEST=D:\vpnapps\jiuguan\SillyTavern-Launcher\SillyTavern\public\scripts\extensions\third-party\pixai_generation

echo Copying files...
copy /Y index.js "%DEST%\index.js"
copy /Y settings.html "%DEST%\settings.html"
copy /Y manifest.json "%DEST%\manifest.json"
copy /Y style.css "%DEST%\style.css"

echo.
echo Done! Please refresh SillyTavern browser (Ctrl+Shift+R)
echo.
pause


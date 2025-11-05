@echo off
chcp 65001 >nul
echo ========================================
echo   ?? PixAI ????? (Node.js)
echo ========================================
echo.

REM ?? Node.js
set NODE_PATH=
where node >nul 2>&1
if %errorlevel% equ 0 (
    set NODE_PATH=node
    goto :found_node
)

REM ?? SillyTavern ? Node.js
if exist "D:\vpnapps\jiuguan\SillyTavern-Launcher\app-win\node.exe" (
    set NODE_PATH=D:\vpnapps\jiuguan\SillyTavern-Launcher\app-win\node.exe
    goto :found_node
)

echo  ??? Node.js?
echo ?????? Node.js ? SillyTavern
pause
exit /b 1

:found_node
echo  ?? Node.js: %NODE_PATH%
echo.
echo ?????????...
echo.

"%NODE_PATH%" "%~dp0pixai_proxy.js"

pause

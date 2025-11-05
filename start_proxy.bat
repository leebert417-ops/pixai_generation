@echo off
echo ========================================
echo PixAI 代理服务器启动脚本
echo ========================================
echo.

REM 检查 Python 是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python！
    echo 请先安装 Python 3.7 或更高版本
    pause
    exit /b 1
)

REM 检查并安装依赖
echo [1/3] 检查依赖...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo [安装] Flask...
    pip install flask
)

pip show flask-cors >nul 2>&1
if errorlevel 1 (
    echo [安装] Flask-CORS...
    pip install flask-cors
)

pip show requests >nul 2>&1
if errorlevel 1 (
    echo [安装] Requests...
    pip install requests
)

echo.
echo [2/3] 启动代理服务器...
echo.

REM 启动代理服务器
python pixai_proxy.py

pause


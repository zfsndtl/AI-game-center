@echo off
REM ============================================================
REM  Gomoku - Local HTTP Server Launcher
REM  Opens: http://localhost:8080/
REM  Usage: Double-click to run, or run from cmd
REM ============================================================

cd /d "%~dp0"

echo.
echo ============================================
echo    Gomoku - Starting Local Server
echo ============================================
echo.
echo    Serving folder: %cd%
echo.
echo    Open the following URL in multiple browser tabs:
echo      http://localhost:8080/
echo.
echo    Tip: One tab clicks "Create Room" to get a 4-digit code.
echo         Other tabs click "Join Room" and enter the same code.
echo.
echo    Press Ctrl+C to stop the server.
echo ============================================
echo.

where python >nul 2>nul
if %errorlevel%==0 (
    python -m http.server 8080
    goto :end
)

echo Python not found. Trying PowerShell...
powershell -NoProfile -ExecutionPolicy Bypass -Command "cd '%cd%'; $listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:8080/'); $listener.Start(); Write-Host 'Server running at http://localhost:8080/'; while($listener.IsListening){$c=$listener.GetContext();$u=$c.Request.Url.AbsolutePath;if($u -eq '/' -or $u -eq ''){$u='/index.html'};$fp=Join-Path (Get-Location).Path $u.TrimStart('/');if(Test-Path $fp -PathType Leaf){$ext=[System.IO.Path]::GetExtension($fp).ToLower();$ct=switch($ext){'.html'{'text/html; charset=utf-8'}'.css'{'text/css; charset=utf-8'}'.js'{'application/javascript; charset=utf-8'}default{'application/octet-stream'}};$c.Response.ContentType=$ct;$b=[System.IO.File]::ReadAllBytes($fp);$c.Response.ContentLength64=$b.Length;$c.Response.OutputStream.Write($b,0,$b.Length);$c.Response.Close();Write-Host ('200 '+$u)}else{$c.Response.StatusCode=404;$b=[System.Text.Encoding]::UTF8.GetBytes('Not Found: '+$u);$c.Response.ContentLength64=$b.Length;$c.Response.OutputStream.Write($b,0,$b.Length);$c.Response.Close();Write-Host ('404 '+$u)}}"
if errorlevel 1 (
    echo.
    echo    [ERROR] Cannot start server.
    echo    Please install Python 3 from: https://www.python.org/
    echo    Then re-run this script.
    echo.
    pause
)
:end

@echo off
REM Build the Python backend and React frontend on Windows.
REM Usage: build.cmd
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build.ps1"

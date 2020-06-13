@echo off

:: PS1-Skripte werden nicht automatisch ausgeführt
:: --> PS1-Skript über Batch-Datei starten

pushd %~dp0
@powershell.exe -ExecutionPolicy Bypass -NoLogo -NonInteractive -NoProfile -WindowStyle Hidden -File ".\chromium-download-policy.ps1"

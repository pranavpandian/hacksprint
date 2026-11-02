@echo off
setlocal
where ollama >nul 2>nul
if errorlevel 1 (
  echo Ollama is not installed. Install Ollama for Windows first, then rerun this script.
  echo This script only downloads the model after you launch it.
  pause
  exit /b 1
)
echo This downloads local models for the assistant and screen reader:
echo   qwen2.5:1.5b-instruct
echo   qwen3-vl:2b
echo They run locally after download. No cloud AI service is used.
choice /m "Download the model now"
if errorlevel 2 exit /b 0
ollama pull qwen2.5:1.5b-instruct
if errorlevel 1 exit /b 1
ollama pull qwen3-vl:2b
if errorlevel 1 exit /b 1
echo Model ready. Start BridgeUX and open the Screen helper section.
pause

@echo off
setlocal
where ollama >nul 2>nul
if errorlevel 1 (
  echo Ollama is not installed. Install Ollama for Windows first, then rerun this script.
  echo This script only downloads the model after you launch it.
  pause
  exit /b 1
)
echo This downloads the local assistant, screen vision, and ASL demo model:
echo   hf.co/gguf/Qwen3.5-4B-GGUF:Q4_K_M
echo They run locally after download. No cloud AI service is used.
choice /m "Download the model now"
if errorlevel 2 exit /b 0
ollama pull hf.co/gguf/Qwen3.5-4B-GGUF:Q4_K_M
if errorlevel 1 exit /b 1
echo Model ready. Start BridgeUX and open the Screen helper section.
pause

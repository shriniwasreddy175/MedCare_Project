@echo off
echo ======================================
echo 🛑 Stopping MedCare Project
echo ======================================

:: Kill Flask backend (python)
taskkill /F /IM python.exe >nul 2>&1

:: Kill Vite frontend (node)
taskkill /F /IM node.exe >nul 2>&1

echo ======================================
echo ✅ MedCare Project stopped successfully!
echo ======================================
pause

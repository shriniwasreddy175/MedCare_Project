@echo off
echo ======================================
echo 🔄 Restarting MedCare Project
echo ======================================

:: Kill Flask backend (python)
taskkill /F /IM python.exe >nul 2>&1

:: Kill Vite frontend (node)
taskkill /F /IM node.exe >nul 2>&1

echo ✅ Old processes stopped.
echo --------------------------------------

:: Start backend (Flask API)
start cmd /k "cd /d backend && venv\Scripts\activate && python app.py"

:: Wait a little to make sure backend starts
timeout /t 3 >nul

:: Start frontend (Vite React app)
start cmd /k "cd /d frontend && npm run dev"

echo ✅ MedCare Project restarted successfully!
echo ======================================
pause

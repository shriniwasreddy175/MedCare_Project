@echo off
echo ======================================
echo 🚀 Starting MedCare Project
echo ======================================

:: Start Backend
echo [1/2] Starting Backend (Flask)...
cd /d C:\MedCare_Project\backend
call venv\Scripts\activate
start cmd /k "python app.py"

:: Start Frontend
echo [2/2] Starting Frontend (React + Vite)...
cd /d C:\MedCare_Project\frontend
start cmd /k "npm run dev"

echo ======================================
echo ✅ MedCare Project is now running!
echo Backend:  http://127.0.0.1:5000/
echo Frontend: http://localhost:5173/
echo ======================================

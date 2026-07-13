# Script de inicio para desarrollo local de la Web Robusta (Backend & Frontend)

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Levantando Esqueleto de Web de Alto Rendimiento  " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Configurar Backend (Python)
Write-Host "`n[1/4] Configurando Backend (Python)..." -ForegroundColor Yellow
cd backend

if (-not (Test-Path ".venv")) {
    Write-Host "Creando entorno virtual (.venv)..." -ForegroundColor Cyan
    python -m venv .venv
}

Write-Host "Instalando dependencias de Python..." -ForegroundColor Cyan
& .venv\Scripts\pip install -r requirements.txt

cd ..

# 2. Configurar Frontend (Vite + React)
Write-Host "`n[2/4] Configurando Frontend (Node.js)..." -ForegroundColor Yellow
cd frontend

if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias de npm (esto puede tomar un momento)..." -ForegroundColor Cyan
    npm install
}

cd ..

# 3. Lanzar Backend en segundo plano (nueva ventana de consola)
Write-Host "`n[3/4] Lanzando Servidor Backend (FastAPI en Puerto 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .venv\Scripts\activate; uvicorn app.main:app --reload --port 8000" -WindowStyle Normal

# 4. Lanzar Frontend en segundo plano (nueva ventana de consola)
Write-Host "`n[4/4] Lanzando Servidor Frontend (Vite en Puerto 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WindowStyle Normal

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host " ¡Todo listo!" -ForegroundColor Green
Write-Host " Backend corriendo en: http://localhost:8000" -ForegroundColor Cyan
Write-Host " Documentación interactiva (Swagger): http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host " Frontend corriendo en: http://localhost:5173" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Green
Write-Host "Las consolas del Backend y Frontend se abrieron en ventanas separadas." -ForegroundColor White
Write-Host "Cierra esas ventanas o presiona Ctrl+C en ellas para detener los servidores." -ForegroundColor White

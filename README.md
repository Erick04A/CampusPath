# CampusPath - Plataforma de Movilidad Colaborativa UDLA

CampusPath es la plataforma de movilidad sustentable y compartida para la comunidad de la Universidad de las Américas (UDLA) en Ecuador. Permite conectar a estudiantes, docentes y personal administrativo para compartir traslados entre los tres campus principales en Quito: UDLAPARK, Granados y Colón.

## Características Principales

- **Inicio de Sesión Institucional**: Acceso restringido exclusivamente a correos con dominio `@udla.edu.ec` y `@udla.ec`.
- **Rideshare Activo**: Panel para buscar y programar viajes compartidos en tiempo real.
- **Chat Interactivo**: Mensajería directa e integrada con respuestas del conductor simuladas.
- **Mapas de Densidad y Clima**: Integración con mapas reales de Leaflet y obtención dinámica del clima en Quito a través de Open-Meteo API.
- **Tracker de Sostenibilidad**: Registro del ahorro económico mensual e impacto ambiental en kg de CO2 evitados.
- **Protocolos de Seguridad**: Centro de soporte activo, reportes de incidentes en ruta y directorio telefónico de emergencia UDLA.

## Estructura del Proyecto

```text
├── backend/            # Servidor API desarrollado en Python con FastAPI
├── frontend/           # Aplicación web interactiva desarrollada con React, TypeScript y Vite
└── run_dev.ps1         # Script para ejecución local simultánea
```

## Requisitos Previos

- **Node.js** (versión 18 o superior)
- **Python** (versión 3.10 o superior)
- **Git**

## Configuración y Ejecución Local

### Ejecución Automática (Recomendado)

En una terminal de PowerShell con privilegios de ejecución, corre el siguiente script en la raíz del proyecto para iniciar ambos servicios automáticamente:

```powershell
./run_dev.ps1
```

### Ejecución Manual

#### Backend

1. Ingresa a la carpeta del servidor:
   ```bash
   cd backend
   ```
2. Crea e inicia un entorno virtual:
   ```bash
   python -m venv .venv
   # En Windows:
   .venv\Scripts\activate
   # En macOS/Linux:
   source .venv/bin/activate
   ```
3. Instala las dependencias y ejecuta el servidor de desarrollo:
   ```bash
   pip install -r requirements.txt
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

#### Frontend

1. Ingresa a la carpeta del cliente:
   ```bash
   cd frontend
   ```
2. Instala las dependencias e inicia el servidor de desarrollo Vite:
   ```bash
   npm install
   npm run dev -- --host 127.0.0.1
   ```
3. Abre [http://127.0.0.1:5173/](http://127.0.0.1:5173/) en tu navegador.

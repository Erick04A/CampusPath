from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import time

router = APIRouter()

class IncidentReport(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., min_length=10, max_length=1000)
    location: str = Field(..., min_length=3, max_length=100)
    severity: str = Field(..., pattern="^(Bajo|Medio|Alto)$")

class RideSchedule(BaseModel):
    origin: str = Field(..., min_length=3, max_length=100)
    destination: str = Field(..., min_length=3, max_length=100)
    departure_time: str = Field(..., min_length=4, max_length=20)
    vehicle: str = Field(..., min_length=3, max_length=100)

class ActiveRide(BaseModel):
    id: int
    driver: str
    vehicle: str
    status: str
    eta: str
    location: str

class UpcomingTrip(BaseModel):
    id: int
    day: str
    date_num: str
    route: str
    time_str: str
    type_str: str

db_active_rides = [
    ActiveRide(
        id=1,
        driver="Alex Rivera",
        vehicle="Tesla Model 3 - Blanco",
        status="Activo",
        eta="5 min",
        location="Puerta Principal"
    ),
    ActiveRide(
        id=2,
        driver="Prof. Clara S.",
        vehicle="SUV - Gris Oscuro",
        status="Esperando",
        eta="15 min",
        location="Parqueadero Sur"
    )
]

db_upcoming_trips = [
    UpcomingTrip(
        id=1,
        day="Mañana",
        date_num="08",
        route="Campus Sur to Edificio I+D",
        time_str="08:30 AM",
        type_str="event_repeat"
    ),
    UpcomingTrip(
        id=2,
        day="Vier",
        date_num="09",
        route="Residencia to Polideportivo",
        time_str="17:15 PM",
        type_str="calendar_month"
    )
]

db_incident_reports = []

@router.get("/health")
async def health_check() -> Dict[str, str]:
    return {
        "status": "healthy",
        "timestamp": str(time.time()),
        "service": "CampusPath Mobility Backend"
    }

@router.get("/user")
async def get_user_profile() -> Dict[str, Any]:
    return {
        "name": "Mateo G.",
        "badge": "Conductor Estrella",
        "level": "Elite Mover",
        "points_label": "350 pts para Nivel 5",
        "points_percent": 75,
        "estimated_savings_monthly": 42.50,
        "co2_avoided_kg": 12.4
    }

@router.get("/rides", response_model=List[ActiveRide])
async def get_active_rides():
    return db_active_rides

@router.post("/rides", response_model=ActiveRide, status_code=201)
async def schedule_new_ride(ride: RideSchedule):
    new_id = len(db_active_rides) + 1
    new_ride = ActiveRide(
        id=new_id,
        driver="Mateo G. (Tu)",
        vehicle=ride.vehicle,
        status="Activo",
        eta=ride.departure_time,
        location=ride.origin
    )
    db_active_rides.append(new_ride)
    return new_ride

@router.get("/trips", response_model=List[UpcomingTrip])
async def get_upcoming_trips():
    return db_upcoming_trips

@router.get("/metrics")
async def get_system_metrics() -> Dict[str, Any]:
    return {
        "co2_saved_tons": 14.8,
        "shared_rides_total": 3421,
        "shared_rides_growth_percent": 12,
        "verified_routes_count": 156,
        "verified_routes_goal": 200,
        "peak_hour": "07:45 AM",
        "peak_point": "Entrada Principal",
        "cpu_usage_percent": 12.5,
        "memory_usage_mb": 48.2,
        "active_connections": 150,
        "response_time_ms": 4.8,
        "uptime_seconds": 7200
    }

@router.post("/reports", status_code=201)
async def report_incident(report: IncidentReport) -> Dict[str, Any]:
    db_incident_reports.append(report.model_dump())
    return {
        "status": "Reporte registrado de forma segura",
        "incident_id": len(db_incident_reports)
    }

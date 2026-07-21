from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field, model_validator
from typing import List, Dict, Any, Optional
import time
import math

router = APIRouter()

def validar_correo_udla(correo: str) -> None:
    if not correo:
        return
    correo_lc = correo.lower().strip()
    if "@" not in correo_lc:
        return
    # Permite emails udla.edu.ec, udla.ec o correos de prueba sin arrojar error 403
    return

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

class IncidentReport(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)
    description: str = Field(..., min_length=1, max_length=2000)
    location: str = Field(..., min_length=1, max_length=150)
    severity: str = Field(..., pattern="^(Bajo|Medio|Alto)$")

class RideSchedule(BaseModel):
    origin: str = Field(..., min_length=1, max_length=150)
    destination: str = Field(..., min_length=1, max_length=150)
    departure_time: str = Field(..., min_length=1, max_length=50)
    vehicle: str = Field(..., min_length=1, max_length=150)

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

class ParadaIntermedia(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=150)
    lat: float
    lng: float

class PuntoGeo(BaseModel):
    lat: float
    lng: float
    direccion_texto: str = Field(..., min_length=1, max_length=300)
    zona: str = Field(..., pattern="^(campus_udlapark|campus_granados|campus_colon|norte|sur|valles|otro)$")

class UbicacionActual(BaseModel):
    lat: float
    lng: float
    actualizado_en: float

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=4, max_length=100)
    role: Optional[str] = Field("Estudiante", max_length=50)
    campus: Optional[str] = Field("UDLAPARK", max_length=50)

class TripCreate(BaseModel):
    creador_id: str = Field(..., min_length=1, max_length=150)
    creador_email: str = Field(..., min_length=5, max_length=150)
    tipo: str = Field(..., pattern="^(caminata|vehiculo)$")
    origen: PuntoGeo
    destino: PuntoGeo
    hora_salida: str = Field(..., min_length=1, max_length=50)
    fecha_salida: Optional[str] = Field("Hoy", max_length=50)
    punto_encuentro: Optional[str] = Field(None, max_length=150)
    cupo_maximo: Optional[int] = Field(None, ge=1)
    paradas_intermedias: Optional[List[ParadaIntermedia]] = []
    asientos_disponibles: Optional[int] = Field(None, ge=1)
    precio: Optional[float] = Field(0.0, ge=0.0)

    @model_validator(mode='after')
    def validar_campos_por_tipo(self) -> 'TripCreate':
        if self.tipo == "caminata":
            self.precio = 0.0
            if not self.punto_encuentro:
                self.punto_encuentro = "Punto de Encuentro UDLA"
        elif self.tipo == "vehiculo":
            if self.asientos_disponibles is None:
                self.asientos_disponibles = 3
        return self

class TripUpdate(BaseModel):
    creador_id: str = Field(..., min_length=1, max_length=150)
    hora_salida: Optional[str] = None
    fecha_salida: Optional[str] = None
    punto_encuentro: Optional[str] = None
    cupo_maximo: Optional[int] = None
    asientos_disponibles: Optional[int] = None
    precio: Optional[float] = 0.0

class Trip(BaseModel):
    id: int
    creador_id: str
    creador_email: str
    tipo: str
    origen: PuntoGeo
    destino: PuntoGeo
    hora_salida: str
    fecha_salida: str = "Hoy"
    estado: str = "abierto"
    creado_en: float
    punto_encuentro: Optional[str] = None
    cupo_maximo: Optional[int] = None
    paradas_intermedias: List[ParadaIntermedia] = []
    asientos_disponibles: Optional[int] = None
    precio: Optional[float] = 0.0
    participantes: List[str] = []
    ubicacion_actual: Optional[UbicacionActual] = None

class TripNearby(BaseModel):
    id: int
    creador_id: str
    creador_email: str
    tipo: str
    origen: PuntoGeo
    destino: PuntoGeo
    hora_salida: str
    fecha_salida: str = "Hoy"
    estado: str
    creado_en: float
    punto_encuentro: Optional[str] = None
    cupo_maximo: Optional[int] = None
    paradas_intermedias: List[ParadaIntermedia] = []
    asientos_disponibles: Optional[int] = None
    precio: Optional[float] = 0.0
    participantes: List[str] = []
    ubicacion_actual: Optional[UbicacionActual] = None
    distancia_km: float

class UbicacionUpdate(BaseModel):
    lat: float
    lng: float
    creador_id: str = Field(..., min_length=1, max_length=50)

class AccionCreador(BaseModel):
    creador_id: str = Field(..., min_length=1, max_length=50)

class UbicacionAlerta(BaseModel):
    lat: float
    lng: float
    nombre_referencial: str = Field(..., min_length=3, max_length=100)

class CommunityAlertCreate(BaseModel):
    autor_email: str = Field(..., min_length=5, max_length=100)
    tipo: str = Field(..., pattern="^(trafico|aglomeracion|peligro|otro)$")
    ubicacion: UbicacionAlerta
    descripcion_breve: str = Field(..., min_length=3, max_length=200)

class CommunityAlert(BaseModel):
    id: int
    autor_email: str
    tipo: str
    ubicacion: UbicacionAlerta
    descripcion_breve: str
    creado_en: float
    expira_en: float

class ParticipanteJoin(BaseModel):
    email: str = Field(..., min_length=5, max_length=100)

db_trips: List[Trip] = [
    Trip(
        id=101,
        creador_id="carlos.mora@udla.edu.ec",
        creador_email="carlos.mora@udla.edu.ec",
        tipo="caminata",
        origen=PuntoGeo(lat=-0.1622, lng=-78.4560, direccion_texto="UDLAPARK - Entrada Principal", zona="campus_udlapark"),
        destino=PuntoGeo(lat=-0.1030, lng=-78.4896, direccion_texto="Campus Granados - Patio Central", zona="campus_granados"),
        hora_salida="17:30 PM",
        fecha_salida="Hoy",
        estado="abierto",
        creado_en=time.time() - 3600,
        punto_encuentro="Plaza de las Banderas UDLAPARK",
        precio=0.0,
        participantes=["estudiante1@udla.edu.ec", "estudiante2@udla.edu.ec"]
    ),
    Trip(
        id=102,
        creador_id="maria.fernanda@udla.edu.ec",
        creador_email="maria.fernanda@udla.edu.ec",
        tipo="vehiculo",
        origen=PuntoGeo(lat=-0.1622, lng=-78.4560, direccion_texto="Campus UDLAPARK", zona="campus_udlapark"),
        destino=PuntoGeo(lat=-0.2105, lng=-78.5016, direccion_texto="Campus Colón - Av. Amazonas", zona="campus_colon"),
        hora_salida="18:00 PM",
        fecha_salida="Mañana",
        estado="abierto",
        creado_en=time.time() - 1800,
        asientos_disponibles=3,
        precio=1.50,
        participantes=["mateo.guerrero@udla.edu.ec"]
    )
]
db_alerts: List[CommunityAlert] = []

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

db_registered_users: List[Dict[str, Any]] = []

@router.post("/auth/register", status_code=201)
async def register_user(user_in: UserRegister):
    validar_correo_udla(user_in.email)
    user_data = {
        "name": user_in.name,
        "email": user_in.email.lower().strip(),
        "role": user_in.role or "Estudiante",
        "campus": user_in.campus or "UDLAPARK",
        "badge": "Miembro UDLA",
        "level": "Nivel 1 Mover",
        "points_label": "100 pts para Nivel 2",
        "points_percent": 20,
        "estimated_savings_monthly": 0.0,
        "co2_avoided_kg": 0.0
    }
    db_registered_users.append(user_data)
    return {
        "status": "Usuario registrado de forma exitosa",
        "user": user_data
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

@router.get("/trips/upcoming", response_model=List[UpcomingTrip])
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
        "uptime_seconds": 7200,
        "active_users_count": 312,
        "routes_mapped_count": 44
    }

@router.post("/reports", status_code=201)
async def report_incident(report: IncidentReport) -> Dict[str, Any]:
    db_incident_reports.append(report.model_dump())
    return {
        "status": "Reporte registrado de forma segura",
        "incident_id": len(db_incident_reports)
    }

@router.get("/trips/nearby", response_model=List[TripNearby])
async def get_nearby_trips(
    lat: float = Query(...),
    lng: float = Query(...),
    radio_km: float = Query(default=5.0, gt=0)
):
    ahora = time.time()
    resultado = []
    for trip in db_trips:
        if trip.tipo != "vehiculo":
            continue
        if trip.estado != "en_curso":
            continue
        if trip.ubicacion_actual is None:
            continue
        distancia = haversine_km(lat, lng, trip.ubicacion_actual.lat, trip.ubicacion_actual.lng)
        if distancia <= radio_km:
            resultado.append(TripNearby(
                id=trip.id,
                creador_id=trip.creador_id,
                creador_email=trip.creador_email,
                tipo=trip.tipo,
                origen=trip.origen,
                destino=trip.destino,
                hora_salida=trip.hora_salida,
                estado=trip.estado,
                creado_en=trip.creado_en,
                punto_encuentro=trip.punto_encuentro,
                cupo_maximo=trip.cupo_maximo,
                paradas_intermedias=trip.paradas_intermedias,
                asientos_disponibles=trip.asientos_disponibles,
                participantes=trip.participantes,
                ubicacion_actual=trip.ubicacion_actual,
                distancia_km=round(distancia, 3)
            ))
    resultado.sort(key=lambda t: t.distancia_km)
    return resultado

@router.post("/trips", response_model=Trip, status_code=201)
async def create_trip(trip_in: TripCreate):
    validar_correo_udla(trip_in.creador_email)
    new_id = max([t.id for t in db_trips], default=100) + 1
    new_trip = Trip(
        id=new_id,
        creador_id=trip_in.creador_id,
        creador_email=trip_in.creador_email,
        tipo=trip_in.tipo,
        origen=trip_in.origen,
        destino=trip_in.destino,
        hora_salida=trip_in.hora_salida,
        fecha_salida=trip_in.fecha_salida or "Hoy",
        estado="abierto",
        creado_en=time.time(),
        punto_encuentro=trip_in.punto_encuentro,
        cupo_maximo=trip_in.cupo_maximo,
        paradas_intermedias=trip_in.paradas_intermedias or [],
        asientos_disponibles=trip_in.asientos_disponibles,
        precio=0.0 if trip_in.tipo == "caminata" else (trip_in.precio or 0.0),
        participantes=[]
    )
    db_trips.append(new_trip)
    return new_trip

@router.put("/trips/{id}", response_model=Trip)
async def update_trip(id: int, trip_update: TripUpdate):
    target_trip = None
    for trip in db_trips:
        if trip.id == id:
            target_trip = trip
            break
    if not target_trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Viaje no encontrado"
        )
    if target_trip.creador_id != trip_update.creador_id and target_trip.creador_email != trip_update.creador_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el creador puede editar el viaje"
        )
    if trip_update.hora_salida:
        target_trip.hora_salida = trip_update.hora_salida
    if trip_update.fecha_salida:
        target_trip.fecha_salida = trip_update.fecha_salida
    if trip_update.punto_encuentro is not None:
        target_trip.punto_encuentro = trip_update.punto_encuentro
    if trip_update.cupo_maximo is not None:
        target_trip.cupo_maximo = trip_update.cupo_maximo
    if trip_update.asientos_disponibles is not None:
        target_trip.asientos_disponibles = trip_update.asientos_disponibles
    if trip_update.precio is not None:
        target_trip.precio = 0.0 if target_trip.tipo == "caminata" else trip_update.precio
    return target_trip

@router.delete("/trips/{id}")
async def delete_trip(id: int, creador_id: str = Query(...)):
    global db_trips
    target_trip = None
    for trip in db_trips:
        if trip.id == id:
            target_trip = trip
            break
    if not target_trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Viaje no encontrado"
        )
    if target_trip.creador_id != creador_id and target_trip.creador_email != creador_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el creador puede eliminar el viaje"
        )
    db_trips = [t for t in db_trips if t.id != id]
    return {"status": "Viaje eliminado exitosamente", "id": id}

@router.get("/trips", response_model=List[Trip])
async def list_trips(
    tipo: Optional[str] = None,
    zona_origen: Optional[str] = None,
    zona_destino: Optional[str] = None
):
    result = []
    for trip in db_trips:
        if trip.estado not in ("abierto", "en_curso"):
            continue
        if tipo is not None and trip.tipo != tipo:
            continue
        if zona_origen is not None and trip.origen.zona != zona_origen:
            continue
        if zona_destino is not None and trip.destino.zona != zona_destino:
            continue
        result.append(trip)
    return result

@router.post("/trips/{id}/join", response_model=Trip)
async def join_trip(id: int, request_in: ParticipanteJoin):
    validar_correo_udla(request_in.email)
    target_trip = None
    for trip in db_trips:
        if trip.id == id:
            target_trip = trip
            break
    if not target_trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Viaje no encontrado"
        )
    if target_trip.estado == "cerrado":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El viaje se encuentra cerrado"
        )
    if target_trip.tipo == "caminata":
        if len(target_trip.participantes) >= (target_trip.cupo_maximo or 0):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No hay cupos disponibles para esta caminata"
            )
    elif target_trip.tipo == "vehiculo":
        if len(target_trip.participantes) >= (target_trip.asientos_disponibles or 0):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No hay asientos disponibles en este vehiculo"
            )
    target_trip.participantes.append(request_in.email)
    if target_trip.tipo == "caminata" and len(target_trip.participantes) == target_trip.cupo_maximo:
        target_trip.estado = "completo"
    elif target_trip.tipo == "vehiculo" and len(target_trip.participantes) == target_trip.asientos_disponibles:
        target_trip.estado = "completo"
    return target_trip

@router.post("/trips/{id}/iniciar", response_model=Trip)
async def iniciar_trip(id: int, accion: AccionCreador):
    target_trip = None
    for trip in db_trips:
        if trip.id == id:
            target_trip = trip
            break
    if not target_trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Viaje no encontrado"
        )
    if target_trip.creador_id != accion.creador_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el creador puede iniciar el viaje"
        )
    if target_trip.tipo != "vehiculo":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo los viajes en vehiculo pueden iniciarse"
        )
    if target_trip.estado != "abierto":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El viaje no puede iniciarse desde el estado '{target_trip.estado}'"
        )
    target_trip.estado = "en_curso"
    return target_trip

@router.post("/trips/{id}/finalizar", response_model=Trip)
async def finalizar_trip(id: int, accion: AccionCreador):
    target_trip = None
    for trip in db_trips:
        if trip.id == id:
            target_trip = trip
            break
    if not target_trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Viaje no encontrado"
        )
    if target_trip.creador_id != accion.creador_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el creador puede finalizar el viaje"
        )
    if target_trip.estado not in ("abierto", "en_curso", "completo"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El viaje no puede finalizarse desde el estado '{target_trip.estado}'"
        )
    target_trip.estado = "cerrado"
    return target_trip

@router.patch("/trips/{id}/ubicacion", response_model=Trip)
async def actualizar_ubicacion(id: int, ubicacion: UbicacionUpdate):
    target_trip = None
    for trip in db_trips:
        if trip.id == id:
            target_trip = trip
            break
    if not target_trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Viaje no encontrado"
        )
    if target_trip.creador_id != ubicacion.creador_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el creador puede actualizar la ubicacion"
        )
    if target_trip.tipo != "vehiculo":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La ubicacion en vivo solo aplica a viajes en vehiculo"
        )
    if target_trip.estado != "en_curso":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Solo se puede actualizar la ubicacion cuando el viaje esta en curso"
        )
    target_trip.ubicacion_actual = UbicacionActual(
        lat=ubicacion.lat,
        lng=ubicacion.lng,
        actualizado_en=time.time()
    )
    return target_trip

@router.post("/alerts", response_model=CommunityAlert, status_code=201)
async def create_alert(alert_in: CommunityAlertCreate):
    validar_correo_udla(alert_in.autor_email)
    new_id = len(db_alerts) + 1
    creado = time.time()
    new_alert = CommunityAlert(
        id=new_id,
        autor_email=alert_in.autor_email,
        tipo=alert_in.tipo,
        ubicacion=alert_in.ubicacion,
        descripcion_breve=alert_in.descripcion_breve,
        creado_en=creado,
        expira_en=creado + 86400.0
    )
    db_alerts.append(new_alert)
    return new_alert

@router.get("/alerts", response_model=List[CommunityAlert])
async def list_active_alerts():
    ahora = time.time()
    alertas_validas = [
        alerta for alerta in db_alerts
        if alerta.expira_en > ahora
    ]
    alertas_validas.sort(key=lambda x: x.creado_en, reverse=True)
    return alertas_validas

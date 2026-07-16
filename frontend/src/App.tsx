import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import './App.css';
import { Logo } from './components/Logo';
import { LandingPage } from './components/landing/LandingPage';

interface ActiveRide {
  id: number;
  driver: string;
  vehicle: string;
  location: string;
  eta: string;
  status: string;
}

interface UpcomingTrip {
  id: number;
  day: string;
  date_num: string;
  route: string;
  time_str: string;
  type_str: string;
}

interface UserProfile {
  name: string;
  badge: string;
  level: string;
  points_label: string;
  points_percent: number;
  estimated_savings_monthly: number;
  co2_avoided_kg: number;
}

interface SystemMetrics {
  co2_saved_tons: number;
  shared_rides_total: number;
  shared_rides_growth_percent: number;
  active_users_count: number;
  routes_mapped_count: number;
  verified_routes_count: number;
  verified_routes_goal: number;
  peak_hour: string;
  peak_point: string;
  cpu_usage_percent: number;
  memory_usage_mb: number;
  active_connections: number;
  response_time_ms: number;
  uptime_seconds: number;
}

interface PuntoGeo {
  lat: number;
  lng: number;
  direccion_texto: string;
  zona: string;
}

interface Trip {
  id: number;
  creador_id: string;
  creador_email: string;
  tipo: string;
  origen: PuntoGeo;
  destino: PuntoGeo;
  hora_salida: string;
  estado: string;
  creado_en: number;
  punto_encuentro?: string;
  cupo_maximo?: number;
  paradas_intermedias: any[];
  asientos_disponibles?: number;
  participantes: string[];
  ubicacion_actual?: { lat: number; lng: number; actualizado_en: number } | null;
}

function TiltRideCard({ ride, onChat }: { ride: ActiveRide; onChat: (driver: string) => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const rx = -((y - yc) / yc) * 5;
    const ry = ((x - xc) / xc) * 5;
    card.style.setProperty('--rx', `${rx}deg`);
    card.style.setProperty('--ry', `${ry}deg`);
  };
  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  };
  return (
    <div
      ref={cardRef}
      className="ride-card tilt-3d"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="ride-card-header">
        <div className="driver-info">
          <div className="driver-avatar" style={{ backgroundColor: 'var(--surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
            {ride.driver.substring(0, 2)}
          </div>
          <div>
            <p className="driver-name">{ride.driver}</p>
            <p className="driver-vehicle">{ride.vehicle}</p>
          </div>
        </div>
        <span className={`status-badge ${ride.status === 'Activo' ? 'status-active' : 'status-waiting'}`}>
          {ride.status}
        </span>
      </div>
      <div className="ride-card-details">
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>near_me</span>
        <span>{ride.eta} • {ride.location}</span>
      </div>
      <button className="btn btn-secondary" onClick={() => onChat(ride.driver)} style={{ width: '100%', padding: '8px', fontSize: '12px' }}>
        Chat con Conductor
      </button>
    </div>
  );
}

interface ProtectedRouteProps {
  isLoggedIn: boolean;
  onRedirect: () => void;
  children: React.ReactNode;
}

function ProtectedRoute({ isLoggedIn, onRedirect, children }: ProtectedRouteProps) {
  useEffect(() => {
    if (!isLoggedIn) {
      onRedirect();
    }
  }, [isLoggedIn, onRedirect]);

  if (!isLoggedIn) {
    return null;
  }

  return <>{children}</>;
}

const campusCoords: Record<string, [number, number]> = {
  udlapark: [-0.1622, -78.4560],
  granados: [-0.1676, -78.4727],
  colon: [-0.2022, -78.4851]
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => localStorage.getItem('campuspath_logged_in') === 'true');
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const hash = window.location.hash;
    return hash ? hash.slice(1) : '/';
  });

  const navigate = (path: string) => {
    window.location.hash = path;
    setCurrentPath(path);
  };

  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>('inicio');
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem('campuspath_user_email') || 'mateo.guerrero@udla.edu.ec');
  const [openTrips, setOpenTrips] = useState<Trip[]>([]);
  const [tripFilter, setTripFilter] = useState<string>('todos');
  const [showCreateTripModal, setShowCreateTripModal] = useState<boolean>(false);
  const [newTripTipo, setNewTripTipo] = useState<string>('caminata');
  const [newTripOrigenZona, setNewTripOrigenZona] = useState<string>('campus_udlapark');
  const [newTripDestinoZona, setNewTripDestinoZona] = useState<string>('campus_granados');
  const [newTripHora, setNewTripHora] = useState<string>('');
  const [newTripPuntoEncuentro, setNewTripPuntoEncuentro] = useState<string>('');
  const [newTripCupoMaximo, setNewTripCupoMaximo] = useState<string>('');
  const [newTripAsientos, setNewTripAsientos] = useState<string>('');
  const [newTripOrigenTexto, setNewTripOrigenTexto] = useState<string>('');
  const [newTripDestinoTexto, setNewTripDestinoTexto] = useState<string>('');
  const [origenSuggestions, setOrigenSuggestions] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [destinoSuggestions, setDestinoSuggestions] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [origenCoords, setOrigenCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destinoCoords, setDestinoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyTrips, setNearbyTrips] = useState<Trip[]>([]);
  const nearbyMarkersRef = useRef<L.Layer[]>([]);
  const routesMapContainerRef = useRef<HTMLDivElement | null>(null);
  const routesMapInstanceRef = useRef<L.Map | null>(null);
  const routesMarkersRef = useRef<L.Layer[]>([]);
  const pureMapContainerRef = useRef<HTMLDivElement | null>(null);
  const pureMapInstanceRef = useRef<L.Map | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [quitoTemp, setQuitoTemp] = useState<number | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Mateo G.',
    badge: 'Conductor Estrella',
    level: 'Elite Mover',
    points_label: '350 pts para Nivel 5',
    points_percent: 75,
    estimated_savings_monthly: 42.50,
    co2_avoided_kg: 12.4
  });
  const [rides, setRides] = useState<ActiveRide[]>([
    {
      id: 1,
      driver: 'Alex Rivera',
      vehicle: 'Tesla Model 3 - Blanco',
      status: 'Activo',
      eta: '5 min',
      location: 'UDLAPARK - Parqueadero'
    },
    {
      id: 2,
      driver: 'Prof. Clara S.',
      vehicle: 'SUV - Gris Oscuro',
      status: 'Esperando',
      eta: '15 min',
      location: 'Colón - Entrada Principal'
    }
  ]);
  const [upcomingTrips, setUpcomingTrips] = useState<UpcomingTrip[]>([
    {
      id: 1,
      day: 'Mañana',
      date_num: '08',
      route: 'UDLAPARK to UDLA Granados',
      time_str: '08:30 AM',
      type_str: 'event_repeat'
    },
    {
      id: 2,
      day: 'Vier',
      date_num: '09',
      route: 'UDLA Colón to UDLAPARK',
      time_str: '17:15 PM',
      type_str: 'calendar_month'
    }
  ]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    co2_saved_tons: 14.8,
    shared_rides_total: 3421,
    shared_rides_growth_percent: 12,
    active_users_count: 4500,
    routes_mapped_count: 120,
    verified_routes_count: 156,
    verified_routes_goal: 200,
    peak_hour: '07:45 AM',
    peak_point: 'UDLAPARK - Edificio Principal',
    cpu_usage_percent: 12.5,
    memory_usage_mb: 48.2,
    active_connections: 150,
    response_time_ms: 4.8,
    uptime_seconds: 7200
  });

  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [scheduleOrigin, setScheduleOrigin] = useState<string>('udlapark');
  const [scheduleDestination, setScheduleDestination] = useState<string>('granados');
  const [scheduleTime, setScheduleTime] = useState<string>('');
  const [scheduleVehicle, setScheduleVehicle] = useState<string>('');

  const [reportTitle, setReportTitle] = useState<string>('');
  const [reportDescription, setReportDescription] = useState<string>('');
  const [reportLocation, setReportLocation] = useState<string>('');
  const [reportSeverity, setReportSeverity] = useState<string>('Medio');

  const [mapZone, setMapZone] = useState<string>('udlapark');
  const [heatmapZone, setHeatmapZone] = useState<string>('udlapark');

  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [activeChatDriver, setActiveChatDriver] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string }[]>([]);
  const [newChatMessage, setNewChatMessage] = useState<string>('');

  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  const [showHelpCenterModal, setShowHelpCenterModal] = useState<boolean>(false);
  const [showPhoneSupportModal, setShowPhoneSupportModal] = useState<boolean>(false);

  const [tempProfileName, setTempProfileName] = useState<string>(userProfile.name);
  const [tempProfileVehicle, setTempProfileVehicle] = useState<string>('Mazda 3 - Gris');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);

  const heatmapContainerRef = useRef<HTMLDivElement | null>(null);
  const heatmapInstanceRef = useRef<L.Map | null>(null);


  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

  const checkStatus = useCallback(async () => {
    try {
      const healthRes = await fetch(`${API_BASE_URL}/health`);
      if (healthRes.ok) {
        setBackendConnected(true);

        const profileRes = await fetch(`${API_BASE_URL}/user`);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setUserProfile(profileData);
        }

        const ridesRes = await fetch(`${API_BASE_URL}/rides`);
        if (ridesRes.ok) {
          const ridesData = await ridesRes.json();
          setRides(ridesData);
        }

        const tripsRes = await fetch(`${API_BASE_URL}/trips/upcoming`);
        if (tripsRes.ok) {
          const tripsData = await tripsRes.json();
          setUpcomingTrips(tripsData);
        }

        const metricsRes = await fetch(`${API_BASE_URL}/metrics`);
        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          setMetrics(metricsData);
        }
      } else {
        setBackendConnected(false);
      }
    } catch {
      setBackendConnected(false);
    }

    try {
      const weatherRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-0.1807&longitude=-78.4678&current=temperature_2m');
      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();
        if (weatherData.current && typeof weatherData.current.temperature_2m === 'number') {
          setQuitoTemp(weatherData.current.temperature_2m);
        }
      }
    } catch (err) {
      console.error(err);
    }

    try {
      const tripsRes = await fetch(`${API_BASE_URL}/trips`);
      if (tripsRes.ok) {
        const tripsData = await tripsRes.json();
        setOpenTrips(tripsData);
      }
    } catch (err) {
      console.error(err);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const calcularZona = (lat: number, lng: number): string => {
    const distUdlapark = Math.abs(lat - (-0.1622)) + Math.abs(lng - (-78.4560));
    const distGranados = Math.abs(lat - (-0.1676)) + Math.abs(lng - (-78.4727));
    const distColon = Math.abs(lat - (-0.2022)) + Math.abs(lng - (-78.4851));
    const minDist = Math.min(distUdlapark, distGranados, distColon);
    if (minDist < 0.02) {
      if (minDist === distUdlapark) return 'campus_udlapark';
      if (minDist === distGranados) return 'campus_granados';
      return 'campus_colon';
    }
    if (lat > -0.12) return 'norte';
    if (lat < -0.25) return 'sur';
    if (lng > -78.42) return 'valles';
    return 'otro';
  };

  const fetchNearby = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/trips/nearby?lat=${lat}&lng=${lng}&radio_km=10`);
      if (res.ok) {
        const data = await res.json();
        setNearbyTrips(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [API_BASE_URL]);

  const buscarDireccion = async (query: string, tipo: 'origen' | 'destino') => {
    if (query.length < 3) {
      if (tipo === 'origen') setOrigenSuggestions([]);
      else setDestinoSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Quito, Ecuador')}&limit=5`,
        { headers: { 'Accept-Language': 'es' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (tipo === 'origen') setOrigenSuggestions(data);
        else setDestinoSuggestions(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) return;
    const obtenerPos = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          fetchNearby(lat, lng);
        },
        () => {
          fetchNearby(-0.1622, -78.4560);
        }
      );
    };
    obtenerPos();
    const geoInterval = setInterval(obtenerPos, 15000);
    return () => clearInterval(geoInterval);
  }, [fetchNearby]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      setCurrentPath(hash ? hash.slice(1) : '/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      if (currentPath === '/') {
        navigate('/dashboard');
        setActiveTab('dashboard');
      }
    } else {
      if (currentPath === '/dashboard') {
        navigate('/');
        setShowLogin(true);
      }
    }
  }, [isLoggedIn, currentPath]);

  useEffect(() => {
    if (activeTab === 'inicio' && routesMapContainerRef.current) {
      if (!routesMapInstanceRef.current) {
        const map = L.map(routesMapContainerRef.current).setView([-0.1622, -78.4560], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        routesMapInstanceRef.current = map;
      }
    }

    return () => {
      if (routesMapInstanceRef.current) {
        routesMapInstanceRef.current.remove();
        routesMapInstanceRef.current = null;
      }
    };
  }, [activeTab]);

  useEffect(() => {
    const map = routesMapInstanceRef.current;
    if (!map) return;

    routesMarkersRef.current.forEach(m => m.remove());
    routesMarkersRef.current = [];

    const filtered = openTrips.filter(trip => {
      if (tripFilter === 'todos' ? true : trip.tipo === tripFilter) return true;
      return false;
    });

    filtered.forEach(trip => {
      const originCoords: [number, number] = [trip.origen.lat, trip.origen.lng];
      const destCoords: [number, number] = [trip.destino.lat, trip.destino.lng];

      const iconHtml = trip.tipo === 'caminata'
        ? `<span class="material-symbols-outlined" style="color:var(--color-primary);font-size:24px;">directions_walk</span>`
        : `<span class="material-symbols-outlined" style="color:var(--color-accent);font-size:24px;">directions_car</span>`;

      const customIcon = L.divIcon({
        html: `<div class="routes-map-marker">${iconHtml}</div>`,
        className: 'custom-routes-marker',
        iconSize: [30, 30]
      });

      const marker = L.marker(originCoords, { icon: customIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:var(--font-display);padding:4px;">
          <h4 style="margin:0 0 4px 0;font-weight:700;">Viaje a ${trip.destino.direccion_texto}</h4>
          <p style="margin:0;font-size:11px;color:var(--on-surface-variant);">Hora: ${trip.hora_salida}</p>
          <p style="margin:4px 0 0 0;font-size:11px;font-weight:600;color:var(--color-primary);">${trip.tipo === 'caminata' ? 'Caminata en Grupo' : 'Vehículo Compartido'}</p>
        </div>
      `);

      routesMarkersRef.current.push(marker);

      if (trip.tipo === 'vehiculo') {
        const poly = L.polyline([originCoords, destCoords], { color: 'var(--color-accent)', weight: 3, dashArray: '5, 10' }).addTo(map);
        routesMarkersRef.current.push(poly);
      }
    });
  }, [openTrips, tripFilter, activeTab]);

  useEffect(() => {
    const map = routesMapInstanceRef.current;
    if (!map) return;

    nearbyMarkersRef.current.forEach(m => m.remove());
    nearbyMarkersRef.current = [];

    nearbyTrips.forEach(trip => {
      if (!trip.ubicacion_actual) return;
      const pos: [number, number] = [trip.ubicacion_actual.lat, trip.ubicacion_actual.lng];
      const driverIcon = L.divIcon({
        html: `<div style="background:var(--color-accent);border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid #fff"><span class="material-symbols-outlined" style="color:#fff;font-size:18px;">directions_car</span></div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
      const marker = L.marker(pos, { icon: driverIcon }).addTo(map);
      marker.bindPopup(`<div style="font-family:var(--font-display);padding:4px;"><b style="font-size:13px;">Conductor en Ruta</b><br><span style="font-size:11px;">${trip.destino.direccion_texto}</span><br><span style="font-size:10px;color:#888;">${(trip as Trip & { distancia_km?: number }).distancia_km?.toFixed(1) ?? '?'} km de distancia</span></div>`);
      nearbyMarkersRef.current.push(marker);
    });
  }, [nearbyTrips]);

  useEffect(() => {
    if (activeTab === 'mapa' && pureMapContainerRef.current) {
      if (!pureMapInstanceRef.current) {
        const coords = campusCoords.udlapark;
        const map = L.map(pureMapContainerRef.current).setView(coords, 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        L.marker(campusCoords.udlapark).addTo(map).bindPopup('<b>UDLAPARK</b><br>Sede Principal');
        L.marker(campusCoords.granados).addTo(map).bindPopup('<b>Granados</b><br>Campus Central');
        L.marker(campusCoords.colon).addTo(map).bindPopup('<b>Colón</b><br>Campus Sur-Centro');

        pureMapInstanceRef.current = map;
      }
    }

    return () => {
      if (pureMapInstanceRef.current) {
        pureMapInstanceRef.current.remove();
        pureMapInstanceRef.current = null;
      }
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'dashboard' && mapContainerRef.current) {
      if (!mapInstanceRef.current) {
        const coords = campusCoords[mapZone];
        const map = L.map(mapContainerRef.current).setView(coords, 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const marker = L.marker(coords).addTo(map);
        marker.bindPopup(`<b>UDLA ${mapZone.toUpperCase()}</b><br>Zona de alta densidad de movilidad.`).openPopup();

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    };
  }, [activeTab, mapZone]);

  useEffect(() => {
    if (mapInstanceRef.current && markerInstanceRef.current) {
      const coords = campusCoords[mapZone];
      mapInstanceRef.current.setView(coords, 16);
      markerInstanceRef.current.setLatLng(coords);
      markerInstanceRef.current.bindPopup(`<b>UDLA ${mapZone.toUpperCase()}</b><br>Zona de alta densidad de movilidad.`).openPopup();
    }
  }, [mapZone]);

  useEffect(() => {
    if (activeTab === 'impacto' && heatmapContainerRef.current) {
      if (!heatmapInstanceRef.current) {
        const coords = campusCoords[heatmapZone];
        const map = L.map(heatmapContainerRef.current).setView(coords, 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        L.circle([-0.1622, -78.4560], { color: '#9e1c32', fillColor: '#9e1c32', fillOpacity: 0.6, radius: 100, weight: 0 }).addTo(map);
        L.circle([-0.1622, -78.4560], { color: '#C8A96B', fillColor: '#C8A96B', fillOpacity: 0.35, radius: 250, weight: 0 }).addTo(map);
        L.circle([-0.1622, -78.4560], { color: '#43643c', fillColor: '#43643c', fillOpacity: 0.15, radius: 500, weight: 0 }).addTo(map).bindPopup('UDLAPARK: Densidad Alta (Hora Pico)');

        L.circle([-0.1676, -78.4727], { color: '#9e1c32', fillColor: '#9e1c32', fillOpacity: 0.5, radius: 80, weight: 0 }).addTo(map);
        L.circle([-0.1676, -78.4727], { color: '#C8A96B', fillColor: '#C8A96B', fillOpacity: 0.3, radius: 200, weight: 0 }).addTo(map);
        L.circle([-0.1676, -78.4727], { color: '#43643c', fillColor: '#43643c', fillOpacity: 0.12, radius: 400, weight: 0 }).addTo(map).bindPopup('Granados: Densidad Media');

        L.circle([-0.2022, -78.4851], { color: '#9e1c32', fillColor: '#9e1c32', fillOpacity: 0.4, radius: 60, weight: 0 }).addTo(map);
        L.circle([-0.2022, -78.4851], { color: '#C8A96B', fillColor: '#C8A96B', fillOpacity: 0.25, radius: 150, weight: 0 }).addTo(map);
        L.circle([-0.2022, -78.4851], { color: '#43643c', fillColor: '#43643c', fillOpacity: 0.1, radius: 300, weight: 0 }).addTo(map).bindPopup('Colón: Densidad Moderada');

        heatmapInstanceRef.current = map;
      }
    }

    return () => {
      if (heatmapInstanceRef.current) {
        heatmapInstanceRef.current.remove();
        heatmapInstanceRef.current = null;
      }
    };
  }, [activeTab, heatmapZone]);

  useEffect(() => {
    if (heatmapInstanceRef.current) {
      const coords = campusCoords[heatmapZone];
      heatmapInstanceRef.current.setView(coords, 15);
    }
  }, [heatmapZone]);

  const triggerNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    const isUdla = loginEmail.toLowerCase().endsWith('@udla.edu.ec') || loginEmail.toLowerCase().endsWith('@udla.ec');
    if (!isUdla) {
      setLoginError('Acceso exclusivo para la comunidad UDLA (*.edu.ec / *.ec)');
      return;
    }
    localStorage.setItem('campuspath_logged_in', 'true');
    localStorage.setItem('campuspath_user_email', loginEmail);
    setUserEmail(loginEmail);
    setLoginError(null);
    setIsLoggedIn(true);
    navigate('/dashboard');
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('campuspath_logged_in');
    localStorage.removeItem('campuspath_user_email');
    setIsLoggedIn(false);
    navigate('/');
  };

  const handleJoinTrip = async (tripId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/trips/${tripId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail }),
      });
      if (res.ok) {
        triggerNotification('Te has unido al viaje con éxito');
        checkStatus();
      } else {
        const errorData = await res.json().catch(() => ({}));
        triggerNotification(errorData.detail || 'No se pudo unir al viaje');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('Error de conexión');
    }
  };

  const handleCreateTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripHora) {
      triggerNotification('Por favor, completa los campos requeridos');
      return;
    }

    const ZONA_COORDS: Record<string, { lat: number; lng: number; label: string }> = {
      campus_udlapark: { lat: -0.1622, lng: -78.4560, label: 'Campus UDLAPARK' },
      campus_granados: { lat: -0.1030, lng: -78.4896, label: 'Campus Granados' },
      campus_colon: { lat: -0.2105, lng: -78.5016, label: 'Campus Colon' },
      norte: { lat: -0.0700, lng: -78.4800, label: 'Quito Norte' },
      sur: { lat: -0.3000, lng: -78.5500, label: 'Quito Sur' },
      valles: { lat: -0.2900, lng: -78.4000, label: 'Valles' },
      otro: { lat: -0.1800, lng: -78.4800, label: 'Otra Ubicacion' },
    };

    const origenFinal = origenCoords
      ? { lat: origenCoords.lat, lng: origenCoords.lng, label: newTripOrigenTexto, zona: calcularZona(origenCoords.lat, origenCoords.lng) }
      : { ...ZONA_COORDS[newTripOrigenZona], zona: newTripOrigenZona };
    const destinoFinal = destinoCoords
      ? { lat: destinoCoords.lat, lng: destinoCoords.lng, label: newTripDestinoTexto, zona: calcularZona(destinoCoords.lat, destinoCoords.lng) }
      : { ...ZONA_COORDS[newTripDestinoZona], zona: newTripDestinoZona };

    interface TripCreatePayload {
      creador_id: string;
      creador_email: string;
      tipo: string;
      origen: { lat: number; lng: number; direccion_texto: string; zona: string };
      destino: { lat: number; lng: number; direccion_texto: string; zona: string };
      hora_salida: string;
      punto_encuentro?: string;
      cupo_maximo?: number;
      asientos_disponibles?: number;
      paradas_intermedias?: unknown[];
    }

    const isCaminata = newTripTipo === 'caminata';
    const payload: TripCreatePayload = {
      creador_id: userEmail,
      creador_email: userEmail,
      tipo: newTripTipo,
      origen: {
        lat: origenFinal.lat,
        lng: origenFinal.lng,
        direccion_texto: origenFinal.label,
        zona: origenFinal.zona,
      },
      destino: {
        lat: destinoFinal.lat,
        lng: destinoFinal.lng,
        direccion_texto: destinoFinal.label,
        zona: destinoFinal.zona,
      },
      hora_salida: newTripHora,
    };

    if (isCaminata) {
      if (!newTripPuntoEncuentro || !newTripCupoMaximo) {
        triggerNotification('Completa el punto de encuentro y cupo máximo');
        return;
      }
      payload.punto_encuentro = newTripPuntoEncuentro;
      payload.cupo_maximo = parseInt(newTripCupoMaximo, 10);
    } else {
      if (!newTripAsientos) {
        triggerNotification('Completa el número de asientos disponibles');
        return;
      }
      payload.asientos_disponibles = parseInt(newTripAsientos, 10);
      payload.paradas_intermedias = [];
    }

    try {
      const res = await fetch(`${API_BASE_URL}/trips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        triggerNotification('Viaje creado con éxito');
        setShowCreateTripModal(false);
        setNewTripHora('');
        setNewTripPuntoEncuentro('');
        setNewTripCupoMaximo('');
        setNewTripAsientos('');
        checkStatus();
      } else {
        const errorData = await res.json().catch(() => ({}));
        triggerNotification(errorData.detail || 'No se pudo crear el viaje');
      }
    } catch (err) {
      console.error(err);
      triggerNotification('Error de conexión al crear viaje');
    }
  };

  const handleScheduleRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleOrigin || !scheduleDestination || !scheduleTime || !scheduleVehicle) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/rides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          origin: scheduleOrigin.toUpperCase(),
          destination: scheduleDestination.toUpperCase(),
          departure_time: scheduleTime,
          vehicle: scheduleVehicle
        })
      });

      if (res.ok) {
        const newRide = await res.json();
        setRides(prev => [...prev, newRide]);
        setShowScheduleModal(false);
        setScheduleTime('');
        setScheduleVehicle('');
        triggerNotification('Viaje programado exitosamente');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle || !reportDescription || !reportLocation || !reportSeverity) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: reportTitle,
          description: reportDescription,
          location: reportLocation,
          severity: reportSeverity
        })
      });

      if (res.ok) {
        setShowReportModal(false);
        setReportTitle('');
        setReportDescription('');
        setReportLocation('');
        setReportSeverity('Medio');
        triggerNotification('Incidente reportado exitosamente de forma segura');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDriverChat = (driver: string) => {
    setActiveChatDriver(driver);
    setChatMessages([
      { sender: 'driver', text: `Hola, soy ${driver}. Estoy en camino hacia el campus.` },
      { sender: 'driver', text: '¿Ya te encuentras en el punto de encuentro?' }
    ]);
    setShowChatModal(true);
  };

  const handleOpenLiveSupport = () => {
    setActiveChatDriver('Soporte UDLA');
    setChatMessages([
      { sender: 'driver', text: 'Bienvenido al Centro de Soporte de CampusPath. ¿En qué podemos ayudarte hoy?' }
    ]);
    setShowChatModal(true);
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;
    const msg = newChatMessage.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: msg }]);
    setNewChatMessage('');
    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: 'driver', text: 'Perfecto, de acuerdo. Llegaré en unos minutos.' }]);
    }, 2000);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempProfileName) return;
    setUserProfile(prev => ({
      ...prev,
      name: tempProfileName
    }));
    setShowSettingsModal(false);
    triggerNotification('Perfil actualizado exitosamente');
  };

  const getTrafficStatusByTemp = (temp: number | null) => {
    if (temp === null) {
      return 'Movilidad normal en campus';
    }
    if (temp < 14) {
      return 'Baja temperatura en Quito. Tránsito vehicular alto entre sedes.';
    }
    if (temp > 20) {
      return 'Día despejado y cálido. Mayor flujo peatonal y uso de bicicletas.';
    }
    return 'Clima templado. Flujo de viajes compartidos estable.';
  };

  if (!isLoggedIn) {
    if (showLogin || currentPath === '/dashboard') {
      return (
        <div className="login-container">
          <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(158, 28, 50, 0.1)', filter: 'blur(60px)', top: '10%', left: '10%' }}></div>
          <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(67, 100, 60, 0.1)', filter: 'blur(60px)', bottom: '10%', right: '10%' }}></div>
          
          <div className="glass-card login-card">
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}><Logo size={40} showText={true} /></div>
              <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>Plataforma de Movilidad UDLA</p>
            </div>
            
            <form onSubmit={handleLoginSubmit}>
              {loginError && (
                <div style={{ backgroundColor: 'var(--error-container)', color: 'var(--on-error-container)', padding: '12px', borderRadius: '8px', fontSize: '12px', marginBottom: '16px', border: '1px solid rgba(186, 26, 26, 0.2)' }}>
                  {loginError}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Correo Institucional</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="nombre.apellido@udla.edu.ec"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px', padding: '14px' }}>
                Ingresar
              </button>
            </form>
            
            <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
              <p>Al ingresar aceptas los términos de servicio y políticas de seguridad.</p>
              <button className="btn btn-secondary" onClick={() => setShowLogin(false)} style={{ border: 'none', background: 'none', fontSize: '13px', padding: 0, marginTop: '16px', cursor: 'pointer', textDecoration: 'underline' }}>
                Volver a la Landing
              </button>
            </div>
          </div>
        </div>
      );
    }
    return <LandingPage onStart={() => setShowLogin(true)} />;
  }


  return (
    <ProtectedRoute isLoggedIn={isLoggedIn} onRedirect={() => navigate('/')}>
      <div className="sidebar-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div onClick={() => setActiveTab('inicio')} style={{ cursor: 'pointer' }}>
              <Logo size={24} showText={true} />
            </div>
          </div>
          <nav className="sidebar-nav">
            <div className="sidebar-section-title">Ecosistema</div>
            <button className={`sidebar-item ${(activeTab as string) === 'inicio' ? 'active' : ''}`} onClick={() => setActiveTab('inicio')}>
              <span className="material-symbols-outlined">route</span>
              <span>Rutas</span>
            </button>
            <button className={`sidebar-item ${(activeTab as string) === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
              <span className="material-symbols-outlined">directions_car</span>
              <span>Rides</span>
            </button>
            <button className={`sidebar-item ${(activeTab as string) === 'mapa' ? 'active' : ''}`} onClick={() => setActiveTab('mapa')}>
              <span className="material-symbols-outlined">map</span>
              <span>Mapa</span>
            </button>
            <button className={`sidebar-item ${(activeTab as string) === 'impacto' ? 'active' : ''}`} onClick={() => setActiveTab('impacto')}>
              <span className="material-symbols-outlined">eco</span>
              <span>Impacto</span>
            </button>
            <button className={`sidebar-item ${(activeTab as string) === 'seguridad' ? 'active' : ''}`} onClick={() => setActiveTab('seguridad')}>
              <span className="material-symbols-outlined">security</span>
              <span>Seguridad</span>
            </button>
            <div className="sidebar-section-title">Personal</div>
            <button className={`sidebar-item ${(activeTab as string) === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>
              <span className="material-symbols-outlined">history</span>
              <span>Historial</span>
            </button>
            <button className={`sidebar-item ${(activeTab as string) === 'ajustes' ? 'active' : ''}`} onClick={() => setActiveTab('ajustes')}>
              <span className="material-symbols-outlined">settings</span>
              <span>Ajustes</span>
            </button>
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-profile" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => setShowSettingsModal(true)}>
                <div className="sidebar-profile-avatar">M</div>
                <div className="sidebar-profile-info">
                  <p className="sidebar-profile-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {userProfile.name}
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '14px', fontWeight: 'bold' }}>verified</span>
                  </p>
                  <p className="sidebar-profile-role" style={{ color: backendConnected ? 'var(--primary)' : 'var(--error)', fontSize: '9px' }}>
                    {backendConnected ? 'Conectado' : 'Sin conexión'}
                  </p>
                </div>
              </div>
              <button onClick={handleLogout} style={{ color: 'var(--error)', padding: '4px', display: 'flex', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span>
              </button>
            </div>
          </div>
        </aside>

        <main className="main-content">
          <header className="app-bar">
            <div className="app-bar-left">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <h1 className="app-bar-title">Hola, {userProfile.name.split(' ')[0]}</h1>
                <div className="tag-badge tag-badge-gold" style={{ margin: 0, padding: '2px 8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>stars</span>
                  <span style={{ fontSize: '10px' }}>{userProfile.badge}</span>
                </div>
              </div>
            </div>
            <div className="app-bar-right">
              <span style={{ fontSize: '11px', color: backendConnected ? 'var(--primary)' : 'var(--error)', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '16px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{backendConnected ? 'wifi' : 'wifi_off'}</span>
                {backendConnected ? 'Conectado' : 'Sin conexión'}
              </span>
              <div className="notification-badge" onClick={() => triggerNotification('No tienes notificaciones pendientes')} style={{ marginRight: '16px' }}>
                <span className="material-symbols-outlined">notifications</span>
              </div>
              <button className="btn btn-primary" onClick={() => setShowScheduleModal(true)}>
                <span className="material-symbols-outlined">add</span>
                <span>Programar Viaje</span>
              </button>
            </div>
          </header>

          <div className="dashboard-scroll">

      {activeTab === 'inicio' && (
        <div className="container-custom" style={{ padding: 0 }}>
          <section style={{ marginBottom: '32px' }}>
            <h1 className="title-display" style={{ fontSize: '40px', marginBottom: '8px' }}>Rutas y Viajes Compartidos</h1>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '16px' }}>Encuentra personas de la comunidad UDLA con tus mismas rutas de viaje.</p>
          </section>

          <div className="grid-12">
            <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="btn-pill-group" style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
                <button className={`btn-pill ${tripFilter === 'todos' ? 'active' : ''}`} onClick={() => setTripFilter('todos')}>Todos</button>
                <button className={`btn-pill ${tripFilter === 'caminata' ? 'active' : ''}`} onClick={() => setTripFilter('caminata')}>Caminatas</button>
                <button className={`btn-pill ${tripFilter === 'vehiculo' ? 'active' : ''}`} onClick={() => setTripFilter('vehiculo')}>Vehículos</button>
              </div>

              <button className="btn btn-primary" onClick={() => setShowCreateTripModal(true)} style={{ width: '100%', marginBottom: '24px', padding: '14px', justifyContent: 'center' }}>
                <span className="material-symbols-outlined">add_circle</span>
                <span>Crear Viaje Nuevo</span>
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '550px', overflowY: 'auto', paddingRight: '8px' }}>
                {openTrips
                  .filter(t => tripFilter === 'todos' || t.tipo === tripFilter)
                  .map(trip => {
                    const isCreator = trip.creador_email === userEmail;
                    const isJoined = trip.participantes && trip.participantes.includes(userEmail);
                    const isFull = trip.tipo === 'caminata'
                      ? (trip.participantes && trip.participantes.length >= (trip.cupo_maximo ?? 0))
                      : (trip.participantes && trip.participantes.length >= (trip.asientos_disponibles ?? 0));

                    return (
                      <div key={trip.id} className="glass-card" style={{ padding: '20px', position: 'relative', border: isCreator ? '1px solid var(--color-primary)' : isJoined ? '1px solid var(--color-accent)' : '1px solid rgba(26,28,25,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-outlined" style={{ color: trip.tipo === 'caminata' ? 'var(--color-primary)' : 'var(--color-accent)', fontSize: '20px' }}>
                              {trip.tipo === 'caminata' ? 'directions_walk' : 'directions_car'}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {trip.tipo === 'caminata' ? 'Caminata' : 'Vehículo'}
                            </span>
                          </div>
                          <div>
                            {isCreator && <span className="tag-badge tag-badge-gold">Creador</span>}
                            {isJoined && !isCreator && <span className="tag-badge" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>Unido</span>}
                          </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text)', marginBottom: '4px' }}>{trip.origen.direccion_texto} → {trip.destino.direccion_texto}</p>
                          <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>schedule</span>
                            Salida: {trip.hora_salida}
                          </p>
                          {trip.tipo === 'caminata' ? (
                            <>
                              <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>location_on</span>
                                Encuentro: {trip.punto_encuentro}
                              </p>
                              <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group</span>
                                Grupo: {trip.participantes ? trip.participantes.length : 0} / {trip.cupo_maximo} integrantes
                              </p>
                            </>
                          ) : (
                            <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>event_seat</span>
                              Asientos: {trip.participantes ? trip.participantes.length : 0} / {trip.asientos_disponibles} libres
                            </p>
                          )}
                        </div>

                        <button
                          className="btn btn-secondary"
                          disabled={isCreator || isJoined || isFull}
                          onClick={() => handleJoinTrip(trip.id)}
                          style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
                        >
                          {isCreator ? 'Tu Viaje' : isJoined ? 'Ya estás Unido' : isFull ? 'Cupos Llenos' : 'Unirse al Grupo'}
                        </button>
                      </div>
                    );
                  })}
                {openTrips.filter(t => tripFilter === 'todos' || t.tipo === tripFilter).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--on-surface-variant)', border: '1px dashed var(--color-border)', borderRadius: '12px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-border)', marginBottom: '16px' }}>commute</span>
                    <p style={{ fontSize: '14px' }}>No hay viajes activos registrados en este momento.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-8">
              <div className="map-card" style={{ height: '620px' }}>
                <div className="map-header">
                  <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Monitoreo de Rutas UDLA</h3>
                  <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Mostrando viajes {tripFilter}</span>
                </div>
                <div ref={routesMapContainerRef} style={{ flex: 1, position: 'relative' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="dashboard-grid grid-12">
          <div className="col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <section className="glass-card map-card" style={{ padding: 0 }}>
              <div className="map-header">
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Mapa en Tiempo Real</h2>
                  <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Sedes de la UDLA en Quito</p>
                </div>
                <div className="btn-pill-group">
                  <button className={`btn-pill ${mapZone === 'udlapark' ? 'active' : ''}`} onClick={() => setMapZone('udlapark')}>UDLAPARK</button>
                  <button className={`btn-pill ${mapZone === 'granados' ? 'active' : ''}`} onClick={() => setMapZone('granados')}>Granados</button>
                  <button className={`btn-pill ${mapZone === 'colon' ? 'active' : ''}`} onClick={() => setMapZone('colon')}>Colón</button>
                </div>
              </div>
              <div className="map-body" ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '380px' }}>
              </div>
            </section>

            <div className="bento-mini">
              <div className="mini-card accent">
                <span className="material-symbols-outlined mini-card-icon" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('impacto')}>savings</span>
                <div>
                  <h3 className="mini-card-val">${userProfile.estimated_savings_monthly.toFixed(2)}</h3>
                  <p className="mini-card-label">Ahorro Estimado (Mes)</p>
                </div>
              </div>
              <div className="mini-card">
                <span className="material-symbols-outlined mini-card-icon" style={{ color: 'var(--gold-accent)', cursor: 'pointer' }} onClick={() => setActiveTab('impacto')}>eco</span>
                <div>
                  <h3 className="mini-card-val">{userProfile.co2_avoided_kg} kg</h3>
                  <p className="mini-card-label">CO2 Evitado</p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <section className="rides-section">
              <div className="section-header">
                <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Rides en curso</h2>
                <span className="section-badge-counter">{rides.length}</span>
              </div>
              <div className="rides-list">
                {rides.map(ride => (
                  <TiltRideCard key={ride.id} ride={ride} onChat={handleOpenDriverChat} />
                ))}
              </div>
            </section>

            <section className="trips-section">
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Próximos Viajes</h2>
              <div className="trips-list">
                {upcomingTrips.map((trip, idx) => (
                  <div key={trip.id}>
                    {idx > 0 && <div className="divider-line" style={{ margin: '12px 0' }}></div>}
                    <div className="trip-item">
                      <div className="trip-date">
                        <span className={`trip-day ${trip.day !== 'Mañana' ? 'grey' : ''}`}>{trip.day}</span>
                        <span className={`trip-date-num ${trip.day !== 'Mañana' ? 'grey' : ''}`}>{trip.date_num}</span>
                      </div>
                      <div className="trip-info">
                        <p className="trip-route">{trip.route}</p>
                        <p className="trip-time">Salida: {trip.time_str}</p>
                      </div>
                      <span className="material-symbols-outlined" style={{ color: 'var(--outline)' }}>
                        {trip.type_str}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn btn-secondary" onClick={() => setShowCalendarModal(true)} style={{ width: '100%', marginTop: '16px', padding: '8px', fontSize: '12px' }}>
                Ver Calendario Completo
              </button>
            </section>

            <div className="progress-banner">
              <p className="progress-banner-label">Nivel de Comunidad</p>
              <h3 className="progress-banner-title">{userProfile.level}</h3>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${userProfile.points_percent}%` }}></div>
              </div>
              <p className="progress-bar-text">{userProfile.points_label}</p>
              <span className="material-symbols-outlined absolute-icon">workspace_premium</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'mapa' && (
        <div className="container-custom" style={{ padding: 0 }}>
          <section style={{ marginBottom: '32px' }}>
            <h1 className="title-display" style={{ fontSize: '40px', marginBottom: '8px' }}>Mapa Geográfico UDLA</h1>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '16px' }}>Vista de los campus UDLAPARK, Granados y Colón de la Universidad de las Américas.</p>
          </section>

          <div className="glass-card" style={{ height: '650px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            <div className="map-header">
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Ubicaciones y Sedes CampusPath</h3>
              <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Mapa general interactivo</span>
            </div>
            <div ref={pureMapContainerRef} style={{ flex: 1, position: 'relative' }}></div>
          </div>
        </div>
      )}

      {activeTab === 'impacto' && (
        <div className="container-custom" style={{ padding: 0 }}>
          <section style={{ marginBottom: '48px' }}>
            <h1 className="title-display" style={{ fontSize: '40px', marginBottom: '8px' }}>Impacto en la Comunidad UDLA</h1>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '16px' }}>Visualización en tiempo real de nuestra huella ambiental y eficiencia en movilidad académica.</p>
          </section>

          <div className="grid-12" style={{ marginBottom: '64px' }}>
            <div className="col-span-8 glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '340px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '256px', height: '256px', background: 'rgba(171, 209, 160, 0.1)', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0 }}></div>
              <div style={{ position: 'relative', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '32px' }}>eco</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sostenibilidad</span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>CO2 Ahorrado</h3>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px', maxWidth: '400px' }}>Equivalente a plantar 1,240 árboles este semestre mediante el uso de rutas optimizadas y rideshare.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', margin: '24px 0', zIndex: 10 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '56px', fontWeight: 800, color: 'var(--secondary)', lineHeight: 1 }}>{metrics.co2_saved_tons}</span>
                <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Toneladas</span>
              </div>
              <div className="sparkline-container" style={{ zIndex: 10 }}>
                <div className="sparkline-bar" style={{ height: '30%' }}></div>
                <div className="sparkline-bar animate-float" style={{ height: '55%' }}></div>
                <div className="sparkline-bar" style={{ height: '40%' }}></div>
                <div className="sparkline-bar" style={{ height: '80%' }}></div>
                <div className="sparkline-bar active" style={{ height: '95%' }}></div>
              </div>
            </div>

            <div className="col-span-4 glass-card academic-border" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '340px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--tertiary)', fontSize: '32px' }}>group</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Impacto Social</span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700 }}>Viajes Compartidos</h3>
              </div>
              <div style={{ margin: '24px 0' }}>
                <div style={{ fontSize: '48px', fontWeight: 800, color: 'var(--on-surface)', marginBottom: '8px', lineHeight: 1 }}>{metrics.shared_rides_total}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--secondary)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>trending_up</span>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>+{metrics.shared_rides_growth_percent}% este mes</span>
                </div>
              </div>
              <button className="btn btn-secondary" onClick={() => setActiveTab('dashboard')} style={{ width: '100%' }}>Ver Detalles</button>
            </div>

            <div className="col-span-4 glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-secondary-container)' }}>
                  <span className="material-symbols-outlined">verified</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Rutas Validadas</p>
                  <p style={{ fontSize: '24px', fontWeight: 700 }}>{metrics.verified_routes_count}</p>
                </div>
              </div>
              <div>
                <div className="progress-track" style={{ marginBottom: '16px' }}>
                  <div className="progress-track-fill gold" style={{ width: `${(metrics.verified_routes_count / metrics.verified_routes_goal) * 100}%` }}></div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>Meta semestral: {metrics.verified_routes_goal} rutas seguras mapeadas.</p>
              </div>
              <div className="avatar-stack">
                <div className="avatar-stack-placeholder" style={{ backgroundColor: 'var(--primary-fixed)', color: 'var(--on-primary-fixed)' }}>A</div>
                <div className="avatar-stack-placeholder" style={{ backgroundColor: 'var(--tertiary-fixed)', color: 'var(--on-tertiary-fixed)' }}>C</div>
                <div className="avatar-stack-placeholder" style={{ backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)' }}>M</div>
                <div className="avatar-stack-placeholder">+12</div>
              </div>
            </div>

            <div className="col-span-8 heatmap-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="heatmap-header" style={{ padding: '24px', zIndex: 20, backgroundColor: 'rgba(26,28,25,0.85)', borderRadius: '16px 16px 0 0' }}>
                <div>
                  <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff' }}>Mapa de Densidad y Clima</h3>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{getTrafficStatusByTemp(quitoTemp)}</p>
                </div>
                <div className="btn-pill-group">
                  <button className={`btn-pill ${heatmapZone === 'udlapark' ? 'active' : ''}`} onClick={() => setHeatmapZone('udlapark')} style={{ color: '#ffffff' }}>UDLAPARK</button>
                  <button className={`btn-pill ${heatmapZone === 'granados' ? 'active' : ''}`} onClick={() => setHeatmapZone('granados')} style={{ color: '#ffffff' }}>Granados</button>
                  <button className={`btn-pill ${heatmapZone === 'colon' ? 'active' : ''}`} onClick={() => setHeatmapZone('colon')} style={{ color: '#ffffff' }}>Colón</button>
                </div>
              </div>
              <div ref={heatmapContainerRef} style={{ width: '100%', height: '100%', minHeight: '300px', flex: 1 }}></div>
              <div className="heatmap-footer" style={{ padding: '20px 24px', backgroundColor: 'rgba(26,28,25,0.9)', borderRadius: '0 0 16px 16px', zIndex: 20 }}>
                <div>
                  <p className="heatmap-footer-label">Clima Quito</p>
                  <p className="heatmap-footer-val">{quitoTemp !== null ? `${quitoTemp}°C` : '15°C'}</p>
                </div>
                <div>
                  <p className="heatmap-footer-label">Hora Pico</p>
                  <p className="heatmap-footer-val">{metrics.peak_hour}</p>
                </div>
              </div>
            </div>
          </div>

          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 600, borderLeft: '4px solid var(--primary)', paddingLeft: '16px', marginBottom: '32px' }}>Insights de Movilidad</h2>
            <div className="grid-12">
              <div className="col-span-3 insight-card">
                <p className="insight-label">Ahorro Estudiantil</p>
                <p className="insight-val">$12,400 <span>USD total</span></p>
                <div className="progress-track">
                  <div className="progress-track-fill gold" style={{ width: '75%' }}></div>
                </div>
              </div>
              <div className="col-span-3 insight-card">
                <p className="insight-label">Eficiencia de Tiempo</p>
                <p className="insight-val">18 <span>min/día avg.</span></p>
                <div className="progress-track">
                  <div className="progress-track-fill" style={{ width: '50%' }}></div>
                </div>
              </div>
              <div className="col-span-3 insight-card">
                <p className="insight-label">Seguridad Percibida</p>
                <p className="insight-val">4.8 <span>/ 5.0</span></p>
                <div className="progress-track">
                  <div className="progress-track-fill gold" style={{ width: '92%' }}></div>
                </div>
              </div>
              <div className="col-span-3 insight-card">
                <p className="insight-label">Participación Activa</p>
                <p className="insight-val">86% <span>del campus</span></p>
                <div className="progress-track">
                  <div className="progress-track-fill" style={{ width: '86%' }}></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'seguridad' && (
        <div className="container-custom" style={{ padding: 0 }}>
          <section style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 64px auto' }}>
            <div className="tag-badge tag-badge-gold">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>verified_user</span>
              <span>Centro de Confianza</span>
            </div>
            <h1 className="title-display" style={{ fontSize: '40px', marginBottom: '16px' }}>Tu seguridad es nuestra prioridad académica.</h1>
            <p className="subtitle-body" style={{ fontSize: '16px', marginBottom: '32px' }}>Construimos una comunidad de movilidad universitaria basada en la verificación rigurosa, protocolos de seguridad activos y una cultura de respeto mutuo.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => setShowReportModal(true)}>
                <span>Reportar Incidente</span>
                <span className="material-symbols-outlined">flag</span>
              </button>
              <button className="btn btn-secondary" onClick={() => setShowEmergencyModal(true)}>
                <span>Guía de Emergencia</span>
              </button>
            </div>
          </section>

          <div className="grid-12" style={{ marginBottom: '64px' }}>
            <div className="col-span-7 glass-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '380px', position: 'relative' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>Proceso de Verificación</h3>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px', marginBottom: '32px', maxWidth: '400px' }}>Cada miembro de CampusPath pasa por un proceso de validación institucional antes de poder ofrecer o solicitar viajes.</p>
                <div className="safety-flow">
                  <div className="safety-flow-item">
                    <div className="safety-flow-icon">
                      <span className="material-symbols-outlined">school</span>
                    </div>
                    <div>
                      <p className="safety-flow-title">Correo Institucional (.edu.ec)</p>
                      <p className="safety-flow-desc">Verificación obligatoria de dominio universitario activo.</p>
                    </div>
                  </div>
                  <div className="safety-flow-item">
                    <div className="safety-flow-icon">
                      <span className="material-symbols-outlined">badge</span>
                    </div>
                    <div>
                      <p className="safety-flow-title">Identificación Oficial</p>
                      <p className="safety-flow-desc">Cotejo de ID nacional con credencial universitaria vigente.</p>
                    </div>
                  </div>
                  <div className="safety-flow-item">
                    <div className="safety-flow-icon">
                      <span className="material-symbols-outlined">face</span>
                    </div>
                    <div>
                      <p className="safety-flow-title">Reconocimiento Biométrico</p>
                      <p className="safety-flow-desc">Validación de identidad en tiempo real durante el registro.</p>
                    </div>
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined" style={{ position: 'absolute', bottom: '32px', right: '32px', fontSize: '120px', color: 'rgba(113, 88, 35, 0.08)' }}>verified</span>
            </div>

            <div className="col-span-5" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="trust-badge-card" style={{ flex: 1 }}>
                <div>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--tertiary-fixed-dim)', marginBottom: '16px' }}>blanket</span>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Comunidad Segura</h3>
                  <p style={{ fontSize: '13px', opacity: 0.7, marginBottom: '24px' }}>Nuestros índices de confianza reflejan el compromiso de la red de la UDLA.</p>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px', fontSize: '13px' }}>
                    <span>Usuarios Verificados</span>
                    <span style={{ fontWeight: 'bold' }}>99.8%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: '99.8%' }}></div>
                  </div>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '32px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Seguridad en Ruta</h3>
                <div className="safety-grid-mini">
                  <div className="safety-mini-card">
                    <p className="safety-mini-card-val">24/7</p>
                    <p className="safety-mini-card-label">Monitoreo</p>
                  </div>
                  <div className="safety-mini-card">
                    <p className="safety-mini-card-val">SOS</p>
                    <p className="safety-mini-card-label">Botón Pánico</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section style={{ marginBottom: '64px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 600, marginBottom: '32px' }}>Protocolos de Seguridad</h2>
            <div className="grid-12">
              <div className="col-span-4 glass-card academic-border">
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--tertiary)', marginBottom: '16px' }}>location_home</span>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Seguimiento en Vivo</h4>
                <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>Comparte tu ubicación en tiempo real con amigos o familiares de confianza durante todo el viaje.</p>
              </div>
              <div className="col-span-4 glass-card academic-border">
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--tertiary)', marginBottom: '16px' }}>gpp_maybe</span>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Alerta de Desvío</h4>
                <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>Nuestro sistema detecta automáticamente paradas inusuales o cambios de ruta no programados.</p>
              </div>
              <div className="col-span-4 glass-card academic-border">
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--tertiary)', marginBottom: '16px' }}>star_half</span>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Rating de Confianza</h4>
                <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>Sistema de feedback bidireccional obligatorio para mantener los estándares de la comunidad.</p>
              </div>
            </div>
          </section>

          <div className="grid-12">
            <div className="col-span-8 glass-card" style={{ padding: '40px', backgroundColor: 'var(--surface-container-high)', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'relative', zIndex: 10 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Directrices de la Comunidad</h3>
                <div className="grid-12">
                  <div className="col-span-6" style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>check_circle</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '14px' }}>Respeto Mutuo</p>
                      <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Trata a todos los miembros con cortesía y dignidad profesional.</p>
                    </div>
                  </div>
                  <div className="col-span-6" style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>check_circle</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '14px' }}>Puntualidad</p>
                      <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>El tiempo de tus compañeros es valioso. Notifica retrasos con antelación.</p>
                    </div>
                  </div>
                  <div className="col-span-6" style={{ display: 'flex', gap: '12px' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>check_circle</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '14px' }}>Espacios Limpios</p>
                      <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Mantén el vehículo en condiciones óptimas para todos los pasajeros.</p>
                    </div>
                  </div>
                  <div className="col-span-6" style={{ display: 'flex', gap: '12px' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>check_circle</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '14px' }}>Tolerancia Cero</p>
                      <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Cualquier forma de acoso o discriminación resulta en baneo inmediato.</p>
                    </div>
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined" style={{ position: 'absolute', bottom: '-40px', right: '-40px', fontSize: '240px', color: 'rgba(26, 28, 25, 0.03)' }}>groups</span>
            </div>

            <div className="col-span-4" style={{ backgroundColor: 'var(--tertiary)', color: 'var(--on-tertiary)', borderRadius: '24px', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, marginBottom: '16px', color: '#ffffff' }}>¿Necesitas ayuda?</h3>
                <p style={{ fontSize: '14px', opacity: 0.9, lineHeight: 1.5, marginBottom: '32px' }}>Nuestro equipo de soporte especializado está disponible 24/7 para resolver tus dudas o reportes.</p>
              </div>
              <div className="help-links">
                <div className="help-link-card" onClick={() => setShowHelpCenterModal(true)}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Centro de Ayuda</span>
                  <span className="material-symbols-outlined">chevron_right</span>
                </div>
                <div className="help-link-card" onClick={handleOpenLiveSupport}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Chat en Vivo</span>
                  <span className="material-symbols-outlined">chat</span>
                </div>
                <div className="help-link-card" onClick={() => setShowPhoneSupportModal(true)}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Línea Telefónica</span>
                  <span className="material-symbols-outlined">call</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'historial' && (
        <div className="container-custom" style={{ padding: 0 }}>
          <section style={{ marginBottom: '40px' }}>
            <h1 className="title-display" style={{ fontSize: '40px', marginBottom: '8px' }}>Historial de Viajes</h1>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '16px' }}>Registro completo de tus desplazamientos en la red CampusPath.</p>
          </section>

          <div className="grid-12" style={{ marginBottom: '40px' }}>
            <div className="col-span-4 glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '32px' }}>eco</span>
              <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>CO2 total evitado</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 800 }}>{userProfile.co2_avoided_kg} kg</p>
            </div>
            <div className="col-span-4 glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '32px' }}>savings</span>
              <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>Ahorro acumulado</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 800 }}>${(userProfile.estimated_savings_monthly * 3).toFixed(2)}</p>
            </div>
            <div className="col-span-4 glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '32px' }}>route</span>
              <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>Viajes completados</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 800 }}>12</p>
            </div>
          </div>

          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Viajes Recientes</h2>
              <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Julio 2026</span>
            </div>
            {[
              { ruta: 'UDLAPARK \u2192 Col\u00f3n', fecha: '12 de Julio', conductor: 'Alex Rivera', tipo: 'vehiculo', co2: '0.8 kg', ahorro: '$2.50' },
              { ruta: 'UDLA Granados \u2192 UDLAPARK', fecha: '10 de Julio', conductor: 'Mateo G. (T\u00fa)', tipo: 'vehiculo', co2: '0.6 kg', ahorro: '$1.80' },
              { ruta: 'Col\u00f3n \u2192 UDLA Granados', fecha: '08 de Julio', conductor: 'Prof. Clara S.', tipo: 'vehiculo', co2: '1.1 kg', ahorro: '$3.20' },
              { ruta: 'UDLAPARK \u2192 Quito Norte', fecha: '05 de Julio', conductor: 'Caminata en grupo', tipo: 'caminata', co2: '0.0 kg', ahorro: '$0.00' },
              { ruta: 'Granados \u2192 UDLAPARK', fecha: '02 de Julio', conductor: 'Mateo G. (T\u00fa)', tipo: 'vehiculo', co2: '0.6 kg', ahorro: '$1.80' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', borderBottom: i < 4 ? '1px solid rgba(26,28,25,0.05)' : 'none' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: item.tipo === 'caminata' ? 'rgba(115,158,54,0.1)' : 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: item.tipo === 'caminata' ? 'var(--color-primary)' : 'var(--color-accent)', fontSize: '20px' }}>{item.tipo === 'caminata' ? 'directions_walk' : 'directions_car'}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '14px' }}>{item.ruta}</p>
                  <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{item.fecha} \u00b7 {item.conductor}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }}>{item.co2} CO2 evitado</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: 600 }}>{item.ahorro} ahorrado</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'ajustes' && (
        <div className="container-custom" style={{ padding: 0 }}>
          <section style={{ marginBottom: '40px' }}>
            <h1 className="title-display" style={{ fontSize: '40px', marginBottom: '8px' }}>Ajustes</h1>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '16px' }}>Gestiona tu perfil, preferencias de movilidad y configuraci\u00f3n de cuenta.</p>
          </section>

          <div className="grid-12">
            <div className="col-span-7" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-card">
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Perfil de Usuario</h2>
                <form onSubmit={handleUpdateProfile}>
                  <div className="form-group">
                    <label className="form-label">Nombre completo</label>
                    <input type="text" className="form-input" value={tempProfileName} onChange={e => setTempProfileName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Correo institucional</label>
                    <input type="email" className="form-input" value={userEmail} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Veh\u00edculo principal</label>
                    <input type="text" className="form-input" value={tempProfileVehicle} onChange={e => setTempProfileVehicle(e.target.value)} placeholder="Ej. Mazda 3 - Gris Plata" />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary">Guardar cambios</button>
                  </div>
                </form>
              </div>

              <div className="glass-card">
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Preferencias de Movilidad</h2>
                <div className="form-group">
                  <label className="form-label">Rol preferido</label>
                  <select className="form-input">
                    <option value="conductor">Conductor (ofrezco viajes)</option>
                    <option value="pasajero">Pasajero (busco viajes)</option>
                    <option value="ambos">Ambos</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Campus principal</label>
                  <select className="form-input">
                    <option value="campus_udlapark">UDLAPARK</option>
                    <option value="campus_granados">Granados</option>
                    <option value="campus_colon">Col\u00f3n</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" type="button" onClick={() => triggerNotification('Preferencias guardadas')}>Guardar preferencias</button>
                </div>
              </div>
            </div>

            <div className="col-span-5" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Estado de cuenta</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'rgba(115,158,54,0.05)', borderRadius: '8px', marginBottom: '12px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '20px' }}>check_circle</span>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600 }}>Correo verificado</p>
                    <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{userEmail}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--surface-container-low)', borderRadius: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '20px' }}>workspace_premium</span>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600 }}>{userProfile.level}</p>
                    <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{userProfile.badge}</p>
                  </div>
                </div>
              </div>

              <div className="glass-card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Notificaciones</h3>
                {[
                  { label: 'Alertas comunitarias', desc: 'Tr\u00e1fico y situaciones en campus', active: true },
                  { label: 'Nuevos viajes cercanos', desc: 'Conductores disponibles en tu zona', active: true },
                  { label: 'Recordatorios de viaje', desc: '30 minutos antes de tu salida', active: false },
                ].map((notif, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < 2 ? '1px solid rgba(26,28,25,0.05)' : 'none' }}>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600 }}>{notif.label}</p>
                      <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{notif.desc}</p>
                    </div>
                    <div style={{ width: '44px', height: '24px', borderRadius: '12px', backgroundColor: notif.active ? 'var(--color-primary)' : 'var(--surface-container-high)', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', top: '2px', left: notif.active ? '22px' : '2px', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="glass-card" style={{ borderTop: '3px solid var(--color-udla-red)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Zona de peligro</h3>
                <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: '16px' }}>Estas acciones son irreversibles.</p>
                <button className="btn btn-secondary" style={{ color: 'var(--color-udla-red)', borderColor: 'rgba(190,30,45,0.3)', width: '100%' }} onClick={() => triggerNotification('Solicitud enviada al administrador')}>
                  Solicitar eliminaci\u00f3n de cuenta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {showReportModal && (
        <div className="modal-backdrop" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Reportar Incidente</h3>
              <button onClick={() => setShowReportModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleReportIncident}>
              <div className="form-group">
                <label className="form-label">Título del Incidente</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Conductor no se detuvo en UDLAPARK"
                  value={reportTitle}
                  onChange={e => setReportTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  placeholder="Describe detalladamente lo sucedido"
                  value={reportDescription}
                  onChange={e => setReportDescription(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ubicación</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. UDLAPARK - Parqueadero Principal"
                  value={reportLocation}
                  onChange={e => setReportLocation(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Gravedad</label>
                <select
                  className="form-input"
                  value={reportSeverity}
                  onChange={e => setReportSeverity(e.target.value)}
                  required
                >
                  <option value="Bajo">Bajo</option>
                  <option value="Medio">Medio</option>
                  <option value="Alto">Alto</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReportModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Enviar Reporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEmergencyModal && (
        <div className="modal-backdrop" onClick={() => setShowEmergencyModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Guía de Emergencia CampusPath</h3>
              <button onClick={() => setShowEmergencyModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--on-surface-variant)', marginBottom: '16px' }}>
                Si te encuentras en una situación de peligro inmediato o necesitas asistencia urgente durante un trayecto de CampusPath, sigue estos pasos:
              </p>
              <div className="emergency-guide-container">
                <div className="emergency-guide-item">
                  <p className="emergency-guide-title">Línea de Emergencia</p>
                  <p className="emergency-guide-desc">Llama directamente al 911 nacional o al número de emergencia local de tu campus.</p>
                </div>
                <div className="emergency-guide-item">
                  <p className="emergency-guide-title">Botón SOS</p>
                  <p className="emergency-guide-desc">Utiliza la función de alerta SOS en la aplicación móvil para notificar a seguridad.</p>
                </div>
                <div className="emergency-guide-item">
                  <p className="emergency-guide-title">Compartir Ruta</p>
                  <p className="emergency-guide-desc">Asegúrate de que tu seguimiento de viaje esté activo y compartido con tus contactos.</p>
                </div>
                <div className="emergency-guide-item">
                  <p className="emergency-guide-title">Soporte 24/7</p>
                  <p className="emergency-guide-desc">Comunícate con soporte de CampusPath llamando a la línea de ayuda directa.</p>
                </div>
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowEmergencyModal(false)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {showOnboardingModal && (
        <div className="modal-backdrop" onClick={() => setShowOnboardingModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Cómo funciona CampusPath</h3>
              <button onClick={() => setShowOnboardingModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '28px' }}>login</span>
                <div>
                  <p style={{ fontWeight: 600 }}>1. Ingresa con tu Correo UDLA</p>
                  <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>Accede usando tu cuenta institucional edu.ec o ec.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '28px' }}>route</span>
                <div>
                  <p style={{ fontWeight: 600 }}>2. Busca o Programa un Viaje</p>
                  <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>Encuentra compañeros con rutas similares entre UDLAPARK, Granados y Colón.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '28px' }}>safety_check</span>
                <div>
                  <p style={{ fontWeight: 600 }}>3. Viaja Seguro y Ahorra</p>
                  <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>Comparte el costo de movilización y viaja tranquilo dentro de la comunidad verified.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHelpCenterModal && (
        <div className="modal-backdrop" onClick={() => setShowHelpCenterModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Centro de Ayuda</h3>
              <button onClick={() => setShowHelpCenterModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '14px' }}>¿Quiénes pueden usar la plataforma?</p>
                <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Únicamente estudiantes, docentes y personal de la UDLA verificados.</p>
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '14px' }}>¿Tiene algún costo?</p>
                <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>La aplicación es gratuita. El reparto de gastos de gasolina se coordina con el conductor.</p>
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '14px' }}>¿Cómo reportar una conducta inapropiada?</p>
                <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Usa el botón "Reportar Incidente" en la pestaña Seguridad.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPhoneSupportModal && (
        <div className="modal-backdrop" onClick={() => setShowPhoneSupportModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Líneas de Emergencia UDLA</h3>
              <button onClick={() => setShowPhoneSupportModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--surface-container-low)', borderRadius: '8px' }}>
                <span><b>UDLAPARK</b></span>
                <span>+593 2 398 1000 ext. 2500</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--surface-container-low)', borderRadius: '8px' }}>
                <span><b>Granados</b></span>
                <span>+593 2 398 1000 ext. 1200</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--surface-container-low)', borderRadius: '8px' }}>
                <span><b>Colón</b></span>
                <span>+593 2 398 1000 ext. 800</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className="notification-banner">
          <span className="material-symbols-outlined">check_circle</span>
          <span>{notification}</span>
        </div>
      )}

      <footer className="footer">
        <div className="container-custom footer-grid">
          <div>
            <span className="footer-brand">CampusPath</span>
            <p className="footer-logo-desc">Elevando el estándar de la movilidad universitaria a través de tecnología y comunidad.</p>
          </div>
          <div>
            <h5 className="footer-heading">Plataforma</h5>
            <ul className="footer-links">
              <li><button onClick={() => setActiveTab('inicio')} className="footer-link">Eco-mobility</button></li>
              <li><button onClick={() => setActiveTab('seguridad')} className="footer-link">Rutas Seguras</button></li>
              <li><button onClick={() => setActiveTab('dashboard')} className="footer-link">Rideshare Protocol</button></li>
            </ul>
          </div>
          <div>
            <h5 className="footer-heading">Recursos</h5>
            <ul className="footer-links">
              <li><button onClick={() => setActiveTab('dashboard')} className="footer-link">Campus Map</button></li>
              <li><button onClick={() => setActiveTab('seguridad')} className="footer-link">Centro de Ayuda</button></li>
              <li><button onClick={() => setActiveTab('seguridad')} className="footer-link">FAQ</button></li>
            </ul>
          </div>
          <div>
            <h5 className="footer-heading">Legal</h5>
            <ul className="footer-links">
              <li><a href="#" className="footer-link" onClick={e => { e.preventDefault(); triggerNotification('Política de privacidad académica'); }}>Privacy Policy</a></li>
              <li><a href="#" className="footer-link" onClick={e => { e.preventDefault(); triggerNotification('Términos y condiciones de la comunidad'); }}>Términos de Servicio</a></li>
            </ul>
          </div>
        </div>
        <div className="container-custom footer-bottom">
          <p>© 2024 CampusPath University Mobility. All rights reserved.</p>
        </div>
      </footer>
      {showScheduleModal && (
        <div className="modal-backdrop" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Programar Nuevo Viaje</h3>
              <button onClick={() => setShowScheduleModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleScheduleRide}>
              <div className="form-group">
                <label className="form-label">Sede de Origen</label>
                <select
                  className="form-input"
                  value={scheduleOrigin}
                  onChange={e => setScheduleOrigin(e.target.value)}
                  required
                >
                  <option value="udlapark">UDLAPARK</option>
                  <option value="granados">Granados</option>
                  <option value="colon">Colón</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Sede de Destino</label>
                <select
                  className="form-input"
                  value={scheduleDestination}
                  onChange={e => setScheduleDestination(e.target.value)}
                  required
                >
                  <option value="udlapark">UDLAPARK</option>
                  <option value="granados">Granados</option>
                  <option value="colon">Colón</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Hora de Salida</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 08:30 AM"
                  value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Vehículo</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Mazda 3 - Gris"
                  value={scheduleVehicle}
                  onChange={e => setScheduleVehicle(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirmar Viaje
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showChatModal && (
        <div className="modal-backdrop" onClick={() => setShowChatModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Chat: {activeChatDriver}</h3>
              <button onClick={() => setShowChatModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="chat-messages-container">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`chat-bubble ${msg.sender === 'user' ? 'user' : 'driver'}`}>
                  {msg.text}
                </div>
              ))}
            </div>
            <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Escribe tu mensaje..."
                value={newChatMessage}
                onChange={e => setNewChatMessage(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0 16px' }}>
                <span className="material-symbols-outlined">send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {showCalendarModal && (
        <div className="modal-backdrop" onClick={() => setShowCalendarModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Calendario Semanal</h3>
              <button onClick={() => setShowCalendarModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--surface-container-low)', borderRadius: '8px' }}>
                <span><b>Lunes</b></span>
                <span>08:30 AM • UDLAPARK to Granados</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--surface-container-low)', borderRadius: '8px' }}>
                <span><b>Martes</b></span>
                <span>Sin viajes programados</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--surface-container-low)', borderRadius: '8px' }}>
                <span><b>Miércoles</b></span>
                <span>07:30 AM • Colón to UDLAPARK</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--surface-container-low)', borderRadius: '8px' }}>
                <span><b>Jueves</b></span>
                <span>Sin viajes programados</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--surface-container-low)', borderRadius: '8px' }}>
                <span><b>Viernes</b></span>
                <span>17:15 PM • UDLAPARK to Colón</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="modal-backdrop" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Ajustes de Perfil</h3>
              <button onClick={() => setShowSettingsModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label className="form-label">Nombre Completo</label>
                <input
                  type="text"
                  className="form-input"
                  value={tempProfileName}
                  onChange={e => setTempProfileName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Vehículo Principal</label>
                <input
                  type="text"
                  className="form-input"
                  value={tempProfileVehicle}
                  onChange={e => setTempProfileVehicle(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSettingsModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="modal-backdrop" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Historial de Viajes</h3>
              <button onClick={() => setShowHistoryModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
              <div style={{ padding: '12px', borderBottom: '1px solid rgba(26,28,25,0.05)' }}>
                <p style={{ fontWeight: 600, fontSize: '14px' }}>UDLAPARK to Colón</p>
                <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>12 de Julio • Conductor: Alex Rivera</p>
              </div>
              <div style={{ padding: '12px', borderBottom: '1px solid rgba(26,28,25,0.05)' }}>
                <p style={{ fontWeight: 600, fontSize: '14px' }}>UDLA Granados to UDLAPARK</p>
                <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>10 de Julio • Conductor: Mateo G.</p>
              </div>
              <div style={{ padding: '12px', borderBottom: '1px solid rgba(26,28,25,0.05)' }}>
                <p style={{ fontWeight: 600, fontSize: '14px' }}>Colón to UDLA Granados</p>
                <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>08 de Julio • Conductor: Prof. Clara S.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateTripModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateTripModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Crear Nuevo Viaje</h3>
              <button onClick={() => setShowCreateTripModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateTripSubmit}>
              <div className="form-group">
                <label className="form-label">Tipo de Movilidad</label>
                <select className="form-input" value={newTripTipo} onChange={e => setNewTripTipo(e.target.value)}>
                  <option value="caminata">Caminata en Grupo</option>
                  <option value="vehiculo">Vehículo Compartido</option>
                </select>
              </div>
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Origen</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Busca una dirección en Quito..."
                    value={newTripOrigenTexto}
                    onChange={e => {
                      setNewTripOrigenTexto(e.target.value);
                      setOrigenCoords(null);
                      buscarDireccion(e.target.value, 'origen');
                    }}
                    style={{ flex: 1 }}
                  />
                  {origenCoords && <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '20px', flexShrink: 0 }}>check_circle</span>}
                </div>
                {origenSuggestions.length > 0 && (
                  <div className="nominatim-suggestions">
                    {origenSuggestions.map((s, i) => (
                      <div key={i} className="nominatim-suggestion-item" onClick={() => {
                        setNewTripOrigenTexto(s.display_name.split(',')[0]);
                        setOrigenCoords({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
                        setOrigenSuggestions([]);
                      }}>{s.display_name}</div>
                    ))}
                  </div>
                )}
                {!origenCoords && (
                  <div style={{ marginTop: '8px' }}>
                    <label className="form-label" style={{ fontSize: '11px', opacity: 0.7 }}>O elige zona aproximada:</label>
                    <select className="form-input" value={newTripOrigenZona} onChange={e => setNewTripOrigenZona(e.target.value)} style={{ marginTop: '4px' }}>
                      <option value="campus_udlapark">Campus UDLAPARK</option>
                      <option value="campus_granados">Campus Granados</option>
                      <option value="campus_colon">Campus Colon</option>
                      <option value="norte">Quito Norte</option>
                      <option value="sur">Quito Sur</option>
                      <option value="valles">Valles</option>
                      <option value="otro">Otra Ubicacion</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Destino</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Busca una dirección en Quito..."
                    value={newTripDestinoTexto}
                    onChange={e => {
                      setNewTripDestinoTexto(e.target.value);
                      setDestinoCoords(null);
                      buscarDireccion(e.target.value, 'destino');
                    }}
                    style={{ flex: 1 }}
                  />
                  {destinoCoords && <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '20px', flexShrink: 0 }}>check_circle</span>}
                </div>
                {destinoSuggestions.length > 0 && (
                  <div className="nominatim-suggestions">
                    {destinoSuggestions.map((s, i) => (
                      <div key={i} className="nominatim-suggestion-item" onClick={() => {
                        setNewTripDestinoTexto(s.display_name.split(',')[0]);
                        setDestinoCoords({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
                        setDestinoSuggestions([]);
                      }}>{s.display_name}</div>
                    ))}
                  </div>
                )}
                {!destinoCoords && (
                  <div style={{ marginTop: '8px' }}>
                    <label className="form-label" style={{ fontSize: '11px', opacity: 0.7 }}>O elige zona aproximada:</label>
                    <select className="form-input" value={newTripDestinoZona} onChange={e => setNewTripDestinoZona(e.target.value)} style={{ marginTop: '4px' }}>
                      <option value="campus_udlapark">Campus UDLAPARK</option>
                      <option value="campus_granados">Campus Granados</option>
                      <option value="campus_colon">Campus Colon</option>
                      <option value="norte">Quito Norte</option>
                      <option value="sur">Quito Sur</option>
                      <option value="valles">Valles</option>
                      <option value="otro">Otra Ubicacion</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Hora de Salida</label>
                <input type="text" className="form-input" placeholder="ej. 17:15 PM" value={newTripHora} onChange={e => setNewTripHora(e.target.value)} required />
              </div>
              {newTripTipo === 'caminata' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Punto de Encuentro</label>
                    <input type="text" className="form-input" placeholder="ej. Entrada Bloque D" value={newTripPuntoEncuentro} onChange={e => setNewTripPuntoEncuentro(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cupo Máximo</label>
                    <input type="number" className="form-input" placeholder="ej. 5" value={newTripCupoMaximo} onChange={e => setNewTripCupoMaximo(e.target.value)} required />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label className="form-label">Asientos Disponibles</label>
                  <input type="number" className="form-input" placeholder="ej. 4" value={newTripAsientos} onChange={e => setNewTripAsientos(e.target.value)} required />
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateTripModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Crear Viaje
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        </div>
      </main>
    </div>
    </ProtectedRoute>
  );
}

export default App;

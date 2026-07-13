import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import './App.css';

interface ActiveRide {
  id: number;
  driver: string;
  vehicle: string;
  status: string;
  eta: string;
  location: string;
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

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => localStorage.getItem('campuspath_logged_in') === 'true');
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>('inicio');
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
  const [trips, setTrips] = useState<UpcomingTrip[]>([
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

  const campusCoords: Record<string, [number, number]> = {
    udlapark: [-0.1622, -78.4560],
    granados: [-0.1676, -78.4727],
    colon: [-0.2022, -78.4851]
  };

  const API_BASE_URL = 'http://localhost:8000/api/v1';

  const checkStatus = async () => {
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

        const tripsRes = await fetch(`${API_BASE_URL}/trips`);
        if (tripsRes.ok) {
          const tripsData = await tripsRes.json();
          setTrips(tripsData);
        }

        const metricsRes = await fetch(`${API_BASE_URL}/metrics`);
        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          setMetrics(metricsData);
        }
      } else {
        setBackendConnected(false);
      }
    } catch (err) {
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
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

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
  }, [activeTab]);

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
  }, [activeTab]);

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
    setLoginError(null);
    setIsLoggedIn(true);
    setActiveTab('inicio');
  };

  const handleLogout = () => {
    localStorage.removeItem('campuspath_logged_in');
    setIsLoggedIn(false);
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
    return (
      <div className="login-container">
        <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(158, 28, 50, 0.1)', filter: 'blur(60px)', top: '10%', left: '10%' }}></div>
        <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(67, 100, 60, 0.1)', filter: 'blur(60px)', bottom: '10%', right: '10%' }}></div>
        
        <div className="glass-card login-card">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 className="logo" style={{ fontSize: '32px', marginBottom: '8px' }}>CampusPath</h2>
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
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'dashboard') {
    return (
      <div className="sidebar-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <span className="logo" onClick={() => setActiveTab('inicio')}>CampusPath</span>
          </div>
          <nav className="sidebar-nav">
            <div className="sidebar-section-title">Ecosistema</div>
            <button className="sidebar-item active">
              <span className="material-symbols-outlined">dashboard</span>
              <span>Dashboard</span>
            </button>
            <button className="sidebar-item" onClick={() => setActiveTab('impacto')}>
              <span className="material-symbols-outlined">map</span>
              <span>Mapa</span>
            </button>
            <button className="sidebar-item" onClick={() => setActiveTab('inicio')}>
              <span className="material-symbols-outlined">directions_car</span>
              <span>Rides</span>
            </button>
            <button className="sidebar-item" onClick={() => setActiveTab('seguridad')}>
              <span className="material-symbols-outlined">group</span>
              <span>Comunidad</span>
            </button>
            <div className="sidebar-section-title">Personal</div>
            <button className="sidebar-item" onClick={() => setShowHistoryModal(true)}>
              <span className="material-symbols-outlined">history</span>
              <span>Historial</span>
            </button>
            <button className="sidebar-item" onClick={() => setShowSettingsModal(true)}>
              <span className="material-symbols-outlined">settings</span>
              <span>Ajustes</span>
            </button>
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-profile" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => setShowSettingsModal(true)}>
                <div className="sidebar-profile-avatar">M</div>
                <div className="sidebar-profile-info">
                  <p className="sidebar-profile-name">{userProfile.name}</p>
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
              <div className="notification-badge" onClick={() => triggerNotification('No tienes notificaciones pendientes')}>
                <span className="material-symbols-outlined">notifications</span>
              </div>
              <button className="btn btn-primary" onClick={() => setShowScheduleModal(true)}>
                <span className="material-symbols-outlined">add</span>
                <span>Programar Viaje</span>
              </button>
            </div>
          </header>

          <div className="dashboard-scroll">
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
                      <div key={ride.id} className="ride-card">
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
                        <button className="btn btn-secondary" onClick={() => handleOpenDriverChat(ride.driver)} style={{ width: '100%', padding: '8px', fontSize: '12px' }}>
                          Chat con Conductor
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="trips-section">
                  <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Próximos Viajes</h2>
                  <div className="trips-list">
                    {trips.map((trip, idx) => (
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
          </div>
        </main>

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

        {notification && (
          <div className="notification-banner">
            <span className="material-symbols-outlined">check_circle</span>
            <span>{notification}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <header className="header-nav">
        <div className="container-custom header-container">
          <span className="logo" onClick={() => setActiveTab('inicio')}>CampusPath</span>
          <nav className="nav-links">
            <button className={`nav-link ${activeTab === 'inicio' ? 'active' : ''}`} onClick={() => setActiveTab('inicio')}>Rutas</button>
            <button className="nav-link" onClick={() => setActiveTab('dashboard')}>Rides</button>
            <button className="nav-link" onClick={() => setActiveTab('dashboard')}>Mapa</button>
            <button className={`nav-link ${activeTab === 'impacto' ? 'active' : ''}`} onClick={() => setActiveTab('impacto')}>Impacto</button>
            <button className={`nav-link ${activeTab === 'seguridad' ? 'active' : ''}`} onClick={() => setActiveTab('seguridad')}>Seguridad</button>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '11px', color: backendConnected ? 'var(--primary)' : 'var(--error)', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{backendConnected ? 'wifi' : 'wifi_off'}</span>
              {backendConnected ? 'Conectado' : 'Sin conexión'}
            </span>
            <button className="nav-link" onClick={() => setActiveTab('dashboard')} style={{ border: 'none' }}>Community</button>
            <button className="nav-link" onClick={handleLogout} style={{ border: 'none', color: 'var(--error)' }}>Cerrar sesión</button>
            <div className="user-avatar" onClick={() => setActiveTab('dashboard')} style={{ cursor: 'pointer' }}>
              <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--primary-fixed)', color: 'var(--on-primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                M
              </div>
            </div>
          </div>
        </div>
      </header>

      {activeTab === 'inicio' && (
        <main>
          <section className="hero-section">
            <div className="hero-bg">
              <div className="hero-overlay"></div>
              <img
                className="hero-img"
                src="/udlapark.jpg"
                alt="Modern University Campus"
              />
            </div>
            <div className="container-custom">
              <div className="hero-content">
                <span className="tag-badge">#EcoMobilityUDLA</span>
                <h1 className="title-display">
                  Muévete con la <br/><span>Comunidad UDLA</span>
                </h1>
                <p className="subtitle-body">
                  La plataforma de movilidad colaborativa de la Universidad de las Américas. Conecta con compañeros, programa viajes entre UDLAPARK, Granados y Colón, y optimiza tus traslados diarios en Quito.
                </p>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => setActiveTab('dashboard')} style={{ padding: '16px 32px', borderRadius: '12px' }}>
                    Comenzar ahora
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowOnboardingModal(true)} style={{ padding: '16px 32px', borderRadius: '12px' }}>
                    <span className="material-symbols-outlined">play_circle</span>
                    <span>Ver cómo funciona</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section style={{ backgroundColor: 'var(--surface)', padding: '80px 0' }}>
            <div className="container-custom stats-grid">
              <div className="glass-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('impacto')}>
                <span className="material-symbols-outlined stat-card-icon">eco</span>
                <h3 className="stat-card-title">{metrics.co2_saved_tons} Toneladas</h3>
                <p className="stat-card-desc">CO2 ahorrado este semestre por la comunidad UDLA.</p>
              </div>
              <div className="glass-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
                <span className="material-symbols-outlined stat-card-icon" style={{ color: 'var(--secondary)' }}>group</span>
                <h3 className="stat-card-title">+4,500 Miembros</h3>
                <p className="stat-card-desc">Estudiantes y docentes compartiendo viajes diariamente.</p>
              </div>
              <div className="glass-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('seguridad')}>
                <span className="material-symbols-outlined stat-card-icon" style={{ color: 'var(--tertiary-container)' }}>verified</span>
                <h3 className="stat-card-title">100% Verificado</h3>
                <p className="stat-card-desc">Acceso exclusivo con correo institucional UDLA.</p>
              </div>
            </div>
          </section>

          <section className="asymmetric-section">
            <div className="container-custom grid-12" style={{ alignItems: 'center' }}>
              <div className="col-span-7" style={{ position: 'relative' }}>
                <div className="asymmetric-image-wrapper">
                  <img
                    src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop"
                    alt="CampusPath App UI Mockup"
                  />
                </div>
                <div className="asymmetric-deco"></div>
              </div>
              <div className="col-span-5 flex flex-col" style={{ gap: '32px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 600, marginBottom: '8px' }}>Tu camino, simplificado</h2>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '15px' }}>Conecta fácilmente las sedes UDLAPARK, Granados y Colón con rutas compartidas seguras.</p>
                </div>
                <div className="features-list">
                  <div className="feature-item">
                    <div className="feature-icon-box">
                      <span className="material-symbols-outlined">route</span>
                    </div>
                    <div>
                      <h4 className="feature-title">Rutas Optimizadas</h4>
                      <p className="feature-desc">Mapeamos el camino más rápido entre campus considerando las condiciones del tráfico en Quito.</p>
                    </div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon-box">
                      <span className="material-symbols-outlined">directions_car</span>
                    </div>
                    <div>
                      <h4 className="feature-title">Rides Compartidos</h4>
                      <p className="feature-desc">Conéctate con compañeros con horarios y rutas similares para compartir gastos de traslado.</p>
                    </div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon-box">
                      <span className="material-symbols-outlined">hub</span>
                    </div>
                    <div>
                      <h4 className="feature-title">Comunidad Activa</h4>
                      <p className="feature-desc">Acumula puntos por viajes ecológicos y canjéalos por beneficios universitarios.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="security-banner-section">
            <div className="container-custom">
              <div className="security-banner">
                <div className="security-banner-content">
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700, marginBottom: '16px' }}>Seguridad que inspira confianza</h2>
                  <p style={{ fontSize: '16px', lineHeight: 1.6, opacity: 0.9, marginBottom: '32px' }}>
                    Nuestra red de verificación institucional valida a cada estudiante y miembro del personal de la UDLA, brindando una experiencia de viaje confiable en todo momento.
                  </p>
                  <div className="security-grid">
                    <div className="security-item">
                      <span className="material-symbols-outlined">shield_lock</span>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>Verificación .edu.ec</span>
                    </div>
                    <div className="security-item">
                      <span className="material-symbols-outlined">location_searching</span>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>Rastreo GPS de Ruta</span>
                    </div>
                    <div className="security-item">
                      <span className="material-symbols-outlined">emergency</span>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>Soporte de Emergencia</span>
                    </div>
                    <div className="security-item">
                      <span className="material-symbols-outlined">star</span>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>Evaluaciones Mutuas</span>
                    </div>
                  </div>
                  <button className="btn btn-tertiary" onClick={() => setActiveTab('seguridad')} style={{ padding: '14px 28px' }}>
                    Leer sobre el Protocolo de Seguridad
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="cta-section">
            <div className="container-custom">
              <h2 className="cta-title">Únete a la movilidad inteligente</h2>
              <p className="cta-desc">
                Comienza a compartir tus traslados diarios y viaja de forma sostenible entre las sedes de la UDLA en Quito.
              </p>
              <div className="cta-buttons">
                <a href="#" className="app-store-btn" onClick={e => { e.preventDefault(); triggerNotification('Próximamente disponible en App Store'); }}>
                  <span className="material-symbols-outlined">apps</span>
                  <div className="app-store-text">
                    <p className="app-store-sub">Descargar en</p>
                    <p className="app-store-main">App Store</p>
                  </div>
                </a>
                <a href="#" className="app-store-btn" onClick={e => { e.preventDefault(); triggerNotification('Próximamente disponible en Google Play'); }}>
                  <span className="material-symbols-outlined">play_arrow</span>
                  <div className="app-store-text">
                    <p className="app-store-sub">Disponible en</p>
                    <p className="app-store-main">Google Play</p>
                  </div>
                </a>
              </div>
            </div>
          </section>
        </main>
      )}

      {activeTab === 'impacto' && (
        <main className="container-custom" style={{ minHeight: '80vh', paddingTop: '48px', paddingBottom: '80px' }}>
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
        </main>
      )}

      {activeTab === 'seguridad' && (
        <main className="container-custom" style={{ minHeight: '80vh', paddingTop: '48px', paddingBottom: '80px' }}>
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
        </main>
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
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--error)', color: '#ffffff' }}>
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
    </div>
  );
}

export default App;

import { useRef } from 'react';
import { Logo } from '../Logo';

interface LandingPageProps {
  onStart: () => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  const heroCardRef = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, ref: React.RefObject<HTMLDivElement | null>) => {
    const card = ref.current;
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

  const handleMouseLeave = (ref: React.RefObject<HTMLDivElement | null>) => {
    const card = ref.current;
    if (!card) return;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  };

  return (
    <div className="landing-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>
      <header className="header-nav" style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'rgba(250, 250, 244, 0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="container-custom header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '72px' }}>
          <div className="logo" style={{ cursor: 'pointer' }}>
            <Logo size={32} showText={true} />
          </div>
          <button className="btn btn-secondary" onClick={onStart} style={{ padding: '8px 20px', fontSize: '14px' }}>
            Ingresar
          </button>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <section className="landing-hero" style={{ padding: '96px 0', position: 'relative', overflow: 'hidden' }}>
          <div className="container-custom hero-grid-responsive">
            <div>
              <div className="tag-badge" style={{ backgroundColor: 'rgba(115, 158, 54, 0.1)', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 16px', borderRadius: '50px', fontWeight: '600', fontSize: '12px', marginBottom: '24px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>shield</span>
                Sostenibilidad y Seguridad UDLA
              </div>
              <h1 className="title-display" style={{ fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: '800', lineHeight: '1.15', color: 'var(--color-text)', marginBottom: '24px' }}>
                Movilidad compartida y segura para la <span style={{ color: 'var(--color-primary)' }}>Comunidad UDLA</span>
              </h1>
              <p className="subtitle-body" style={{ fontSize: '18px', color: 'var(--on-surface-variant)', marginBottom: '32px', lineHeight: '1.6' }}>
                Conéctate con compañeros, docentes y administrativos para compartir tus traslados diarios de forma cómoda, económica y ecológica entre los campus UDLAPARK, Granados y Colón.
              </p>
              <button className="btn btn-primary" onClick={onStart} style={{ padding: '16px 32px', borderRadius: '12px', fontSize: '16px' }}>
                Empezar ahora
              </button>
            </div>
            
            <div
              ref={heroCardRef}
              className="glass-card tilt-3d"
              onMouseMove={(e) => handleMouseMove(e, heroCardRef)}
              onMouseLeave={() => handleMouseLeave(heroCardRef)}
              style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(212, 175, 55, 0.25)' }}
            >
              <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(115, 158, 54, 0.1)', filter: 'blur(40px)' }}></div>
              <div className="logo" style={{ marginBottom: '8px' }}>
                <Logo size={40} showText={true} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '700' }}>¿Listo para el cambio?</h2>
              <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', lineHeight: '1.6' }}>
                Únete a la plataforma ecológica de movilidad y reduce la congestión vial, ahorra dinero y disminuye las emisiones de CO2 de nuestra universidad.
              </p>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <div style={{ flex: 1, backgroundColor: 'rgba(115, 158, 54, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(115, 158, 54, 0.1)' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '24px', marginBottom: '8px' }}>eco</span>
                  <p style={{ fontWeight: '700', fontSize: '16px' }}>Ecológico</p>
                  <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Menos autos en Quito</p>
                </div>
                <div style={{ flex: 1, backgroundColor: 'rgba(212, 175, 55, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '24px', marginBottom: '8px' }}>payments</span>
                  <p style={{ fontWeight: '700', fontSize: '16px' }}>Económico</p>
                  <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>Divide costos de viaje</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={{ backgroundColor: 'var(--color-surface)', padding: '96px 0', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="container-custom">
            <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 48px auto' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: '700', marginBottom: '16px' }}>Cómo funciona la plataforma</h2>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '16px', lineHeight: '1.6' }}>Descubre las tres modalidades clave para moverte de manera coordinada y segura todos los días.</p>
            </div>
            
            <div className="landing-cards-grid">
              <div
                ref={card1Ref}
                className="glass-card tilt-3d"
                onMouseMove={(e) => handleMouseMove(e, card1Ref)}
                onMouseLeave={() => handleMouseLeave(card1Ref)}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '32px', border: '1px solid rgba(115, 158, 54, 0.15)' }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(115, 158, 54, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>directions_walk</span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '700' }}>Grupos a pie</h3>
                <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', lineHeight: '1.6' }}>
                  Programa caminatas colectivas hacia puntos de encuentro o estaciones de buses cercanas al campus. Viaja seguro y acompañado por otros estudiantes.
                </p>
              </div>

              <div
                ref={card2Ref}
                className="glass-card tilt-3d"
                onMouseMove={(e) => handleMouseMove(e, card2Ref)}
                onMouseLeave={() => handleMouseLeave(card2Ref)}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '32px', border: '1px solid rgba(212, 175, 55, 0.15)' }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>directions_car</span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '700' }}>Viajes con paradas</h3>
                <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', lineHeight: '1.6' }}>
                  Si tienes vehículo propio, programa tu ruta indicando paradas intermedias para recoger pasajeros. Si eres pasajero, reserva un asiento en segundos.
                </p>
              </div>

              <div
                ref={card3Ref}
                className="glass-card tilt-3d"
                onMouseMove={(e) => handleMouseMove(e, card3Ref)}
                onMouseLeave={() => handleMouseLeave(card3Ref)}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '32px', border: '1px solid rgba(212, 175, 55, 0.2)' }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>notifications_active</span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '700' }}>Alertas en vivo</h3>
                <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', lineHeight: '1.6' }}>
                  Recibe y publica alertas sobre el estado del tráfico, congestiones vehiculares o situaciones de seguridad informadas por la comunidad en tiempo real.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: '80px 0' }}>
          <div className="container-custom" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
            <div style={{ backgroundColor: 'rgba(115, 158, 54, 0.05)', border: '1px solid rgba(115, 158, 54, 0.15)', borderRadius: '24px', padding: '40px', position: 'relative' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '120px', color: 'rgba(115, 158, 54, 0.08)', position: 'absolute', bottom: '20px', right: '20px' }}>verified_user</span>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined">verified</span>
                Filtro Institucional Estricto
              </h3>
              <p style={{ fontSize: '15px', color: 'var(--color-text)', lineHeight: '1.6', marginBottom: '24px' }}>
                El acceso a la plataforma está restringido exclusivamente a estudiantes, docentes y personal con correos institucionales válidos de la universidad.
              </p>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '18px' }}>check_circle</span>
                  udla.edu.ec
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '18px' }}>check_circle</span>
                  udla.ec
                </div>
              </div>
            </div>
            
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: '700', marginBottom: '16px' }}>Tu seguridad es lo primero</h2>
              <p style={{ fontSize: '16px', color: 'var(--on-surface-variant)', lineHeight: '1.7', marginBottom: '24px' }}>
                Diseñado para crear un entorno de confianza. Al validar cada cuenta de correo contra el directorio institucional de la UDLA, nos aseguramos de que compartas tus rutas solo con miembros activos de nuestra comunidad académica.
              </p>
              <button className="btn btn-primary" onClick={onStart} style={{ padding: '12px 24px', borderRadius: '10px' }}>
                Ingresar ahora
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer" style={{ backgroundColor: 'var(--surface-dim)', color: 'var(--on-surface-variant)', borderTop: '1px solid var(--color-border)', padding: '40px 0', marginTop: 'auto' }}>
        <div className="container-custom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          <div style={{ color: 'var(--color-text)' }}>
            <Logo size={24} showText={true} />
            <p style={{ fontSize: '12px', marginTop: '8px', color: 'var(--on-surface-variant)', opacity: 0.8 }}>Conectando la comunidad de la Universidad de las Américas.</p>
          </div>
          <div style={{ display: 'flex', gap: '24px', fontSize: '13px', fontWeight: '600', color: 'var(--color-text)' }}>
            <span>Campus UDLAPARK</span>
            <span>Campus Granados</span>
            <span>Campus Colón</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

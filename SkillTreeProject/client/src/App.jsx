import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const API_URL = 'https://rare-doors-call.loca.lt';

function App() {
  const [skills, setSkills] = useState({});
  const transformComponentRef = useRef(null);

  const fetchSkills = async () => {
    try {
      const res = await fetch(`${API_URL}/skills`, {
        headers: { "Bypass-Tunnel-Reminder": "true" }
      });
      const data = await res.json();
      setSkills(data);
    } catch (err) { console.error("API Error"); }
  };

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    fetchSkills();

    // Центруємо дерево відразу після того, як дані завантажаться
    const timer = setTimeout(() => {
      if (transformComponentRef.current) {
        // centerView(масштаб, час анімації)
        transformComponentRef.current.centerView(0.7, 0); 
      }
    }, 500); // Даємо трохи більше часу на рендер вузлів

    const interval = setInterval(fetchSkills, 3000);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    }
  }, []);

  const trainSkill = async (id) => {
    try {
      await fetch(`${API_URL}/train/${id}`, { 
        method: 'POST',
        headers: { "Bypass-Tunnel-Reminder": "true" }
      });
      fetchSkills();
    } catch (err) { console.error("Train error"); }
  };

  return (
    <div style={{ 
      background: '#020617', 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden', 
      position: 'fixed',
      left: 0,
      top: 0
    }}>
      
      <header style={{ 
        position: 'absolute', top: '20px', width: '100%', 
        textAlign: 'center', zIndex: 10, pointerEvents: 'none' 
      }}>
        <h2 style={{ color: '#fff', fontSize: '10px', letterSpacing: '4px', opacity: 0.4, margin: 0 }}>
          NEURAL INTERFACE v1.0
        </h2>
      </header>

      <TransformWrapper
        ref={transformComponentRef}
        initialScale={0.7}
        minScale={0.3}
        maxScale={2}
        centerOnInit={true}
        limitToBounds={false} // Дозволяє вільно переміщати дерево без обмежень "стінами"
      >
        <TransformComponent 
          wrapperStyle={{ width: "100vw", height: "100vh" }}
          contentStyle={{ 
            width: "800px", 
            height: "1000px", 
            display: "flex", 
            alignItems: "flex-start", // Притискаємо до верху віртуального поля
            justifyContent: "center" 
          }}
        >
          {/* Саме полотно з координатами */}
          <div style={{ width: "800px", height: "1000px", position: "relative" }}>
            
            <svg style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1 }}>
              {Object.entries(skills).map(([id, data]) => {
                if (data.parent && skills[data.parent]) {
                  const p1 = skills[data.parent].pos;
                  const p2 = data.pos;
                  return (
                    <line 
                      key={`line-${id}`}
                      x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} 
                      stroke={data.level > 0 ? "#3b82f6" : "#1e293b"} 
                      strokeWidth="2.5"
                      style={{ opacity: 0.25 }}
                    />
                  );
                }
                return null;
              })}
            </svg>

            {Object.entries(skills).map(([id, data]) => (
              <motion.div
                key={id}
                onClick={() => {
                  if (window.Telegram?.WebApp?.HapticFeedback) {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                  }
                  trainSkill(id);
                }}
                whileTap={{ scale: 0.85 }}
                style={{
                  position: 'absolute',
                  left: data.pos.x,
                  top: data.pos.y,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 2,
                  background: '#0f172a',
                  border: `2px solid ${data.level >= 100 ? '#3b82f6' : '#334155'}`,
                  borderRadius: '50%',
                  width: '70px', height: '70px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  boxShadow: data.level >= 100 ? '0 0 20px rgba(59, 130, 246, 0.4)' : 'none',
                  cursor: 'pointer'
                }}
              >
                <span style={{ color: '#fff', fontSize: '9px', fontWeight: 'bold', textAlign: 'center' }}>{data.name}</span>
                <span style={{ color: '#3b82f6', fontSize: '11px' }}>{Math.floor(data.level)}%</span>
              </motion.div>
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}

export default App;
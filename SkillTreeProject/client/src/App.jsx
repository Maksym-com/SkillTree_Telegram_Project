import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const API_URL = 'https://skilltree-telegram-project.onrender.com';

function App() {
  const [skills, setSkills] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMode, setPopupMode] = useState('menu'); // 'menu' або 'create'
  const [selectedSkill, setSelectedSkill] = useState(null); // ID обраного скіла
  const [newSkillName, setNewSkillName] = useState('');
  const transformComponentRef = useRef(null);

  const fetchSkills = async () => {
    try {
      const cleanUrl = API_URL.replace(/\/$/, '');
      const res = await fetch(`${cleanUrl}/skills`, {
        headers: { "Bypass-Tunnel-Reminder": "true" }
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setSkills(data);
    } catch (err) { 
      console.error("API Error:", err); 
    }
  };

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    fetchSkills();
    const timer = setTimeout(() => {
      if (transformComponentRef.current && skills) {
        transformComponentRef.current.centerView(0.7, 0); 
      }
    }, 800); 
    const interval = setInterval(fetchSkills, 3000);
    return () => { clearInterval(interval); clearTimeout(timer); }
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

  const handleAddSkill = async () => {
    if (!newSkillName.trim()) return;
    try {
      const newId = newSkillName.toLowerCase().trim().replace(/\s+/g, '_');
      const res = await fetch(`${API_URL}/skills/add`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          "Bypass-Tunnel-Reminder": "true" 
        },
        body: JSON.stringify({
          id: newId,
          name: newSkillName,
          parent_id: selectedSkill //selectedSkill тепер виступає як parent для нового
        })
      });
      if (res.ok) {
        setNewSkillName('');
        setShowPopup(false);
        fetchSkills();
      }
    } catch (err) { console.error("Add skill error"); }
  };

  const handleDelete = async (id) => {
    if (window.confirm(`Видалити "${skills[id].name}" та всі пов'язані навички?`)) {
      try {
        await fetch(`${API_URL}/skills/${id}`, { 
          method: 'DELETE',
          headers: { "Bypass-Tunnel-Reminder": "true" }
        });
        setShowPopup(false);
        fetchSkills();
      } catch (err) { console.error("Delete error"); }
    }
  };

  // Стиль для кнопок у меню
  const menuButtonStyle = (color) => ({
    width: '100%',
    padding: '14px',
    marginBottom: '10px',
    borderRadius: '12px',
    border: `1px solid ${color}`,
    background: 'rgba(15, 23, 42, 0.5)',
    color: color,
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  });

  if (!skills) {
    return (
      <div style={{ background: '#020617', width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ opacity: 0.5, letterSpacing: '2px' }}>CONNECTING TO NEURAL NETWORK...</h2>
          <p style={{ fontSize: '10px', color: '#3b82f6' }}>Waiting for Render to wake up</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#020617', width: '100vw', height: '100vh', overflow: 'hidden', position: 'fixed', left: 0, top: 0 }}>
      <header style={{ position: 'absolute', top: '20px', width: '100%', textAlign: 'center', zIndex: 10, pointerEvents: 'none' }}>
        <h2 style={{ color: '#fff', fontSize: '10px', letterSpacing: '4px', opacity: 0.4, margin: 0 }}>
          NEURAL INTERFACE v1.0
        </h2>
      </header>

      <TransformWrapper
        ref={transformComponentRef}
        initialScale={0.7}
        minScale={0.3}
        maxScale={2}
        limitToBounds={false}
      >
        <TransformComponent wrapperStyle={{ width: "100vw", height: "100vh" }} contentStyle={{ width: "800px", height: "1000px" }}>
          <div style={{ width: "800px", height: "1000px", position: "relative" }}>
            
            <svg style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1 }}>
              {Object.entries(skills).map(([id, data]) => {
                if (data?.parent && skills[data.parent]) {
                  const p1 = skills[data.parent].pos;
                  const p2 = data.pos;
                  return (
                    <line 
                      key={`line-${id}`}
                      x1={p1?.x} y1={p1?.y} x2={p2?.x} y2={p2?.y} 
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
              <div key={id} style={{ position: 'absolute', left: data?.pos?.x || 0, top: data?.pos?.y || 0, transform: 'translate(-50%, -50%)', zIndex: 2 }}>
                <motion.div
                  onClick={() => {
                    if (window.Telegram?.WebApp?.HapticFeedback) {
                      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                    }
                    setSelectedSkill(id);
                    setPopupMode('menu');
                    setShowPopup(true);
                  }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    background: '#0f172a',
                    border: `2px solid ${data.level >= 100 ? '#3b82f6' : '#334155'}`,
                    borderRadius: '50%',
                    width: '75px', height: '75px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    boxShadow: data.level >= 100 ? '0 0 20px rgba(59, 130, 246, 0.4)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ color: '#fff', fontSize: '9px', fontWeight: 'bold', textAlign: 'center', padding: '0 5px' }}>{data.name}</span>
                  <span style={{ color: '#3b82f6', fontSize: '11px' }}>{Math.floor(data.level)}%</span>
                </motion.div>
              </div>
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>

      <AnimatePresence>
        {showPopup && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(2, 6, 23, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
              style={{ background: '#1e293b', padding: '30px', borderRadius: '24px', border: '1px solid #3b82f6', width: '280px' }}
            >
              {popupMode === 'menu' ? (
                <>
                  <h2 style={{ color: '#fff', fontSize: '18px', marginBottom: '20px', textAlign: 'center' }}>
                    {skills[selectedSkill]?.name.toUpperCase()}
                  </h2>
                  
                  <button onClick={() => { trainSkill(selectedSkill); setShowPopup(false); }} style={menuButtonStyle("#3b82f6")}>
                    ⚡ TRAIN SKILL
                  </button>
                  
                  <button onClick={() => setPopupMode('create')} style={menuButtonStyle("#10b981")}>
                    ➕ ADD BRANCH
                  </button>
                  
                  <button onClick={() => handleDelete(selectedSkill)} style={menuButtonStyle("#ef4444")}>
                    🗑️ DELETE
                  </button>
                  
                  <button onClick={() => setShowPopup(false)} style={{ width: '100%', color: '#64748b', background: 'none', border: 'none', marginTop: '15px', cursor: 'pointer', fontSize: '14px' }}>
                    CANCEL
                  </button>
                </>
              ) : (
                <>
                  <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '15px', textAlign: 'center' }}>
                    NEW SKILL UNDER {skills[selectedSkill]?.name}
                  </h3>
                  <input 
                    autoFocus
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    placeholder="Enter skill name..."
                    style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#0f172a', color: '#fff', border: '1px solid #334155', marginBottom: '20px', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setPopupMode('menu')} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#334155', color: '#fff', border: 'none', fontWeight: 'bold' }}>BACK</button>
                    <button onClick={handleAddSkill} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 'bold' }}>CREATE</button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
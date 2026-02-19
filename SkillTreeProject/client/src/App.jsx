import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const API_URL = 'https://skilltree-telegram-project.onrender.com';

function App() {
  const [skills, setSkills] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMode, setPopupMode] = useState('menu');
  const [selectedSkill, setSelectedSkill] = useState(null); 
  const [newSkillName, setNewSkillName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const transformComponentRef = useRef(null);
  const inputRef = useRef(null); // Для фокусу клавіатури

  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/skills`, {
        headers: { "Bypass-Tunnel-Reminder": "true" }
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setSkills(data);
    } catch (err) { 
      console.error("API Error:", err); 
    }
  }, []);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    fetchSkills();
    
    const timer = setTimeout(() => {
      if (transformComponentRef.current) {
        transformComponentRef.current.centerView(0.7, 0); 
      }
    }, 800); 

    const interval = setInterval(fetchSkills, 10000); // 10 сек достатньо, щоб не спамити сервер
    return () => { clearInterval(interval); clearTimeout(timer); }
  }, [fetchSkills]);

  // Фокус на інпуті при переході в режим створення
  useEffect(() => {
    if (popupMode === 'create' && showPopup) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [popupMode, showPopup]);

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
    if (!newSkillName.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Більш надійний генератор унікальних ID
      const randomStr = Math.random().toString(36).substring(2, 7);
      const uniqueId = `${newSkillName.toLowerCase().trim().replace(/\s+/g, '_')}_${randomStr}`;
      
      const res = await fetch(`${API_URL}/skills/add`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          "Bypass-Tunnel-Reminder": "true" 
        },
        body: JSON.stringify({
          id: uniqueId,
          name: newSkillName.trim(),
          parent_id: selectedSkill
        })
      });

      if (res.ok) {
        setNewSkillName('');
        setShowPopup(false);
        fetchSkills();
      } else {
        const errorData = await res.json();
        alert(errorData.detail || "Error adding skill");
      }
    } catch (err) { 
      console.error("Add skill error"); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    // Не дозволяємо видаляти корінь через фронтенд
    if (id === 'root') return alert("Cannot delete Core node");

    if (window.confirm(`Видалити "${skills[id].name}" та всіх нащадків?`)) {
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
    gap: '10px',
    transition: 'all 0.2s'
  });

  if (!skills) {
    return (
      <div style={{ background: '#020617', width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <motion.h2 
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          style={{ letterSpacing: '2px', fontSize: '14px' }}
        >
          SYNCING NEURAL NETWORK...
        </motion.h2>
      </div>
    );
  }

  return (
    <div style={{ 
      background: '#020617', 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden', 
      position: 'fixed', 
      left: 0, 
      top: 0,
      fontFamily: 'sans-serif' 
    }}>
      
      <header style={{ position: 'absolute', top: '20px', width: '100%', textAlign: 'center', zIndex: 10, pointerEvents: 'none' }}>
        <h2 style={{ color: '#fff', fontSize: '10px', letterSpacing: '4px', opacity: 0.4 }}>SKILL TREE SYSTEM v2.0</h2>
      </header>

      <TransformWrapper
        ref={transformComponentRef}
        initialScale={0.7}
        minScale={0.2}
        maxScale={2}
        limitToBounds={false}
      >
        <TransformComponent wrapperStyle={{ width: "100vw", height: "100vh" }} contentStyle={{ width: "2000px", height: "2000px" }}>
          <div style={{ width: "2000px", height: "2000px", position: "relative" }}>
            
            {/* SVG Lines */}
            <svg style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
              {Object.entries(skills).map(([id, data]) => {
                if (data?.parent && skills[data.parent]) {
                  const p1 = skills[data.parent].pos;
                  const p2 = data.pos;
                  return (
                    <line 
                      key={`line-${id}`}
                      x1={p1?.x} y1={p1?.y} x2={p2?.x} y2={p2?.y} 
                      stroke={data.level > 0 ? "#3b82f6" : "#1e293b"} 
                      strokeWidth="2"
                      style={{ opacity: 0.3 }}
                    />
                  );
                }
                return null;
              })}
            </svg>

            {/* Skill Nodes */}
            {Object.entries(skills).map(([id, data]) => (
              <div key={id} style={{ position: 'absolute', left: data?.pos?.x || 0, top: data?.pos?.y || 0, transform: 'translate(-50%, -50%)', zIndex: 2 }}>
                <motion.div
                  onClick={() => {
                    setSelectedSkill(id);
                    setPopupMode('menu');
                    setShowPopup(true);
                  }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    background: '#0f172a',
                    border: `2px solid ${data.level >= 100 ? '#3b82f6' : data.level > 0 ? '#1d4ed8' : '#334155'}`,
                    borderRadius: '50%',
                    width: '70px', height: '70px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    boxShadow: data.level >= 100 ? '0 0 15px rgba(59, 130, 246, 0.5)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ color: '#fff', fontSize: '9px', fontWeight: 'bold', textAlign: 'center', padding: '0 5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60px' }}>
                    {data.name}
                  </span>
                  <span style={{ color: '#3b82f6', fontSize: '10px', marginTop: '2px' }}>{Math.floor(data.level)}%</span>
                </motion.div>
              </div>
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>

      {/* POPUP OVERLAY */}
      <AnimatePresence>
        {showPopup && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ 
              position: 'fixed', 
              inset: 0, // Розтягує на весь екран
              background: 'rgba(2, 6, 23, 0.85)', 
              backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              zIndex: 10000, padding: '20px' 
            }}
            onClick={() => setShowPopup(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              style={{ 
                background: '#1e293b', 
                padding: '24px', 
                borderRadius: '24px', 
                border: '1px solid rgba(59, 130, 246, 0.3)', 
                width: '100%', 
                maxWidth: '320px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {popupMode === 'menu' ? (
                <>
                  <h2 style={{ color: '#fff', fontSize: '18px', marginBottom: '4px', textAlign: 'center' }}>
                    {skills[selectedSkill]?.name}
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', marginBottom: '20px' }}>
                    Level: {Math.floor(skills[selectedSkill]?.level)}%
                  </p>
                  
                  <button onClick={() => { trainSkill(selectedSkill); setShowPopup(false); }} style={menuButtonStyle("#3b82f6")}>
                    ⚡ TRAIN SKILL
                  </button>
                  <button onClick={() => setPopupMode('create')} style={menuButtonStyle("#10b981")}>
                    ➕ ADD CHILD BRANCH
                  </button>
                  
                  {/* Не показуємо кнопку видалення для Core */}
                  {selectedSkill !== 'root' && (
                    <button onClick={() => handleDelete(selectedSkill)} style={menuButtonStyle("#ef4444")}>
                      🗑️ DELETE BRANCH
                    </button>
                  )}
                  
                  <button onClick={() => setShowPopup(false)} style={{ width: '100%', color: '#94a3b8', background: 'none', border: 'none', marginTop: '15px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                    CANCEL
                  </button>
                </>
              ) : (
                <>
                  <h3 style={{ color: '#fff', fontSize: '14px', marginBottom: '15px', textAlign: 'center' }}>
                    NEW SKILL UNDER: <span style={{ color: '#3b82f6' }}>{skills[selectedSkill]?.name}</span>
                  </h3>
                  <input 
                    ref={inputRef}
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    placeholder="Enter skill name..."
                    style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#0f172a', color: '#fff', border: '1px solid #334155', marginBottom: '20px', outline: 'none', fontSize: '16px' }}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setPopupMode('menu')} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#334155', color: '#fff', border: 'none', fontSize: '14px' }}>BACK</button>
                    <button 
                      onClick={handleAddSkill} 
                      disabled={isSubmitting || !newSkillName.trim()}
                      style={{ 
                        flex: 1, padding: '14px', borderRadius: '12px', 
                        background: '#3b82f6', color: '#fff', border: 'none', 
                        fontWeight: 'bold', fontSize: '14px',
                        opacity: (isSubmitting || !newSkillName.trim()) ? 0.5 : 1 
                      }}
                    >
                      {isSubmitting ? '...' : 'CREATE'}
                    </button>
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
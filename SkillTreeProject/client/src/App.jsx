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
  const [isSubmitting, setIsSubmitting] = useState(false); // Стан для кнопок
  const transformComponentRef = useRef(null);

  // Окремий запит на отримання даних
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
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      tg.enableClosingConfirmation(); // Захист від випадкового закриття
    }
    fetchSkills();
    
    // Центрування після завантаження
    const timer = setTimeout(() => {
      if (transformComponentRef.current) {
        transformComponentRef.current.centerView(0.8, 300); 
      }
    }, 1000);

    const interval = setInterval(fetchSkills, 5000);
    return () => { clearInterval(interval); clearTimeout(timer); }
  }, [fetchSkills]);

  // Хелпер для вібрації (Haptic)
  const triggerHaptic = (style = 'medium') => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
    }
  };

  const trainSkill = async (id) => {
    triggerHaptic('light');
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
    triggerHaptic('success');

    try {
      // ГЕНЕРУЄМО УНІКАЛЬНИЙ ID (назва + час), щоб уникнути помилок у базі
      const uniqueId = `${newSkillName.toLowerCase().trim().replace(/\s+/g, '_')}_${Date.now()}`;
      
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
        await fetchSkills();
      } else {
        alert("Помилка при додаванні. Можливо, такий скіл вже є.");
      }
    } catch (err) { 
      console.error("Add skill error"); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    triggerHaptic('warning');
    const confirmed = window.confirm(`Видалити "${skills[id].name}"? Це видалить також усі дочірні навички!`);
    
    if (confirmed) {
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

  const menuButtonStyle = (color, isDisabled = false) => ({
    width: '100%',
    padding: '14px',
    marginBottom: '10px',
    borderRadius: '14px',
    border: `1px solid ${isDisabled ? '#334155' : color}`,
    background: isDisabled ? '#1e293b' : 'rgba(15, 23, 42, 0.4)',
    color: isDisabled ? '#64748b' : color,
    fontWeight: '700',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease'
  });

  if (!skills) {
    return (
      <div style={{ background: '#020617', width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div 
          animate={{ opacity: [0.4, 1, 0.4] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          style={{ textAlign: 'center', color: '#3b82f6' }}
        >
          <h2 style={{ letterSpacing: '4px', fontSize: '12px' }}>INITIALIZING NEURAL LINK...</h2>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ background: '#020617', width: '100vw', height: '100vh', overflow: 'hidden', position: 'fixed' }}>
      
      <TransformWrapper
        ref={transformComponentRef}
        initialScale={0.8}
        minScale={0.4}
        maxScale={2}
        limitToBounds={false}
      >
        <TransformComponent wrapperStyle={{ width: "100vw", height: "100vh" }}>
          <div style={{ width: "1000px", height: "1000px", position: "relative" }}>
            
            {/* Лінії зв'язку */}
            <svg style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1 }}>
              {Object.entries(skills).map(([id, data]) => {
                if (data?.parent && skills[data.parent]) {
                  const p1 = skills[data.parent].pos;
                  const p2 = data.pos;
                  return (
                    <motion.line 
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
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

            {/* Вузли навичок */}
            {Object.entries(skills).map(([id, data]) => (
              <div key={id} style={{ position: 'absolute', left: data?.pos?.x, top: data?.pos?.y, transform: 'translate(-50%, -50%)', zIndex: 2 }}>
                <motion.div
                  onClick={() => {
                    triggerHaptic('medium');
                    setSelectedSkill(id);
                    setPopupMode('menu');
                    setShowPopup(true);
                  }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    background: '#0f172a',
                    border: `2px solid ${data.level >= 100 ? '#3b82f6' : '#334155'}`,
                    borderRadius: '50%',
                    width: '70px', height: '70px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    boxShadow: data.level >= 100 ? '0 0 15px rgba(59, 130, 246, 0.5)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ color: '#fff', fontSize: '9px', fontWeight: '800', textAlign: 'center', lineHeight: 1.1 }}>{data.name}</span>
                  <div style={{ height: '4px' }} />
                  <span style={{ color: '#3b82f6', fontSize: '10px', fontWeight: 'bold' }}>{Math.floor(data.level)}%</span>
                </motion.div>
              </div>
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>

      {/* Універсальний Popup */}
      <AnimatePresence>
        {showPopup && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}
            onClick={() => setShowPopup(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              style={{ background: '#1e293b', padding: '25px', borderRadius: '24px', border: '1px solid #3b82f6', width: '100%', maxWidth: '300px' }}
              onClick={(e) => e.stopPropagation()}
            >
              {popupMode === 'menu' ? (
                <>
                  <h2 style={{ color: '#fff', fontSize: '18px', marginBottom: '20px', textAlign: 'center', textTransform: 'uppercase' }}>
                    {skills[selectedSkill]?.name}
                  </h2>
                  
                  <button onClick={() => { trainSkill(selectedSkill); setShowPopup(false); }} style={menuButtonStyle("#3b82f6")}>
                    ⚡ TRAIN SKILL
                  </button>
                  
                  <button onClick={() => setPopupMode('create')} style={menuButtonStyle("#10b981")}>
                    ➕ ADD CHILD BRANCH
                  </button>
                  
                  <button onClick={() => handleDelete(selectedSkill)} style={menuButtonStyle("#ef4444")}>
                    🗑️ DELETE
                  </button>
                  
                  <button onClick={() => setShowPopup(false)} style={{ width: '100%', color: '#64748b', background: 'none', border: 'none', marginTop: '10px', fontSize: '12px', fontWeight: '600' }}>
                    CLOSE
                  </button>
                </>
              ) : (
                <>
                  <h3 style={{ color: '#fff', fontSize: '14px', marginBottom: '15px', textAlign: 'center', opacity: 0.7 }}>
                    NEW SKILL UNDER: {skills[selectedSkill]?.name}
                  </h3>
                  <input 
                    autoFocus
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    placeholder="Skill name..."
                    style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#0f172a', color: '#fff', border: '1px solid #334155', marginBottom: '20px', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setPopupMode('menu')} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#334155', color: '#fff', border: 'none' }}>BACK</button>
                    <button 
                      onClick={handleAddSkill} 
                      disabled={isSubmitting}
                      style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 'bold', opacity: isSubmitting ? 0.5 : 1 }}
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
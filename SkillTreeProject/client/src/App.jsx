import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const API_URL = 'https://skilltree-telegram-project.onrender.com';

function App() {
  const [userId, setUserId] = useState(null); // Внутрішній ID з бази даних
  const [skills, setSkills] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMode, setPopupMode] = useState('menu');
  const [selectedSkill, setSelectedSkill] = useState(null); 
  const [newSkillName, setNewSkillName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userAvatar, setUserAvatar] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  
  const transformComponentRef = useRef(null);
  const inputRef = useRef(null);

  // 1. Отримання даних дерева для конкретного користувача
  const fetchSkills = useCallback(async (currentUserId) => {
    const idToUse = currentUserId || userId;
    if (!idToUse) return;

    try {
      const res = await fetch(`${API_URL}/skills/${idToUse}`, {
        headers: { "Bypass-Tunnel-Reminder": "true" }
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setSkills(data);
    } catch (err) { 
      console.error("API Error (fetchSkills):", err); 
    }
  }, [userId]);


  // 2. Ініціалізація користувача та профілю (ОБ'ЄДНАНО)
  useEffect(() => {
    const initApp = async () => {
      let tgId = 12345678; // Тестовий ID
      let username = "LocalUser";
      let fName = "User";

      if (window.Telegram?.WebApp) {
        const webApp = window.Telegram.WebApp;
        webApp.ready();
        webApp.expand();
        
        const user = webApp.initDataUnsafe?.user;
        if (user) {
          tgId = user.id;
          username = user.username || user.first_name;
          fName = user.first_name || "User";
          setFirstName(fName);
          setUserAvatar(user.photo_url || null);
        } else {
          setFirstName(fName);
        }
      } else {
        setFirstName(fName);
      }

      try {
        const res = await fetch(`${API_URL}/user/init/${tgId}?username=${encodeURIComponent(username)}`, {
          headers: { "Bypass-Tunnel-Reminder": "true" }
        });
        const userData = await res.json();
        setUserId(userData.user_id);
        
        // Відразу завантажуємо скіли для отриманого ID
        fetchSkills(userData.user_id);
      } catch (err) {
        console.error("Initialization error:", err);
      }
    };

    initApp();
  }, [fetchSkills]); // Додали fetchSkills у залежності для безпеки

  const trainSkill = async (id) => {
    try {
      await fetch(`${API_URL}/train/${id}`, { 
        method: 'POST',
        headers: { "Bypass-Tunnel-Reminder": "true" }
      });
      fetchSkills(userId);
    } catch (err) { console.error("Train error"); }
  };

  const handleAddSkill = async () => {
    if (!newSkillName.trim() || isSubmitting || !userId) return;
    setIsSubmitting(true);

    try {
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
          parent_id: selectedSkill,
          user_id: userId // Передаємо внутрішній ID користувача
        })
      });

      if (res.ok) {
        setNewSkillName('');
        setShowPopup(false);
        fetchSkills(userId);
      }
    } catch (err) { 
      console.error("Add skill error"); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (id.startsWith('root_')) return alert("Cannot delete your Core node");

    if (window.confirm(`Видалити "${skills[id].name}" та всіх нащадків?`)) {
      try {
        await fetch(`${API_URL}/skills/${id}`, { 
          method: 'DELETE',
          headers: { "Bypass-Tunnel-Reminder": "true" }
        });
        setShowPopup(false);
        fetchSkills(userId);
      } catch (err) { console.error("Delete error"); }
    }
  };

  const handleRename = async () => {
    if (!editedName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/skills/${selectedSkill}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', "Bypass-Tunnel-Reminder": "true" },
        body: JSON.stringify({ name: editedName.trim() })
      });
      if (res.ok) {
        setIsEditingName(false);
        fetchSkills(userId); // оновлюємо дерево
      }
    } catch (err) { console.error("Rename error"); }
  };

  const menuButtonStyle = (color) => ({
    width: '100%', padding: '14px', marginBottom: '10px', borderRadius: '12px',
    border: `1px solid ${color}`, background: 'rgba(15, 23, 42, 0.5)',
    color: color, fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
  });



  if (!skills || !userId) {
    return (
      <div style={{ background: '#020617', width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <motion.h2 
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          style={{ letterSpacing: '2px', fontSize: '12px' }}
        >
          INITIALIZING PERSONAL NEURAL NETWORK...
        </motion.h2>
      </div>
    );
  }

  return (
    <div style={{ background: '#020617', width: '100vw', height: '100vh', overflow: 'hidden', position: 'fixed', left: 0, top: 0, fontFamily: 'sans-serif' }}>
      <header style={{ 
        position: 'absolute', 
        top: '20px', 
        left: '0',
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        zIndex: 10, 
        pointerEvents: 'none' 
      }}>
        {/* Блок профілю */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          background: 'rgba(15, 23, 42, 0.6)', 
          padding: '8px 16px', 
          borderRadius: '20px',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          backdropFilter: 'blur(8px)',
          marginBottom: '8px'
        }}>
          {userAvatar ? (
            <img src={userAvatar} alt="avatar" style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #3b82f6' }} />
          ) : (
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff' }}>
              {firstName.charAt(0)}
            </div>
          )}
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>
            {firstName.toUpperCase()}
          </span>
        </div>
        
        <h2 style={{ color: '#fff', fontSize: '8px', letterSpacing: '3px', opacity: 0.4 }}>SYSTEM ACCESS GRANTED</h2>
      </header>

      <TransformWrapper ref={transformComponentRef} initialScale={0.7} minScale={0.2} maxScale={2} limitToBounds={false}>
        <TransformComponent wrapperStyle={{ width: "100vw", height: "100vh" }} contentStyle={{ width: "2000px", height: "2000px" }}>
          <div style={{ width: "2000px", height: "2000px", position: "relative" }}>
            <svg style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
              {Object.entries(skills).map(([id, data]) => {
                if (data?.parent && skills[data.parent]) {
                  const p1 = skills[data.parent].pos;
                  const p2 = data.pos;
                  return (
                    <line key={`line-${id}`} x1={p1?.x} y1={p1?.y} x2={p2?.x} y2={p2?.y} 
                      stroke={data.level > 0 ? "#3b82f6" : "#1e293b"} strokeWidth="2" style={{ opacity: 0.3 }} />
                  );
                }
                return null;
              })}
            </svg>

            {Object.entries(skills).map(([id, data]) => (
              <div key={id} style={{ position: 'absolute', left: data?.pos?.x || 0, top: data?.pos?.y || 0, transform: 'translate(-50%, -50%)', zIndex: 2 }}>
                <motion.div
                  onClick={() => { setSelectedSkill(id); setPopupMode('menu'); setShowPopup(true); }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    background: '#0f172a',
                    border: `2px solid ${data.level >= 100 ? '#3b82f6' : data.level > 0 ? '#1d4ed8' : '#334155'}`,
                    borderRadius: '50%', width: '70px', height: '70px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    boxShadow: data.level >= 100 ? '0 0 15px rgba(59, 130, 246, 0.5)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ color: '#fff', fontSize: '9px', fontWeight: 'bold', textAlign: 'center', padding: '0 5px' }}>{data.name}</span>
                  <span style={{ color: '#3b82f6', fontSize: '10px' }}>{Math.floor(data.level)}%</span>
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
            style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}
            onClick={() => setShowPopup(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              style={{ background: '#1e293b', padding: '24px', borderRadius: '24px', border: '1px solid rgba(59, 130, 246, 0.3)', width: '100%', maxWidth: '320px' }}
              onClick={(e) => e.stopPropagation()}
            >
              {popupMode === 'menu' ? (
              <>
                {/* Секція заголовка з олівцем */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '5px' }}>
                  {isEditingName ? (
                    <input 
                      autoFocus
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onBlur={handleRename}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                      style={{ background: '#0f172a', color: '#fff', border: '1px solid #3b82f6', borderRadius: '8px', padding: '4px 8px', textAlign: 'center', fontSize: '18px', width: '80%' }}
                    />
                  ) : (
                    <>
                      <h2 style={{ color: '#fff', fontSize: '18px', margin: 0 }}>{skills[selectedSkill]?.name}</h2>
                      <button 
                        onClick={() => { setIsEditingName(true); setEditedName(skills[selectedSkill]?.name); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.6, padding: '5px', pointerEvents: 'auto' }}
                      >
                        ✏️
                      </button>
                    </>
                  )}
                </div>

                <p style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', marginBottom: '20px' }}>
                  Level: {Math.floor(skills[selectedSkill]?.level)}%
                </p>

                {/* Умова: Кнопка тренування зникає, якщо рівень >= 100 */}
                {skills[selectedSkill]?.level < 100 ? (
                  <button 
                    onClick={() => { trainSkill(selectedSkill); setShowPopup(false); }} 
                    style={menuButtonStyle("#3b82f6")}
                  >
                    ⚡ TRAIN SKILL
                  </button>
                ) : (
                  <div style={{ 
                    width: '100%', padding: '14px', marginBottom: '10px', borderRadius: '12px', 
                    border: '1px solid #10b981', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)',
                    fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}>
                    🏆 MASTERED
                  </div>
                )}

                <button onClick={() => setPopupMode('create')} style={menuButtonStyle("#10b981")}>➕ ADD CHILD BRANCH</button>
                
                {!selectedSkill.startsWith('root_') && (
                  <button onClick={() => handleDelete(selectedSkill)} style={menuButtonStyle("#ef4444")}>🗑️ DELETE BRANCH</button>
                )}
                
                <button onClick={() => { setShowPopup(false); setIsEditingName(false); }} style={{ width: '100%', color: '#94a3b8', background: 'none', border: 'none', marginTop: '15px', fontSize: '12px', cursor: 'pointer' }}>
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
                  autoFocus
                  value={newSkillName} 
                  onChange={(e) => setNewSkillName(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                  placeholder="Enter skill name..." 
                  style={{ 
                    width: '100%', padding: '14px', borderRadius: '12px', 
                    background: '#0f172a', color: '#fff', border: '1px solid #334155', 
                    marginBottom: '20px', fontSize: '16px', outline: 'none' 
                  }} 
                />
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => { setPopupMode('menu'); setNewSkillName(''); }} 
                    style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#334155', color: '#fff', border: 'none', cursor: 'pointer' }}
                  >
                    BACK
                  </button>
                  <button 
                    onClick={handleAddSkill} 
                    disabled={isSubmitting || !newSkillName.trim()} 
                    style={{ 
                      flex: 2, padding: '14px', borderRadius: '12px', 
                      background: '#3b82f6', color: '#fff', border: 'none',
                      opacity: (isSubmitting || !newSkillName.trim()) ? 0.5 : 1,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    {isSubmitting ? 'CREATING...' : 'CREATE BRANCH'}
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
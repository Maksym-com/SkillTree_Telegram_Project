import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const API_URL = 'https://skilltree-telegram-project.onrender.com';

function App() {
  const [userId, setUserId] = useState(null);
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
  const tg = window.Telegram?.WebApp;

  // --- 1. ТАКТИЛЬНИЙ ВІДГУК (HAPTIC) ---
  const triggerHaptic = (type = 'light') => {
    if (tg?.HapticFeedback) {
      if (type === 'impact') tg.HapticFeedback.impactOccurred('medium');
      else if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
      else if (type === 'warning') tg.HapticFeedback.notificationOccurred('warning');
      else tg.HapticFeedback.selectionChanged();
    }
  };

  // --- 2. АВТО-ЦЕНТРУВАННЯ ---
  const centerOnRoot = useCallback(() => {
    if (transformComponentRef.current && skills) {
      const rootNodeId = Object.keys(skills).find(id => !skills[id].parent);
      if (rootNodeId) {
        const { zoomToElement } = transformComponentRef.current;
        setTimeout(() => zoomToElement(`node-${rootNodeId}`, 0.8), 200);
      }
    }
  }, [skills]);

  const fetchSkills = useCallback(async (currentUserId) => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`${API_URL}/skills/${currentUserId}`, {
        headers: { "Bypass-Tunnel-Reminder": "true" }
      });
      const data = await res.json();
      setSkills(data);
    } catch (err) { console.error("API Error:", err); }
  }, []);

  useEffect(() => {
    const initApp = async () => {
      let tgId = 12345678;
      let username = "LocalUser";
      if (tg) {
        tg.ready();
        tg.expand();
        const user = tg.initDataUnsafe?.user;
        if (user) {
          tgId = user.id;
          username = user.username || user.first_name;
          setFirstName(user.first_name || "User");
          setUserAvatar(user.photo_url || null);
        }
      }
      try {
        const res = await fetch(`${API_URL}/user/init/${tgId}?username=${encodeURIComponent(username)}`);
        const userData = await res.json();
        setUserId(userData.user_id);
        fetchSkills(userData.user_id);
      } catch (err) { console.error("Init error:", err); }
    };
    initApp();
  }, [fetchSkills, tg]);

  useEffect(() => {
    if (skills && userId) centerOnRoot();
  }, [skills !== null, userId, centerOnRoot]);

  // --- 3. DRAG-AND-DROP ЛОГІКА ---
  const handleDrag = (id, info) => {
    setSkills(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        pos: { x: prev[id].pos.x + info.delta.x, y: prev[id].pos.y + info.delta.y }
      }
    }));
  };

  const savePosition = async (id) => {
    const skill = skills[id];
    try {
      await fetch(`${API_URL}/skills/${id}/pos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: skill.pos.x, y: skill.pos.y })
      });
      triggerHaptic('light');
    } catch (err) { console.error("Failed to save position"); }
  };

  // --- 4. МАЛЮВАННЯ КРИВИХ (BEZIER) ---
  const renderLink = (id, data) => {
    if (!data?.parent || !skills[data.parent]) return null;
    const start = skills[data.parent].pos;
    const end = data.pos;
    
    // Створюємо плавну криву
    const midY = (start.y + end.y) / 2;
    const d = `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`;

    return (
      <path 
        key={`link-${id}`} 
        d={d} 
        fill="none" 
        stroke={data.level > 0 ? "#3b82f6" : "#1e293b"} 
        strokeWidth="3" 
        style={{ opacity: 0.5, transition: 'stroke 0.3s' }} 
      />
    );
  };

  // --- ІНШІ ФУНКЦІЇ (TRAIN, DELETE, RENAME) ---
  const trainSkill = async (id) => {
    triggerHaptic('impact');
    try {
      await fetch(`${API_URL}/train/${id}`, { method: 'POST' });
      triggerHaptic('success');
      fetchSkills(userId);
    } catch (err) { console.error("Train error"); }
  };

  const handleRename = async () => {
    if (!editedName.trim() || editedName === skills[selectedSkill].name) {
      setIsEditingName(false);
      return;
    }
    try {
      await fetch(`${API_URL}/skills/${selectedSkill}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editedName.trim() })
      });
      setSkills(prev => ({ ...prev, [selectedSkill]: { ...prev[selectedSkill], name: editedName.trim() } }));
      setIsEditingName(false);
      triggerHaptic('success');
    } catch (err) { console.error("Rename error"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this branch?")) return;
    try {
      await fetch(`${API_URL}/skills/${id}`, { method: 'DELETE' });
      setShowPopup(false);
      triggerHaptic('warning');
      fetchSkills(userId);
    } catch (err) { console.error("Delete error"); }
  };

  const handleAddSkill = async () => {
    if (!newSkillName.trim()) return;
    setIsSubmitting(true);
    try {
      const parentPos = skills[selectedSkill].pos;
      const res = await fetch(`${API_URL}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          name: newSkillName.trim(),
          parent_id: selectedSkill,
          pos: { x: parentPos.x, y: parentPos.y + 150 }
        })
      });
      if (res.ok) {
        setNewSkillName('');
        setPopupMode('menu');
        setShowPopup(false);
        triggerHaptic('success');
        fetchSkills(userId);
      }
    } catch (err) { console.error("Create error"); }
    setIsSubmitting(false);
  };

  const menuButtonStyle = (color) => ({
    width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '12px',
    background: color, color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer'
  });

  if (!skills) return <div style={{ background: '#020617', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>LOADING...</div>;

  return (
    <div style={{ background: '#020617', width: '100vw', height: '100vh', position: 'fixed', overflow: 'hidden' }}>
      
      {/* HEADER */}
      <header style={{ position: 'absolute', top: '20px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(15, 23, 42, 0.8)', padding: '8px 16px', borderRadius: '20px', backdropFilter: 'blur(8px)', border: '1px solid rgba(59, 130, 246, 0.2)', pointerEvents: 'auto' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#3b82f6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#fff' }}>
            {userAvatar ? <img src={userAvatar} alt="avatar" style={{width:'100%'}} /> : firstName.charAt(0)}
          </div>
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.5px' }}>{firstName.toUpperCase()}</span>
          <button onClick={centerOnRoot} style={{ background: 'none', border: 'none', color: '#3b82f6', marginLeft: '5px', cursor: 'pointer' }}>🎯</button>
        </div>
      </header>

      <TransformWrapper 
        ref={transformComponentRef} 
        initialScale={0.7} 
        minScale={0.2} 
        maxScale={2} 
        limitToBounds={false}
        doubleClick={{ disabled: true }}
      >
        <TransformComponent wrapperStyle={{ width: "100vw", height: "100vh" }}>
          <div style={{ width: "4000px", height: "4000px", position: "relative" }}>
            
            {/* SVG LINES */}
            <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
              {Object.entries(skills).map(([id, data]) => renderLink(id, data))}
            </svg>

            {/* SKILL NODES */}
            {Object.entries(skills).map(([id, data]) => (
              <motion.div
                key={id}
                id={`node-${id}`}
                drag
                dragMomentum={false}
                onDragStart={() => triggerHaptic()}
                onDrag={(e, info) => handleDrag(id, info)}
                onDragEnd={() => savePosition(id)}
                style={{ position: 'absolute', left: data.pos.x, top: data.pos.y, x: "-50%", y: "-50%", zIndex: 2 }}
              >
                <motion.div
                  onClick={() => { setSelectedSkill(id); setPopupMode('menu'); setShowPopup(true); triggerHaptic(); }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    background: '#0f172a',
                    border: `3px solid ${data.level >= 100 ? '#3b82f6' : data.level > 0 ? '#1d4ed8' : '#334155'}`,
                    borderRadius: '50%', width: '80px', height: '80px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    boxShadow: data.level >= 100 ? '0 0 25px rgba(59, 130, 246, 0.5)' : 'none',
                    cursor: 'grab',
                    touchAction: 'none'
                  }}
                >
                  <span style={{ color: '#fff', fontSize: '10px', fontWeight: 'bold', textAlign: 'center', padding: '0 5px' }}>{data.name}</span>
                  <div style={{ width: '40px', height: '3px', background: '#1e293b', marginTop: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${data.level}%`, height: '100%', background: '#3b82f6' }} />
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>

      {/* POPUP MODAL */}
      <AnimatePresence>
        {showPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }} onClick={() => { setShowPopup(false); setIsEditingName(false); }}>
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }} style={{ background: '#1e293b', padding: '24px', borderRadius: '28px', border: '1px solid rgba(59, 130, 246, 0.3)', width: '100%', maxWidth: '320px' }} onClick={(e) => e.stopPropagation()}>
              
              {popupMode === 'menu' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', position: 'relative' }}>
                    {isEditingName ? (
                      <input autoFocus value={editedName} onChange={(e) => setEditedName(e.target.value)} onBlur={handleRename} onKeyDown={(e) => e.key === 'Enter' && handleRename()} style={{ background: '#0f172a', color: '#fff', border: '1px solid #3b82f6', borderRadius: '8px', padding: '5px', textAlign: 'center', fontSize: '18px', width: '80%' }} />
                    ) : (
                      <h2 onClick={() => { setIsEditingName(true); setEditedName(skills[selectedSkill].name); }} style={{ color: '#fff', fontSize: '20px', margin: 0, cursor: 'pointer' }}>{skills[selectedSkill]?.name} ✏️</h2>
                    )}
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', marginBottom: '20px' }}>Progress: {Math.floor(skills[selectedSkill]?.level)}%</p>
                  
                  {skills[selectedSkill]?.level < 100 && (
                    <button onClick={() => { trainSkill(selectedSkill); setShowPopup(false); }} style={menuButtonStyle("#3b82f6")}>⚡ TRAIN SKILL</button>
                  )}
                  
                  <button onClick={() => setPopupMode('create')} style={menuButtonStyle("#10b981")}>➕ ADD SUB-SKILL</button>
                  
                  {!skills[selectedSkill]?.parent === null && (
                     <button onClick={() => handleDelete(selectedSkill)} style={menuButtonStyle("#ef4444")}>🗑️ DELETE</button>
                  )}
                  
                  <button onClick={() => setShowPopup(false)} style={{ width: '100%', background: 'none', border: 'none', color: '#64748b', marginTop: '10px' }}>Close</button>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ color: '#fff', marginBottom: '15px' }}>New Skill Name</h3>
                  <input autoFocus value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)} style={{ background: '#0f172a', color: '#fff', border: '1px solid #334155', padding: '12px', borderRadius: '12px', marginBottom: '15px' }} />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setPopupMode('menu')} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#334155', color: '#fff', border: 'none' }}>Back</button>
                    <button onClick={handleAddSkill} disabled={isSubmitting} style={{ flex: 2, padding: '12px', borderRadius: '12px', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 'bold' }}>Create</button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
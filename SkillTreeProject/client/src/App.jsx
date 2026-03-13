import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { initUser, getSkills } from './services/api';
import SkillTree from './components/SkillTree';
import './App.css';

const API_URL = 'https://skilltree-telegram-project.onrender.com';

const themes = {
  dark: {
    bg: '#020617',
    card: '#1e293b',
    text: '#ffffff',
    textMuted: '#94a3b8',
    border: 'rgba(59, 130, 246, 0.3)',
    input: '#0f172a',
    nodeInactive: '#1e293b'
  },
  light: {
    bg: '#fff9ed',
    card: '#ffffff',
    text: '#0f172a',
    textMuted: '#64748b',
    border: 'rgba(59, 130, 246, 0.2)',
    input: '#f1f5f9',
    nodeInactive: '#cbd5e1'
  },
  abyss: {
    bg: '#050000',
    card: '#1a0505',
    text: '#ff4d4d',
    textMuted: '#661a1a',
    border: 'rgba(255, 0, 0, 0.3)',
    nodeInactive: '#1a0000',
    accent: '#ff0000'
  }
};

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
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [world, setWorld] = useState('light');
  
  const [draggingId, setDraggingId] = useState(null);
  const [offsets, setOffsets] = useState({});

  const inputRef = useRef(null);
  const colors = useMemo(() => {
    if (world === 'abyss') return themes.abyss;
    return themes[theme];
  }, [theme, world]);

  const tg = window.Telegram?.WebApp;

  const menuButtonStyle = (color) => ({
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    background: theme === 'dark' || world === 'abyss' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    color: color,
    border: `1px solid ${color}44`,
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease'
  });

  const fetchSkills = useCallback(async (uid) => {
    if (!uid) return;
    try {
      const res = await fetch(`${API_URL}/skills/${uid}`, {
        headers: { "Bypass-Tunnel-Reminder": "true" }
      });
      const data = await res.json();
      setSkills(data);
    } catch (err) { console.error("Fetch error:", err); }
  }, []);

  useEffect(() => {
    const initApp = async () => {
      let tgId = 12345678; 
      let username = "LocalUser";
      if (tg) {
        tg.ready(); tg.expand();
        const user = tg.initDataUnsafe?.user;
        if (user) {
          tgId = user.id;
          username = user.username || user.first_name;
          setFirstName(user.first_name || "User");
          setUserAvatar(user.photo_url || null);
        }
      }
      try {
        const res = await fetch(`${API_URL}/user/init/${tgId}?username=${encodeURIComponent(username)}`, {
          headers: { "Bypass-Tunnel-Reminder": "true" }
        });
        const userData = await res.json();
        setUserId(userData.user_id);
        fetchSkills(userData.user_id);
      } catch (err) { console.error("Init error"); }
    };
    initApp();
  }, [fetchSkills]);

  // --- ACTIONS ---
  const trainSkill = async (id) => {
    try {
      await fetch(`${API_URL}/train/${id}`, { method: 'POST', headers: { "Bypass-Tunnel-Reminder": "true" } });
      fetchSkills(userId);
    } catch (err) { console.error("Train error"); }
  };

  const handleAddSkill = async () => {
    if (!newSkillName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    
    // Нова логіка ID для унікальності
    const newId = `skill_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const payload = { 
      id: newId, 
      name: newSkillName.trim(), 
      parent_id: selectedSkill, 
      user_id: Number(userId),
      world: world // Додаємо світ
    };

    try {
      const res = await fetch(`${API_URL}/skills/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', "Bypass-Tunnel-Reminder": "true" },
        body: JSON.stringify(payload)
      });
      if (res.ok) { 
        setNewSkillName(''); 
        setPopupMode('menu'); 
        setShowPopup(false); 
        fetchSkills(userId); 
      }
    } catch (err) { 
      console.error("Add error"); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleDelete = async (id) => {
    if (id.includes('root_')) return; // Нова перевірка для обох коренів
    if (window.confirm("Delete this branch?")) {
      try {
        await fetch(`${API_URL}/skills/${id}`, { method: 'DELETE', headers: { "Bypass-Tunnel-Reminder": "true" } });
        setShowPopup(false); fetchSkills(userId);
      } catch (err) { console.error("Delete error"); }
    }
  };

  const handleResetTree = async () => {
    if (window.confirm("Ви впевнені? Це видалить усі навички цього світу!")) {
      try {
        const res = await fetch(`${API_URL}/user/${userId}/reset`, { 
          method: 'DELETE',
          headers: { "Bypass-Tunnel-Reminder": "true" }
        });
        if (res.ok) {
          fetchSkills(userId);
          setShowProfilePopup(false);
        }
      } catch (err) { console.error("Reset error:", err); }
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
      if (res.ok) { setIsEditingName(false); fetchSkills(userId); }
    } catch (err) { console.error("Rename error"); }
  };

  return (
    <div style={{
      background: colors.bg,
      transition: 'background 0.8s ease', // Повільніший перехід для атмосфери
      width: '100vw', height: '100vh', position: 'fixed',
      top: 0, left: 0, margin: 0, padding: 0, overflow: 'hidden', fontFamily: 'sans-serif'
    }}>

      {/* Анімація переходу між світами */}
      <AnimatePresence mode="wait">
        <motion.div
          key={world}
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 0.6 }}
          style={{ width: '100%', height: '100%' }}
        >
          <SkillTree 
            skills={skills}
            world={world}
            theme={theme}
            setSelectedSkill={setSelectedSkill}
            setShowPopup={setShowPopup}
            setPopupMode={setPopupMode}
          />
        </motion.div>
      </AnimatePresence>

      <header style={{ position: 'absolute', top: '20px', left: 0, width: '100%', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        <div
          onClick={() => setShowProfilePopup(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: colors.card, padding: '8px 16px',
            borderRadius: '25px', border: `1px solid ${colors.border}`,
            backdropFilter: 'blur(10px)', cursor: 'pointer', pointerEvents: 'auto',
            boxShadow: world === 'abyss' ? '0 0 15px rgba(255,0,0,0.2)' : 'none'
          }}
        >
          {userAvatar ?
            <img src={userAvatar} style={{ width: '24px', height: '24px', borderRadius: '50%' }} alt="avatar" /> :
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: world === 'abyss' ? '#900' : '#3b82f6' }} />
          }
          <span style={{ color: colors.text, fontSize: '12px', fontWeight: 'bold' }}>
            {firstName.toUpperCase() || 'USER'}
          </span>
        </div>
      </header>

      {/* Попапи (Повторюють логіку, але використовують colors.text/card) */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', zIndex: 10000, padding: '20px'
            }}
            onClick={() => { setShowPopup(false); setIsEditingName(false); }}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              style={{
                background: colors.card, padding: '24px', borderRadius: '24px',
                border: `1px solid ${colors.border}`, width: '100%', maxWidth: '300px',
                color: colors.text
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {popupMode === 'menu' ? (
                <>
                  <h2 style={{ textAlign: 'center', margin: '0 0 10px 0' }}>{skills[selectedSkill]?.name}</h2>
                  <p style={{ textAlign: 'center', color: colors.textMuted }}>Progress: {Math.floor(skills[selectedSkill]?.level)}%</p>
                  <button onClick={() => trainSkill(selectedSkill)} style={menuButtonStyle(world === 'abyss' ? "#ff4d4d" : "#3b82f6")}>
                    {world === 'abyss' ? '🩸 SACRIFICE TO TRAIN' : '⚡️ TRAIN SKILL'}
                  </button>
                  <button onClick={() => setPopupMode('create')} style={menuButtonStyle("#10b981")}>➕ ADD BRANCH</button>
                  {!selectedSkill.includes('root_') && (
                    <button onClick={() => handleDelete(selectedSkill)} style={menuButtonStyle("#ef4444")}>🗑 DELETE</button>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                   <input 
                    autoFocus placeholder="Skill name..." value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, padding: '10px', borderRadius: '10px' }}
                   />
                   <div style={{ display: 'flex', gap: '10px' }}>
                     <button onClick={() => setPopupMode('menu')} style={{ flex: 1, padding: '10px', borderRadius: '10px' }}>BACK</button>
                     <button onClick={handleAddSkill} style={{ flex: 2, background: '#3b82f6', color: 'white', borderRadius: '10px' }}>CREATE</button>
                   </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Кнопки перемикання світів */}
      <div style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
        {world === 'light' ? (
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setWorld('abyss')}
            style={{
              background: '#000', color: '#ff4d4d', border: '1px solid #ff4d4d',
              padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold',
              boxShadow: '0 0 15px rgba(255, 0, 0, 0.4)', cursor: 'pointer'
            }}
          >
            DESCEND INTO THE ABYSS
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setWorld('light')}
            style={{
              background: '#fff', color: '#3b82f6', border: '1px solid #3b82f6',
              padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)', cursor: 'pointer'
            }}
          >
            RISE TO THE LIGHT
          </motion.button>
        )}
      </div>
    </div>
  );
}

export default App;
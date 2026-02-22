import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

  const inputRef = useRef(null);
  const tg = window.Telegram?.WebApp;

  // --- API LOGIC ---

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
    try {
      const res = await fetch(`${API_URL}/skills/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', "Bypass-Tunnel-Reminder": "true" },
        body: JSON.stringify({ name: newSkillName.trim(), parent_id: selectedSkill, user_id: userId })
      });
      if (res.ok) {
        setNewSkillName(''); setPopupMode('menu'); setShowPopup(false); fetchSkills(userId);
      }
    } catch (err) { console.error("Add error"); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (id.startsWith('root_')) return;
    if (window.confirm("Delete this branch and all children?")) {
      try {
        await fetch(`${API_URL}/skills/${id}`, { method: 'DELETE', headers: { "Bypass-Tunnel-Reminder": "true" } });
        setShowPopup(false); fetchSkills(userId);
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
      if (res.ok) { setIsEditingName(false); fetchSkills(userId); }
    } catch (err) { console.error("Rename error"); }
  };

  // --- DYNAMIC TREE LAYOUT ---

  const treeData = useMemo(() => {
    if (!skills) return null;
    const result = {};
    const centerX = 1000;
    const startY = 1750;
    const verticalSpacing = 200;
    const baseSpread = 80;

    const build = (id, x, y, angle = -90, depth = 0) => {
      const children = Object.entries(skills)
        .filter(([_, s]) => s.parent === id)
        .map(([cid]) => cid);

      result[id] = { ...skills[id], pos: { x, y }, depth };

      if (!children.length) return;
      const spread = baseSpread / (depth + 0.8);
      const startAngle = angle - spread / 2;

      children.forEach((childId, index) => {
        const childAngle = startAngle + (spread / (children.length - 1 || 1)) * index;
        const rad = (childAngle * Math.PI) / 180;
        const length = verticalSpacing - (depth * 15);
        const childX = x + Math.cos(rad) * length;
        const childY = y + Math.sin(rad) * length;
        build(childId, childX, childY, childAngle, depth + 1);
      });
    };

    const rootId = Object.keys(skills).find(id => id.startsWith("root_"));
    if (rootId) build(rootId, centerX, startY);
    return result;
  }, [skills]);


  // --- STYLES (Оновлені для запобігання зсувам) ---
  const menuButtonStyle = (color) => ({
    display: 'block',
    width: '100%', 
    padding: '14px 0', // Паддінг тільки зверху/знизу, щоб текст не тиснув на краї
    marginBottom: '10px', 
    borderRadius: '12px',
    border: `1px solid ${color}`, 
    background: 'rgba(15, 23, 42, 0.4)',
    color: color, 
    fontWeight: 'bold', 
    cursor: 'pointer', 
    fontSize: '13px',
    textAlign: 'center',
    boxSizing: 'border-box'
  });

  const inputStyle = {
    display: 'block',
    width: '100%', // Тепер це буде працювати правильно з box-sizing
    background: '#0f172a',
    color: '#fff',
    border: '1px solid #334155',
    padding: '12px 15px',
    borderRadius: '10px',
    fontSize: '16px', // 16px запобігає авто-зуму на iPhone
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '15px',
    appearance: 'none', // Прибираємо стандартні стилі iOS
    WebkitAppearance: 'none'
  };

    if (!skills || !userId) {
    return (
      <div style={{ background: '#020617', width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <motion.h2 animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ letterSpacing: '2px', fontSize: '12px' }}>
          INITIALIZING PERSONAL NEURAL NETWORK...
        </motion.h2>
      </div>
    );
  }

  return (
    <div style={{ 
      background: '#020617',
      width: '100vw',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      fontFamily: 'sans-serif'
    }}>

      {/* HUD Header */}
      <header style={{ position: 'absolute', top: '20px', left: 0, width: '100%', display: 'flex', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(15, 23, 42, 0.6)', padding: '8px 16px', borderRadius: '25px', border: '1px solid rgba(59, 130, 246, 0.3)', backdropFilter: 'blur(10px)' }}>
          {userAvatar ? <img src={userAvatar} style={{ width: '24px', height: '24px', borderRadius: '50%' }} /> : <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#3b82f6' }} />}
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.5px' }}>{firstName.toUpperCase() || 'USER'}</span>
        </div>
      </header>

      <TransformWrapper 
        initialScale={0.6} 
        centerOnInit 
        minScale={0.2} 
        maxScale={2} 
        limitToBounds={false}
      >
        <TransformComponent wrapperStyle={{ width: "100vw", height: "100vh" }}>
          <div style={{ width: "2000px", height: "2000px", position: "relative" }}>
            
            <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
              <defs>
                <linearGradient id="trunkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Trunk Base - з плавним зникненням */}
              <rect x="998" y="1750" width="4" height="300" fill="url(#trunkGradient)" />

              {Object.entries(treeData).map(([id, data]) => {
                if (!data.parent || !treeData[data.parent]) return null;
                const parent = treeData[data.parent];
                const thickness = Math.max(2, 10 - data.depth * 2);
                return (
                  <path key={`branch-${id}`}
                    d={`M ${parent.pos.x} ${parent.pos.y} Q ${(parent.pos.x + data.pos.x) / 2} ${(parent.pos.y + data.pos.y) / 2 - 20} ${data.pos.x} ${data.pos.y}`}
                    stroke={data.level > 0 ? "#3b82f6" : "#1e293b"}
                    strokeWidth={thickness} fill="none" strokeLinecap="round" style={{ opacity: 0.5, transition: 'all 0.5s' }}
                  />
                );
              })}
            </svg>

            {Object.entries(treeData).map(([id, data]) => (
              <div key={id} style={{ position: 'absolute', left: data.pos.x, top: data.pos.y, transform: 'translate(-50%, -50%)', zIndex: 5 }}>
                <motion.div 
                  onClick={() => { setSelectedSkill(id); setPopupMode('menu'); setShowPopup(true); }} 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <div style={{
                    width: data.depth === 0 ? '36px' : '24px',
                    height: data.depth === 0 ? '36px' : '24px',
                    background: data.level >= 100 ? '#60a5fa' : data.level > 0 ? '#2563eb' : '#1e293b',
                    transform: 'rotate(45deg)', // Ромб замість кліп-пасу для стабільності
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: data.level > 0 ? `0 0 15px rgba(59, 130, 246, 0.5)` : 'none',
                    cursor: 'pointer'
                  }} />
                  <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '12px', color: '#fff', fontSize: '10px', whiteSpace: 'nowrap', textAlign: 'center', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                    <div style={{ fontWeight: 'bold' }}>{data.name}</div>
                    <div style={{ color: '#3b82f6', fontSize: '9px' }}>{Math.floor(data.level)}%</div>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>

      <AnimatePresence>
        {showPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }} onClick={() => { setShowPopup(false); setIsEditingName(false); }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} style={{ background: '#1e293b', padding: '24px', borderRadius: '24px', border: '1px solid rgba(59, 130, 246, 0.3)', width: '100%', maxWidth: '300px' }} onClick={(e) => e.stopPropagation()}>
              {popupMode === 'menu' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', minHeight: '32px', position: 'relative' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      {isEditingName ? (
                        <input autoFocus value={editedName} onChange={(e) => setEditedName(e.target.value)} onBlur={handleRename} onKeyDown={(e) => e.key === 'Enter' && handleRename()} style={{ background: '#0f172a', color: '#fff', border: '1px solid #3b82f6', borderRadius: '6px', padding: '2px 10px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold', outline: 'none', width: `${Math.max(editedName.length, 5)}ch`, minWidth: '100px', maxWidth: '240px' }} />
                      ) : (
                        <>
                          <h2 style={{ color: '#fff', fontSize: '18px', margin: 0, textAlign: 'center', fontWeight: 'bold' }}>{skills[selectedSkill]?.name}</h2>
                          <button onClick={() => { setIsEditingName(true); setEditedName(skills[selectedSkill]?.name); }} style={{ position: 'absolute', left: '100%', marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, display: 'flex', alignItems: 'center', padding: '4px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', marginBottom: '20px' }}>Level: {Math.floor(skills[selectedSkill]?.level)}%</p>
                  {skills[selectedSkill]?.level < 100 ? (
                    <button onClick={() => { trainSkill(selectedSkill); setShowPopup(false); }} style={menuButtonStyle("#3b82f6")}>⚡️ TRAIN SKILL</button>
                  ) : (
                    <div style={{ width: '100%', height: '42px', marginBottom: '10px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10b981', background: 'rgba(16, 185, 129, 0.05)', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
                      <span>MASTERED</span>
                    </div>
                  )}
                  <button onClick={() => setPopupMode('create')} style={menuButtonStyle("#10b981")}>➕ ADD CHILD BRANCH</button>
                  {!selectedSkill.startsWith('root_') && (
                    
                    <button onClick={() => handleDelete(selectedSkill)} style={menuButtonStyle("#ef4444")}>🗑 DELETE BRANCH</button>
                  )}
                  <button onClick={() => { setShowPopup(false); setIsEditingName(false); }} style={{ width: '100%', color: '#94a3b8', background: 'none', border: 'none', marginTop: '15px', fontSize: '11px', cursor: 'pointer' }}>CANCEL</button>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                  <h3 style={{ color: '#fff', fontSize: '14px', marginBottom: '16px', textAlign: 'center', fontWeight: '600', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    NEW SKILL UNDER: <span style={{ color: '#3b82f6' }}>{skills[selectedSkill]?.name}</span>
                  </h3>
                  <input ref={inputRef} autoFocus value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()} placeholder="Enter skill name..." style={{ width: '100%', maxWidth: '240px', padding: '10px 14px', borderRadius: '10px', background: '#0f172a', color: '#fff', border: '1px solid #334155', marginBottom: '20px', outline: 'none' }} />
                  <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '240px' }}>
                    <button onClick={() => { setPopupMode('menu'); setNewSkillName(''); }} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: '#334155', color: '#fff', border: 'none', fontSize: '13px', fontWeight: '600' }}>BACK</button>
                    <button onClick={handleAddSkill} disabled={isSubmitting || !newSkillName.trim()} style={{ flex: 1.5, padding: '10px', borderRadius: '10px', background: '#3b82f6', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 'bold', opacity: (isSubmitting || !newSkillName.trim()) ? 0.4 : 1 }}>
                      {isSubmitting ? '...' : 'CREATE'}
                    </button>
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


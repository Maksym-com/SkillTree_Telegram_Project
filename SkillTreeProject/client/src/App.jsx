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

  // --- STYLES ---

  const menuButtonStyle = (color) => ({
    width: '100%', padding: '14px', marginBottom: '10px', borderRadius: '12px',
    border: `1px solid ${color}`, background: 'rgba(15, 23, 42, 0.4)',
    color: color, fontWeight: 'bold', cursor: 'pointer', fontSize: '13px'
  });

  if (!treeData) return <div style={{ background: '#020617', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>GROWING NEURAL FOREST...</div>;

  return (
    <div style={{ background: '#020617', width: '100vw', height: '100vh', position: 'fixed', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      
      {/* HUD Header */}
      <header style={{ position: 'absolute', top: '20px', left: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(15, 23, 42, 0.6)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.2)', backdropFilter: 'blur(8px)' }}>
          {userAvatar ? <img src={userAvatar} style={{ width: '24px', height: '24px', borderRadius: '50%' }} /> : <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#3b82f6' }} />}
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{firstName.toUpperCase() || 'USER'}</span>
        </div>
      </header>

      <TransformWrapper initialScale={0.6} centerOnInit minScale={0.1} maxScale={2} limitToBounds={false}>
        <TransformComponent wrapperStyle={{ width: "100vw", height: "100vh" }}>
          <div style={{ width: "2000px", height: "2000px", position: "relative" }}>
            
            <svg style={{ position: 'absolute', width: '100%', height: '100%' }}>
              {/* Trunk Base */}
              <rect x="985" y="1750" width="30" height="250" fill="url(#trunkGradient)" />
              <defs>
                <linearGradient id="trunkGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#334155" /><stop offset="100%" stopColor="#020617" /></linearGradient>
              </defs>

              {Object.entries(treeData).map(([id, data]) => {
                if (!data.parent || !treeData[data.parent]) return null;
                const parent = treeData[data.parent];
                const thickness = Math.max(2, 12 - data.depth * 2.5);
                return (
                  <path key={`branch-${id}`}
                    d={`M ${parent.pos.x} ${parent.pos.y} Q ${(parent.pos.x + data.pos.x) / 2} ${(parent.pos.y + data.pos.y) / 2 - 30} ${data.pos.x} ${data.pos.y}`}
                    stroke={data.level > 0 ? "#3b82f6" : "#1e293b"}
                    strokeWidth={thickness} fill="none" strokeLinecap="round" style={{ opacity: 0.6, transition: 'all 0.5s' }}
                  />
                );
              })}
            </svg>

            {Object.entries(treeData).map(([id, data]) => (
              <div key={id} style={{ position: 'absolute', left: data.pos.x, top: data.pos.y, transform: 'translate(-50%, -50%)', zIndex: 5 }}>
                <motion.div onClick={() => { setSelectedSkill(id); setPopupMode('menu'); setShowPopup(true); }} whileTap={{ scale: 0.9 }}>
                  <div style={{
                    width: data.depth === 0 ? '40px' : '28px',
                    height: data.depth === 0 ? '40px' : '38px',
                    background: data.level >= 100 ? '#60a5fa' : data.level > 0 ? '#2563eb' : '#1e293b',
                    clipPath: "polygon(50% 0%, 100% 60%, 50% 100%, 0% 60%)",
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: data.level > 0 ? `0 0 15px #3b82f6` : 'none',
                    cursor: 'pointer'
                  }} />
                  <div style={{ position: 'absolute', top: '100%', marginTop: '8px', color: '#fff', fontSize: '10px', whiteSpace: 'nowrap', textAlign: 'center', textShadow: '0 2px 4px #000' }}>
                    {data.name}
                    <div style={{ color: '#3b82f6', fontSize: '8px' }}>{Math.floor(data.level)}%</div>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>

      <AnimatePresence>
        {showPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}
            onClick={() => { setShowPopup(false); setIsEditingName(false); }}
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              style={{ background: '#1e293b', padding: '24px', borderRadius: '24px', border: '1px solid #334155', width: '100%', maxWidth: '300px' }}
              onClick={(e) => e.stopPropagation()}
            >
              {popupMode === 'menu' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                    {isEditingName ? (
                      <input autoFocus value={editedName} onChange={(e) => setEditedName(e.target.value)} onBlur={handleRename} onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                        style={{ background: '#0f172a', color: '#fff', border: '1px solid #3b82f6', borderRadius: '6px', padding: '4px', textAlign: 'center', width: '100%' }} />
                    ) : (
                      <h2 onClick={() => { setIsEditingName(true); setEditedName(treeData[selectedSkill]?.name); }} style={{ color: '#fff', fontSize: '18px', cursor: 'pointer' }}>{treeData[selectedSkill]?.name} ✎</h2>
                    )}
                  </div>
                  <p style={{ color: '#64748b', textAlign: 'center', fontSize: '12px', marginBottom: '20px' }}>Progress: {Math.floor(treeData[selectedSkill]?.level)}%</p>
                  
                  {treeData[selectedSkill]?.level < 100 ? (
                    <button onClick={() => { trainSkill(selectedSkill); setShowPopup(false); }} style={menuButtonStyle("#3b82f6")}>⚡ TRAIN SKILL</button>
                  ) : (
                    <div style={{ color: '#10b981', textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}>MASTERED</div>
                  )}
                  
                  <button onClick={() => setPopupMode('create')} style={menuButtonStyle("#10b981")}>➕ ADD BRANCH</button>
                  {!selectedSkill.startsWith('root_') && <button onClick={() => handleDelete(selectedSkill)} style={menuButtonStyle("#ef4444")}>🗑️ DELETE</button>}
                  <button onClick={() => setShowPopup(false)} style={{ width: '100%', background: 'none', border: 'none', color: '#475569', marginTop: '10px', cursor: 'pointer' }}>CLOSE</button>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <h3 style={{ color: '#fff', fontSize: '14px' }}>NEW SKILL UNDER {treeData[selectedSkill]?.name}</h3>
                  <input autoFocus value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)} placeholder="Skill name..."
                    style={{ background: '#0f172a', color: '#fff', border: '1px solid #334155', padding: '12px', borderRadius: '10px' }} />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setPopupMode('menu')} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: '#334155', color: '#fff', border: 'none' }}>BACK</button>
                    <button onClick={handleAddSkill} disabled={isSubmitting || !newSkillName.trim()} style={{ flex: 1.5, padding: '10px', borderRadius: '10px', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 'bold' }}>CREATE</button>
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
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

  // 1. Функція вібровідгуку
  const triggerHaptic = (type = 'light') => {
    if (tg?.HapticFeedback) {
      if (type === 'impact') tg.HapticFeedback.impactOccurred('medium');
      else if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
      else tg.HapticFeedback.selectionChanged();
    }
  };

  // 2. Авто-центрування на корені
  const centerOnRoot = useCallback(() => {
    if (transformComponentRef.current && skills) {
      const rootNode = Object.values(skills).find(s => !s.parent) || Object.values(skills)[0];
      if (rootNode?.pos) {
        const { zoomToElement } = transformComponentRef.current;
        // Центруємо з невеликою затримкою, щоб DOM встиг відрендеритись
        setTimeout(() => zoomToElement(`node-root`, 0.8), 100);
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

  // Ефект для центрування при першому отриманні скілів
  useEffect(() => {
    if (skills && userId) centerOnRoot();
  }, [skills !== null, userId]);

  // 3. Обробка перетягування (Drag)
  const handleDrag = (id, info) => {
    setSkills(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        pos: { x: prev[id].pos.x + info.delta.x, y: prev[id].pos.y + info.delta.y }
      }
    }));
  };

  // 4. Малювання кривих Безьє
  const renderLink = (id, data) => {
    if (!data?.parent || !skills[data.parent]) return null;
    const start = skills[data.parent].pos;
    const end = data.pos;
    const midY = (start.y + end.y) / 2;
    const d = `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`;

    return (
      <path key={`link-${id}`} d={d} fill="none" 
        stroke={data.level > 0 ? "#3b82f6" : "#1e293b"} 
        strokeWidth="2" style={{ opacity: 0.4, transition: 'stroke 0.3s' }} 
      />
    );
  };

  const trainSkill = async (id) => {
    triggerHaptic('impact');
    try {
      await fetch(`${API_URL}/train/${id}`, { method: 'POST' });
      triggerHaptic('success');
      fetchSkills(userId);
    } catch (err) { console.error("Train error"); }
  };

  // ... (Решта логіки handleAddSkill, handleDelete, handleRename залишається такою ж)

  return (
    <div style={{ background: '#020617', width: '100vw', height: '100vh', position: 'fixed', fontFamily: 'sans-serif' }}>
      <header style={{ position: 'absolute', top: '20px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(15, 23, 42, 0.6)', padding: '8px 16px', borderRadius: '20px', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#3b82f6', overflow: 'hidden' }}>
            {userAvatar ? <img src={userAvatar} style={{width:'100%'}} /> : firstName.charAt(0)}
          </div>
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{firstName.toUpperCase()}</span>
        </div>
      </header>

      <TransformWrapper ref={transformComponentRef} initialScale={0.7} centerOnInit minScale={0.1} maxScale={2} limitToBounds={false}>
        <TransformComponent wrapperStyle={{ width: "100vw", height: "100vh" }}>
          <div style={{ width: "4000px", height: "4000px", position: "relative" }}>
            <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
              {Object.entries(skills).map(([id, data]) => renderLink(id, data))}
            </svg>

            {Object.entries(skills).map(([id, data]) => (
              <motion.div
                key={id}
                id={id.startsWith('root_') ? 'node-root' : `node-${id}`}
                drag
                dragMomentum={false}
                onDrag={(e, info) => handleDrag(id, info)}
                onDragStart={() => triggerHaptic()}
                style={{ position: 'absolute', left: data.pos.x, top: data.pos.y, x: "-50%", y: "-50%", zIndex: 2 }}
              >
                <motion.div
                  onClick={() => { setSelectedSkill(id); setPopupMode('menu'); setShowPopup(true); triggerHaptic(); }}
                  style={{
                    background: '#0f172a',
                    border: `2px solid ${data.level >= 100 ? '#3b82f6' : data.level > 0 ? '#1d4ed8' : '#334155'}`,
                    borderRadius: '50%', width: '75px', height: '75px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    boxShadow: data.level >= 100 ? '0 0 20px rgba(59, 130, 246, 0.4)' : 'none',
                    cursor: 'grab'
                  }}
                  whileActive={{ cursor: 'grabbing' }}
                >
                  <span style={{ color: '#fff', fontSize: '9px', fontWeight: 'bold', textAlign: 'center' }}>{data.name}</span>
                  <span style={{ color: '#3b82f6', fontSize: '10px' }}>{Math.floor(data.level)}%</span>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>

      {/* Попап залишається таким самим, як у попередній версії */}
      {/* ... (AnimatePresence Block) */}
    </div>
  );
}

export default App;
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
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [theme, setTheme] = useState('dark');

  const inputRef = useRef(null);
  const tg = window.Telegram?.WebApp;

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

  const trainSkill = async (id) => {
    try {
      await fetch(`${API_URL}/train/${id}`, { method: 'POST', headers: { "Bypass-Tunnel-Reminder": "true" } });
      fetchSkills(userId);
    } catch (err) { console.error("Train error"); }
  };

  const handleAddSkill = async () => {
    if (!newSkillName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const newId = `skill_${Math.random().toString(36).substr(2, 9)}`;
    const payload = { id: newId, name: newSkillName.trim(), parent_id: selectedSkill, user_id: Number(userId) };

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
    if (id.startsWith('root_')) return;

    if (window.confirm("Delete this branch?")) {
      try {
        await fetch(`${API_URL}/skills/${id}`, { method: 'DELETE', headers: { "Bypass-Tunnel-Reminder": "true" } });
        setShowPopup(false);
        fetchSkills(userId);
      } catch (err) { console.error("Delete error"); }
    }
  };

  const handleResetTree = async () => {
    if (window.confirm("Ви впевнені? Це видалить усі навички, крім головної!")) {
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

      if (res.ok) {
        setIsEditingName(false);
        fetchSkills(userId);
      }
    } catch (err) { console.error("Rename error"); }
  };

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

      result[id] = {
        ...skills[id],
        pos: { x, y },
        depth
      };

      if (!children.length) return;

      const spread = baseSpread / (depth + 0.8);
      const startAngle = angle - spread / 2;

      children.forEach((childId, index) => {
        const childAngle =
          startAngle + (spread / (children.length - 1 || 1)) * index;

        const rad = (childAngle * Math.PI) / 180;
        const length = verticalSpacing - depth * 15;

        build(
          childId,
          x + Math.cos(rad) * length,
          y + Math.sin(rad) * length,
          childAngle,
          depth + 1
        );
      });
    };

    const rootId = Object.keys(skills).find(id => id.startsWith("root_"));
    if (rootId) build(rootId, centerX, startY);

    return result;
  }, [skills]);

  if (!skills || !userId)
    return (
      <div style={{
        background: '#020617',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
      }}>
        LOADING...
      </div>
    );

  return (
    <div style={{
      background: '#020617',
      width: '100vw',
      height: '100vh',
      position: 'fixed',
      overflow: 'hidden',
      fontFamily: 'sans-serif'
    }}>

      <TransformWrapper
        initialScale={0.6}
        centerOnInit
        minScale={0.1}
        limitToBounds={false}
      >
        <TransformComponent wrapperStyle={{ width: "100vw", height: "100vh" }}>
          <div style={{ width: "2000px", height: "2000px", position: "relative" }}>

            <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
              {Object.entries(treeData).map(([id, data]) => {
                const parent = treeData[data.parent];
                if (!parent) return null;

                return (
                  <path
                    key={`line-${id}`}
                    d={`M ${parent.pos.x} ${parent.pos.y} 
                        Q ${(parent.pos.x + data.pos.x) / 2} ${(parent.pos.y + data.pos.y) / 2 - 20} 
                        ${data.pos.x} ${data.pos.y}`}
                    stroke={data.level > 0 ? "#3b82f6" : "#1e293b"}
                    strokeWidth={Math.max(2, 10 - data.depth * 2)}
                    fill="none"
                    style={{ opacity: 0.5 }}
                  />
                );
              })}
            </svg>

            {Object.entries(treeData).map(([id, data]) => (
              <div
                key={`node-${id}`}
                style={{
                  position: 'absolute',
                  left: data.pos.x,
                  top: data.pos.y,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <motion.div
                  whileTap={{ scale: 1.15 }}
                  onTap={() => {
                    setSelectedSkill(id);
                    setPopupMode('menu');
                    setShowPopup(true);
                  }}
                >
                  <div style={{
                    width: data.depth === 0 ? '36px' : '24px',
                    height: data.depth === 0 ? '36px' : '24px',
                    background:
                      data.level >= 100
                        ? '#60a5fa'
                        : data.level > 0
                          ? '#2563eb'
                          : '#1e293b',
                    transform: 'rotate(45deg)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: data.level > 0
                      ? `0 0 15px rgba(59, 130, 246, 0.5)`
                      : 'none',
                    cursor: 'pointer'
                  }} />

                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: '12px',
                    color: '#fff',
                    fontSize: '10px',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    pointerEvents: 'none'
                  }}>
                    <div style={{ fontWeight: 'bold' }}>{data.name}</div>
                    <div style={{ color: '#3b82f6' }}>{Math.floor(data.level)}%</div>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>

      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(2, 6, 23, 0.85)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '20px'
            }}
            onClick={() => setShowPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              style={{
                background: '#1e293b',
                padding: '24px',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '300px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ color: '#fff', textAlign: 'center' }}>
                {skills[selectedSkill]?.name}
              </h2>

              <p style={{ color: '#64748b', textAlign: 'center' }}>
                Level: {Math.floor(skills[selectedSkill]?.level)}%
              </p>

              <button
                onClick={() => { trainSkill(selectedSkill); setShowPopup(false); }}
                style={{ width: '100%', padding: '12px', marginTop: '10px' }}
              >
                TRAIN
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;

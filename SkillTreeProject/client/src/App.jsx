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
  const [userAvatar, setUserAvatar] = useState(null);
  const [firstName, setFirstName] = useState('');

  const transformComponentRef = useRef(null);
  const tg = window.Telegram?.WebApp;

  // Завантаження даних (залишаємо логіку без змін)
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

  // Малювання органічної гілки
  const renderBranch = (id, data) => {
    if (!data?.parent || !skills[data.parent]) return null;
    const parent = skills[data.parent];
    const child = data;

    // Розрахунок кривої для "природного" вигляду
    const midX = parent.pos.x;
    const midY = (parent.pos.y + child.pos.y) / 2;
    
    // Чим вище рівень, тим "товстіша" і яскравіша гілка (соки дерева)
    const thickness = Math.max(2, 8 - (child.level / 20)); 
    const strokeColor = child.level > 0 ? "#3b82f6" : "#2d3748";

    return (
      <g key={`branch-${id}`}>
        <path
          d={`M ${parent.pos.x} ${parent.pos.y} C ${midX} ${midY}, ${child.pos.x} ${midY}, ${child.pos.x} ${child.pos.y}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={thickness}
          strokeLinecap="round"
          style={{ opacity: 0.6, transition: 'all 0.5s ease' }}
        />
      </g>
    );
  };

  if (!skills) return <div style={{background:'#020617', height:'100vh'}} />;

  return (
    <div style={{ background: '#020617', width: '100vw', height: '100vh', position: 'fixed', overflow: 'hidden' }}>
      
      {/* Ефект туману на фоні */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #020617 100%)', opacity: 0.5 }} />

      <header style={{ position: 'absolute', top: '20px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(15, 23, 42, 0.4)', padding: '8px 16px', borderRadius: '20px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ color: '#3b82f6', fontSize: '10px', fontWeight: 'bold', letterSpacing: '2px' }}>NEURAL FOREST v1.0</span>
        </div>
      </header>

      <header style={{ position: 'absolute', top: '20px', left: '0', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(15, 23, 42, 0.6)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.2)', backdropFilter: 'blur(8px)', marginBottom: '8px' }}>
          {userAvatar ? (
            <img src={userAvatar} alt="avatar" style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid #3b82f6' }} />
          ) : (
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff' }}>
              {firstName.charAt(0)}
            </div>
          )}
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>{firstName.toUpperCase()}</span>
        </div>
        <h2 style={{ color: '#fff', fontSize: '8px', letterSpacing: '3px', opacity: 0.4 }}>SYSTEM ACCESS GRANTED</h2>
      </header>



      <TransformWrapper initialScale={0.8} centerOnInit minScale={0.2} maxScale={2} limitToBounds={false}>
        <TransformComponent wrapperStyle={{ width: "100vw", height: "100vh" }}>
          <motion.div 
            animate={{ y: [0, -10, 0], rotate: [0, 0.5, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: "2000px", height: "2000px", position: "relative" }}
          >
            {/* Шар гілок */}
            <svg style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                  <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              {Object.entries(skills).map(([id, data]) => renderBranch(id, data))}
            </svg>

            {/* Шар листків (скілів) */}
            {Object.entries(skills).map(([id, data]) => (
              <div key={id} style={{ position: 'absolute', left: data.pos.x, top: data.pos.y, transform: 'translate(-50%, -50%)', zIndex: 2 }}>
                <motion.div
                  onClick={() => { setSelectedSkill(id); setPopupMode('menu'); setShowPopup(true); }}
                  whileHover={{ scale: 1.2 }}
                  style={{ position: 'relative', cursor: 'pointer' }}
                >
                  {/* Візуал листка/бруньки */}
                  <div style={{
                    width: data.parent ? '24px' : '40px',
                    height: data.parent ? '34px' : '40px',
                    background: data.level >= 100 ? '#60a5fa' : data.level > 0 ? '#1d4ed8' : '#1e293b',
                    borderRadius: '50% 50% 50% 50% / 80% 80% 20% 20%', // Форма листка
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: data.level > 0 ? `0 0 15px ${data.level >= 100 ? '#60a5fa' : '#1d4ed8'}` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.5s ease'
                  }}>
                    {/* Пульсація для активних скілів */}
                    {data.level > 0 && data.level < 100 && (
                      <motion.div
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', border: '1px solid #3b82f6' }}
                      />
                    )}
                  </div>

                  {/* Назва скіла збоку */}
                  <div style={{
                    position: 'absolute',
                    left: '35px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    whiteSpace: 'nowrap',
                    color: '#fff',
                    fontSize: data.parent ? '10px' : '14px',
                    fontWeight: data.parent ? '400' : 'bold',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    pointerEvents: 'none',
                    opacity: 0.8
                  }}>
                    {data.name}
                    <div style={{ fontSize: '8px', color: '#3b82f6' }}>{Math.floor(data.level)}%</div>
                  </div>
                </motion.div>
              </div>
            ))}
          </motion.div>
        </TransformComponent>
      </TransformWrapper>

      <AnimatePresence>
        {showPopup && (
          /* Загальний контейнер для фону та контенту */
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
            // Закриваємо при кліку на фон
            onClick={() => {
              setShowPopup(false);
              setIsEditingName(false);
            }}
          >
            {/* Саме вікно попапа */}
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{
                background: '#1e293b',
                padding: '24px',
                borderRadius: '24px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                width: '100%',
                maxWidth: '300px',
                position: 'relative'
              }}
              // Зупиняємо прокидання кліку, щоб не закрити попап при натисканні всередині
              onClick={(e) => e.stopPropagation()}
            >
              {popupMode === 'menu' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', minHeight: '32px', position: 'relative' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      {isEditingName ? (
                        <input
                          autoFocus
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          onBlur={handleRename}
                          onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                          style={{
                            background: '#0f172a',
                            color: '#fff',
                            border: '1px solid #3b82f6',
                            borderRadius: '6px',
                            padding: '2px 10px',
                            textAlign: 'center',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            outline: 'none',
                            width: `${Math.max(editedName.length, 5)}ch`,
                            minWidth: '100px',
                            maxWidth: '240px'
                          }}
                        />
                      ) : (
                        <>
                          <h2 style={{ color: '#fff', fontSize: '18px', margin: 0, textAlign: 'center', fontWeight: 'bold' }}>
                            {skills[selectedSkill]?.name}
                          </h2>
                          <button
                            onClick={() => {
                              setIsEditingName(true);
                              setEditedName(skills[selectedSkill]?.name || '');
                            }}
                            style={{ position: 'absolute', left: '100%', marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, display: 'flex', alignItems: 'center', padding: '4px' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <p style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', marginBottom: '20px' }}>
                    Level: {Math.floor(skills[selectedSkill]?.level || 0)}%
                  </p>

                  {(skills[selectedSkill]?.level || 0) < 100 ? (
                    <button onClick={() => { trainSkill(selectedSkill); setShowPopup(false); }} style={menuButtonStyle("#3b82f6")}>
                      ⚡ TRAIN SKILL
                    </button>
                  ) : (
                    <div style={{ width: '100%', height: '42px', marginBottom: '10px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10b981', background: 'rgba(16, 185, 129, 0.05)', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                        <path d="M4 22h16"></path>
                        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
                        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
                      </svg>
                      <span>MASTERED</span>
                    </div>
                  )}

                  <button onClick={() => setPopupMode('create')} style={menuButtonStyle("#10b981")}>
                    ➕ ADD CHILD BRANCH
                  </button>

                  {!selectedSkill?.startsWith('root_') && (
                    <button onClick={() => handleDelete(selectedSkill)} style={menuButtonStyle("#ef4444")}>
                      🗑️ DELETE BRANCH
                    </button>
                  )}

                  <button
                    onClick={() => { setShowPopup(false); setIsEditingName(false); }}
                    style={{ width: '100%', color: '#94a3b8', background: 'none', border: 'none', marginTop: '15px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    CANCEL
                  </button>
                </>
              ) : (
                /* Режим створення */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                  <h3 style={{ color: '#fff', fontSize: '14px', marginBottom: '16px', textAlign: 'center', fontWeight: '600', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    NEW SKILL UNDER: <span style={{ color: '#3b82f6' }}>{skills[selectedSkill]?.name}</span>
                  </h3>
                  <input
                    ref={inputRef}
                    autoFocus
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                    placeholder="Enter skill name..."
                    style={{ width: '100%', maxWidth: '240px', padding: '10px 14px', borderRadius: '10px', background: '#0f172a', color: '#fff', border: '1px solid #334155', marginBottom: '20px', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '240px' }}>
                    <button onClick={() => { setPopupMode('menu'); setNewSkillName(''); }} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: '#334155', color: '#fff', border: 'none', fontSize: '13px', fontWeight: '600' }}>
                      BACK
                    </button>
                    <button
                      onClick={handleAddSkill}
                      disabled={isSubmitting || !newSkillName.trim()}
                      style={{ flex: 1.5, padding: '10px', borderRadius: '10px', background: '#3b82f6', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 'bold', opacity: (isSubmitting || !newSkillName.trim()) ? 0.4 : 1 }}
                    >
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
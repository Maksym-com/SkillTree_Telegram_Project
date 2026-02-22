import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const API_URL = "https://skilltree-telegram-project.onrender.com";

function App() {
  const [userId, setUserId] = useState(null);
  const [skills, setSkills] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const tg = window.Telegram?.WebApp;

  // ================= API =================

  const fetchSkills = useCallback(async (uid) => {
    if (!uid) return;
    const res = await fetch(`${API_URL}/skills/${uid}`, {
      headers: { "Bypass-Tunnel-Reminder": "true" },
    });
    const data = await res.json();
    setSkills(data);
  }, []);

  useEffect(() => {
    const init = async () => {
      let tgId = 123456;
      let username = "LocalUser";

      if (tg) {
        tg.ready();
        tg.expand();
        const user = tg.initDataUnsafe?.user;
        if (user) {
          tgId = user.id;
          username = user.username || user.first_name;
        }
      }

      const res = await fetch(
        `${API_URL}/user/init/${tgId}?username=${encodeURIComponent(
          username
        )}`,
        { headers: { "Bypass-Tunnel-Reminder": "true" } }
      );

      const userData = await res.json();
      setUserId(userData.user_id);
      fetchSkills(userData.user_id);
    };

    init();
  }, [fetchSkills]);

  const trainSkill = async (id) => {
    await fetch(`${API_URL}/train/${id}`, {
      method: "POST",
      headers: { "Bypass-Tunnel-Reminder": "true" },
    });
    fetchSkills(userId);
  };

  // ================= TREE LAYOUT =================

  const treeSkills = useMemo(() => {
    if (!skills) return null;

    const result = {};
    const centerX = 1000;
    const startY = 1700;
    const verticalSpacing = 180;
    const baseSpread = 70;

    const build = (id, x, y, angle = -90, depth = 0) => {
      const children = Object.entries(skills)
        .filter(([_, s]) => s.parent === id)
        .map(([cid]) => cid);

      result[id] = {
        ...skills[id],
        pos: { x, y },
        depth,
      };

      if (!children.length) return;

      const spread = baseSpread / (depth + 1);
      const startAngle = angle - spread / 2;

      children.forEach((childId, index) => {
        const childAngle =
          startAngle + (spread / (children.length - 1 || 1)) * index;

        const rad = (childAngle * Math.PI) / 180;
        const length = verticalSpacing - depth * 10;

        const childX = x + Math.cos(rad) * length;
        const childY = y + Math.sin(rad) * length;

        build(childId, childX, childY, childAngle, depth + 1);
      });
    };

    const rootId = Object.keys(skills).find((id) =>
      id.startsWith("root_")
    );

    if (rootId) build(rootId, centerX, startY);

    return result;
  }, [skills]);

  // ================= RENDER =================

  if (!treeSkills)
    return (
      <div
        style={{
          background: "#020617",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "white",
        }}
      >
        Growing your forest...
      </div>
    );

  return (
    <div
      style={{
        background: "#020617",
        width: "100vw",
        height: "100vh",
        position: "fixed",
        overflow: "hidden",
      }}
    >
      <TransformWrapper
        initialScale={0.7}
        centerOnInit
        minScale={0.2}
        maxScale={2}
      >
        <TransformComponent wrapperStyle={{ width: "100vw", height: "100vh" }}>
          <div
            style={{
              width: "2000px",
              height: "2000px",
              position: "relative",
            }}
          >
            {/* SVG BRANCHES + TRUNK */}
            <svg
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
              }}
            >
              {/* trunk */}
              <rect
                x="985"
                y="1700"
                width="30"
                height="300"
                fill="#4b2e1f"
              />

              {Object.entries(treeSkills).map(([id, data]) => {
                if (!data.parent || !treeSkills[data.parent]) return null;
                const parent = treeSkills[data.parent];

                const thickness = Math.max(1, 14 - data.depth * 2);

                return (
                  <path
                    key={id}
                    d={`M ${parent.pos.x} ${parent.pos.y}
                        Q ${(parent.pos.x + data.pos.x) / 2}
                          ${(parent.pos.y + data.pos.y) / 2 - 40}
                          ${data.pos.x} ${data.pos.y}`}
                    stroke="#5b3a29"
                    strokeWidth={thickness}
                    fill="none"
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {/* LEAVES */}
            {Object.entries(treeSkills).map(([id, data]) => (
              <div
                key={id}
                style={{
                  position: "absolute",
                  left: data.pos.x,
                  top: data.pos.y,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <motion.div
                  whileHover={{ scale: 1.15 }}
                  onClick={() => {
                    setSelectedSkill(id);
                    setShowPopup(true);
                  }}
                  style={{
                    width: data.depth === 0 ? "40px" : "30px",
                    height: data.depth === 0 ? "40px" : "40px",
                    background:
                      data.level >= 100 ? "#4ade80" : "#16a34a",
                    clipPath:
                      "polygon(50% 0%, 100% 60%, 50% 100%, 0% 60%)",
                    boxShadow:
                      "0 0 12px rgba(34,197,94,0.6)",
                    cursor: "pointer",
                  }}
                />
              </div>
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>

      {/* POPUP */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
            onClick={() => setShowPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#1e293b",
                padding: "24px",
                borderRadius: "20px",
                color: "white",
                minWidth: "260px",
              }}
            >
              <h2>{treeSkills[selectedSkill]?.name}</h2>
              <p>
                Level:{" "}
                {Math.floor(treeSkills[selectedSkill]?.level || 0)}%
              </p>

              <button
                onClick={() => {
                  trainSkill(selectedSkill);
                  setShowPopup(false);
                }}
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "10px",
                  borderRadius: "10px",
                  background: "#3b82f6",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Train
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;

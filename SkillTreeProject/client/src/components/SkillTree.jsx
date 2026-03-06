import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

// SkillTree.jsx - Оновлений блок розрахунків та рендеру
const SkillTree = ({ skills, offsets, setOffsets, world, theme, setSelectedSkill, setShowPopup, setPopupMode, draggingId, setDraggingId }) => {

  const treeData = useMemo(() => {
    if (!skills || Object.keys(skills).length === 0) return {};

    const result = {};
    const centerX = 1000;
    const isLight = world === 'light';
    
    // ВАЖЛИВО: ці координати мають бути ідентичні початку стовбура
    const startY = isLight ? 1750 : 250; 
    const baseLength = 220;
    const baseSpread = 140;

    const build = (id, x, y, parentAngle, depth = 0) => {
      const skill = skills[id];
      if (!skill) return;

      const childrenIds = Object.keys(skills).filter(key => skills[key].parent_id === id);

      result[id] = {
        ...skill,
        id,
        parent: skill.parent_id,
        basePos: { x, y },
        depth
      };

      if (childrenIds.length === 0) return;

      const currentSpread = baseSpread / (depth + 1);
      const startAngle = parentAngle - currentSpread / 2;
      const angleStep = childrenIds.length > 1 ? currentSpread / (childrenIds.length - 1) : 0;

      childrenIds.forEach((childId, index) => {
        const currentAngle = childrenIds.length === 1 ? parentAngle : startAngle + angleStep * index;
        const rad = (currentAngle * Math.PI) / 180;
        const length = baseLength * Math.pow(0.82, depth);

        build(childId, x + Math.cos(rad) * length, y + Math.sin(rad) * length, currentAngle, depth + 1);
      });
    };

    // Шукаємо корінь (parent_id null або undefined)
    const rootId = Object.keys(skills).find(id => !skills[id].parent_id);
    if (rootId) build(rootId, centerX, startY, isLight ? -90 : 90);

    return result;
  }, [skills, world]);

  // Функція для отримання координат з урахуванням Drag-офсетів
  const getPos = (id) => {
    const data = treeData[id];
    if (!data) return { x: 0, y: 0 };
    const offset = offsets[id] || { x: 0, y: 0 };
    return {
      x: data.basePos.x + offset.x,
      y: data.basePos.y + offset.y
    };
  };

  return (
    <TransformWrapper initialScale={0.5} centerOnInit limitToBounds={false} panning={{ disabled: draggingId !== null }}>
      <TransformComponent wrapperStyle={{ width: "100vw", height: "100vh" }}>
        <div style={{ width: "2000px", height: "2000px", position: "relative" }}>
          
          <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
            {/* Стовбур - тепер він ЗАВЖДИ входить в Core */}
            <rect 
              x="998" 
              y={world === 'abyss' ? 0 : 1750} 
              width="4" 
              height="250" 
              fill={world === 'abyss' ? "url(#trunkGrad)" : "rgba(59, 130, 246, 0.2)"} 
            />

            {Object.entries(treeData).map(([id, data]) => {
              if (!data.parent) return null;
              const pPos = getPos(data.parent);
              const cPos = getPos(id);
              
              const dx = cPos.x - pPos.x;
              const dy = cPos.y - pPos.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              const qx = pPos.x + dx/2 - (dy * 0.2); // Контрольна точка кривої
              const qy = pPos.y + dy/2 + (dx * 0.2);

              return (
                <path
                  key={`l-${id}`}
                  d={`M ${pPos.x} ${pPos.y} Q ${qx} ${qy} ${cPos.x} ${cPos.y}`}
                  stroke={data.level > 0 ? accentColor : inactiveColor}
                  strokeWidth="2" fill="none"
                />
              );
            })}
          </svg>

          {Object.entries(treeData).map(([id, data]) => {
            const pos = getPos(id);
            const isRoot = !data.parent;

            return (
              <div key={id} style={{
                position: 'absolute',
                left: 0, top: 0,
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                zIndex: draggingId === id ? 100 : 10
              }}>
                <motion.div
                  drag={!isRoot} // КОРІНЬ НЕ МОЖНА ТЯГАТИ
                  dragMomentum={false}
                  onDragStart={() => setDraggingId(id)}
                  onDragEnd={() => setDraggingId(null)}
                  onDrag={(e, info) => {
                    setOffsets(prev => ({
                      ...prev,
                      [id]: {
                        x: (prev[id]?.x || 0) + info.delta.x,
                        y: (prev[id]?.y || 0) + info.delta.y
                      }
                    }));
                  }}
                  onTap={() => { setSelectedSkill(id); setPopupMode('menu'); setShowPopup(true); }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    transform: 'translate(-50%, -50%)', // Ідеальне центрування ромба на точці лінії
                    cursor: isRoot ? 'pointer' : (draggingId === id ? 'grabbing' : 'grab')
                  }}
                >
                  {/* Твій ромб та текст навички тут... */}
                </motion.div>
              </div>
            );
          })}
        </div>
      </TransformComponent>
    </TransformWrapper>
  );
};

export default SkillTree;

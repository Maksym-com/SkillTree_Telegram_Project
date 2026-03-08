import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const SkillTree = ({
  skills,
  offsets,
  setOffsets,
  world,
  theme,
  setSelectedSkill,
  setShowPopup,
  setPopupMode,
  draggingId,
  setDraggingId
}) => {

  const treeData = useMemo(() => {
    if (!skills || typeof skills !== 'object' || Object.keys(skills).length === 0) return {};

    const result = {};
    const centerX = 1000;
    const isLight = world === 'light';
    const startY = isLight ? 1750 : 250;
    const baseLength = 220;
    const baseSpread = 140;

    const build = (id, x, y, parentAngle, depth = 0) => {
      const skill = skills[id];
      if (!skill) return;

      const childrenIds = Object.keys(skills).filter(key => 
        skills[key].parent === id || skills[key].parent_id === id
      );

      result[id] = {
        ...skill,
        id,
        parentId: skill.parent || skill.parent_id, 
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

        const childX = x + Math.cos(rad) * length;
        const childY = y + Math.sin(rad) * length;

        build(childId, childX, childY, currentAngle, depth + 1);
      });
    };

    const rootId = Object.keys(skills).find(id => 
      skills[id].parent === null || 
      skills[id].parent_id === null || 
      (!skills[id].parent && !skills[id].parent_id)
    );

    if (rootId) build(rootId, centerX, startY, isLight ? -90 : 90);

    return result;
  }, [skills, world]);

  const isAbyss = world === 'abyss';
  const accentColor = isAbyss ? '#ff4d4d' : '#3b82f6';
  const inactiveColor = isAbyss ? '#1a0000' : (theme === 'dark' ? '#1e293b' : '#cbd5e1');
  const size = 28;

  if (!skills || Object.keys(treeData).length === 0) return null;

  return (
    <TransformWrapper
      initialScale={1}
      centerOnInit
      minScale={0.2}
      limitToBounds={false}
      panning={{ disabled: draggingId !== null }}
    >
      <TransformComponent wrapperStyle={{ width: "100vw", height: "100vh" }}>
        <div style={{ width: "2000px", height: "2000px", position: "relative" }}>

          <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
              <defs>
                <linearGradient id="trunkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                <stop 
                    offset="100%" 
                    stopColor={theme === 'dark' ? '#020617' : '#f8fafc'} 
                    stopOpacity="0" 
                />
                </linearGradient>
              </defs>
              <rect x="998" y="1750" width="4" height="300" fill="url(#trunkGradient)" />
            {treeData && Object.entries(treeData).map(([id, data]) => {
            const parent = treeData[data.parent];
            if (!parent) return null;
            return (
                <path key={`line-${id}`}
                d={`M ${parent.pos.x} ${parent.pos.y} Q ${(parent.pos.x + data.pos.x) / 2} ${(parent.pos.y + data.pos.y) / 2 - 20} ${data.pos.x} ${data.pos.y}`}
                /* Динамічний колір ліній: синій для активних, сірий для неактивних */
                stroke={data.level > 0 ? "#119484" : (theme === 'dark' ? "#1e293b" : "#cbd5e1")} 
                strokeWidth={Math.max(2, 10 - data.depth * 2)} 
                fill="none" 
                style={{ opacity: 0.5, transition: 'all 0.1s' }}
                />
            );
            })}
          </svg>

            {treeData && Object.entries(treeData).map(([id, data]) => (
              <div key={`node-${id}`} style={{ position: 'absolute', left: data.pos.x, top: data.pos.y, transform: 'translate(-50%, -50%)', zIndex: draggingId === id ? 100 : 5 }}>
                <motion.div
                drag
                dragElastic={0}
                dragMomentum={false}
                onTap={() => {
                  setSelectedSkill(id);
                  setPopupMode('menu');
                  setShowPopup(true);
                }}
                style={{
                  x: offsets[id]?.x || 0,
                  y: offsets[id]?.y || 0
                }}
                onDragStart={() => setDraggingId(id)}
                onDrag={(e, info) => {
                  setOffsets(prev => ({
                    ...prev,
                    [id]: {
                      x: info.offset.x,
                      y: info.offset.y
                    }
                  }));
                }}
                onDragEnd={() => {
                  setDraggingId(null);
                }}
                whileDrag={{ scale: 1.2 }}
                animate={{ scale: draggingId === id ? 1.2 : 1 }}
                >
                <div style={{
                  width: data.depth === 0 ? '36px' : '24px',
                  height: data.depth === 0 ? '36px' : '24px',
                  background: draggingId === id 
                    ? '#f59e0b' 
                    : (data.level >= 100 
                      ? '#5ad3c5' 
                      : data.level > 0 
                        ? '#45da8f' 
                        /* Колір неактивного ромба залежить від теми */
                        : (theme === 'dark' ? '#1e293b' : '#cbd5e1')),
                  transform: 'rotate(45deg)',
                  border: theme === 'dark' ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)',
                  boxShadow: data.level > 0 
                    ? `0 0 15px rgba(16, 211, 169, 0.5)` 
                    : 'none',
                  cursor: 'grab'
                }} />

                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginTop: '12px',
                  /* Колір тексту назви навички */
                  color: theme === 'dark' ? '#fff' : '#0f172a',
                  fontSize: '10px',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontWeight: 'bold' }}>{data.name}</div>
                  <div style={{ color: '#2cc3a0' }}>{Math.floor(data.level)}%</div>
                </div>
              </motion.div>
              </div>
            ))}
        </div>
      </TransformComponent>
    </TransformWrapper>
  );
};

export default SkillTree;
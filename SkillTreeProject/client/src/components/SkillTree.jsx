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
    const spreadAngle = 70; 

    const build = (id, x, y, parentAngle, depth = 0) => {
      const skill = skills[id];
      if (!skill) return;

      const childrenIds = Object.keys(skills).filter(key => 
        skills[key].parent === id || skills[key].parent_id === id
      );

      result[id] = {
        ...skill,
        id,
        parent: skill.parent || skill.parent_id, 
        pos: { x, y },
        depth
      };

      if (childrenIds.length === 0) return;

      const currentSpread = spreadAngle / (depth + 1);
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
      !skills[id].parent && !skills[id].parent_id
    );

    // Початковий кут: вгору (-90) для світла, вниз (90) для безодні
    if (rootId) build(rootId, centerX, startY, isLight ? -90 : 90);

    return result;
  }, [skills, world]);

  const isAbyss = world === 'abyss';

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

          {/* SVG ШАР ЛІНІЙ */}
          <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
            <defs>
              <linearGradient id="trunkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isAbyss ? "#ff0000" : "#3b82f6"} stopOpacity="0.4" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </linearGradient>
            </defs>
            
            {/* Стовбур */}
            <rect x="998" y={isAbyss ? 0 : 1750} width="4" height="250" fill="url(#trunkGradient)" />

            {Object.entries(treeData).map(([id, data]) => {
              const parent = treeData[data.parent];
              if (!parent) return null;

              // Динамічні координати з урахуванням перетягування (offsets)
              const x1 = parent.pos.x + (offsets[data.parent]?.x || 0);
              const y1 = parent.pos.y + (offsets[data.parent]?.y || 0);
              const x2 = data.pos.x + (offsets[id]?.x || 0);
              const y2 = data.pos.y + (offsets[id]?.y || 0);

              // Викривлення: в Abyss воно дзеркальне
              const curveOffset = isAbyss ? 20 : -20;

              return (
                <path 
                  key={`line-${id}`}
                  d={`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 + curveOffset} ${x2} ${y2}`}
                  stroke={data.level > 0 
                    ? (isAbyss ? "#ff4d4d" : "#119484") 
                    : (isAbyss ? "#300" : (theme === 'dark' ? "#1e293b" : "#cbd5e1"))
                  } 
                  strokeWidth={Math.max(2, 8 - data.depth * 1.5)} 
                  fill="none" 
                  style={{ opacity: 0.6, transition: 'stroke 0.3s' }}
                />
              );
            })}
          </svg>

          {/* ВУЗЛИ (РОМБИ) */}
          {Object.entries(treeData).map(([id, data]) => (
            <div 
              key={`node-${id}`} 
              style={{ 
                position: 'absolute', 
                left: data.pos.x, 
                top: data.pos.y, 
                transform: 'translate(-50%, -50%)', 
                zIndex: draggingId === id ? 100 : 5 
              }}
            >
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
                  y: offsets[id]?.y || 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: draggingId === id ? 'grabbing' : 'grab'
                }}
                onDragStart={() => setDraggingId(id)}
                onDrag={(e, info) => {
                  setOffsets(prev => ({
                    ...prev,
                    [id]: {
                      x: (prev[id]?.x || 0) + info.delta.x,
                      y: (prev[id]?.y || 0) + info.delta.y
                    }
                  }));
                }}
                onDragEnd={() => setDraggingId(null)}
                whileDrag={{ scale: 1.2 }}
                animate={{ scale: draggingId === id ? 1.2 : 1 }}
              >
                <div style={{
                  width: data.depth === 0 ? '36px' : '24px',
                  height: data.depth === 0 ? '36px' : '24px',
                  background: draggingId === id 
                    ? '#f59e0b' 
                    : (data.level >= 100 
                        ? (isAbyss ? '#ff0000' : '#5ad3c5') 
                        : data.level > 0 
                          ? (isAbyss ? '#900' : '#45da8f') 
                          : (isAbyss ? '#1a0000' : (theme === 'dark' ? '#1e293b' : '#cbd5e1'))
                      ),
                  transform: 'rotate(45deg)',
                  border: isAbyss 
                    ? '1px solid #600' 
                    : (theme === 'dark' ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)'),
                  boxShadow: data.level > 0 
                    ? `0 0 15px ${isAbyss ? 'rgba(255, 0, 0, 0.5)' : 'rgba(16, 211, 169, 0.5)'}` 
                    : 'none',
                }} />

                <div style={{
                  marginTop: '12px',
                  color: isAbyss ? '#ff4d4d' : (theme === 'dark' ? '#fff' : '#0f172a'),
                  fontSize: '10px',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  pointerEvents: 'none',
                  textShadow: isAbyss ? '0 0 5px #000' : 'none'
                }}>
                  <div style={{ fontWeight: 'bold' }}>{data.name}</div>
                  <div style={{ color: isAbyss ? '#ff0000' : '#2cc3a0' }}>{Math.floor(data.level)}%</div>
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
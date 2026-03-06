import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const SkillTree = ({ 
  skills, offsets, setOffsets, world, theme, 
  setSelectedSkill, setShowPopup, setPopupMode, 
  draggingId, setDraggingId 
}) => {

  const treeData = useMemo(() => {
    if (!skills || typeof skills !== 'object' || Object.keys(skills).length === 0) return {};

    const result = {};
    const centerX = 1000;
    const isLight = world === 'light';
    const startY = isLight ? 1750 : 250; 
    const baseLength = 220;
    const baseSpread = 90;

    const build = (id, x, y, parentAngle, depth = 0) => {
      const skill = skills[id];
      if (!skill) return;

      const childrenIds = Object.keys(skills).filter(key => skills[key].parent === id);
      const ownOffset = offsets[id] || { x: 0, y: 0 };

      result[id] = {
        ...skill,
        id: id,
        parent: skill.parent,
        pos: { x: x + ownOffset.x, y: y + ownOffset.y },
        depth: depth
      };

      if (childrenIds.length === 0) return;

      const currentSpread = baseSpread / (depth + 1);
      const startAngle = parentAngle - currentSpread / 2;
      const angleStep = childrenIds.length > 1 ? currentSpread / (childrenIds.length - 1) : 0;

      childrenIds.forEach((childId, index) => {
        const currentAngle = childrenIds.length === 1 ? parentAngle : startAngle + (angleStep * index);
        const rad = (currentAngle * Math.PI) / 180;
        const length = baseLength * Math.pow(0.82, depth); 

        build(childId, x + Math.cos(rad) * length, y + Math.sin(rad) * length, currentAngle, depth + 1);
      });
    };

    const rootId = Object.keys(skills).find(id => skills[id].parent === null);
    if (rootId) build(rootId, centerX, startY, isLight ? -90 : 90);

    return result;
  }, [skills, offsets, world]);

  const isAbyss = world === 'abyss';
  const accentColor = isAbyss ? '#ff4d4d' : '#3b82f6';
  const inactiveColor = isAbyss ? '#1a0000' : (theme === 'dark' ? '#1e293b' : '#cbd5e1');

  if (!skills) return null;

  return (
    <TransformWrapper 
      initialScale={0.5} 
      centerOnInit 
      minScale={0.2} 
      limitToBounds={false} 
      panning={{ disabled: draggingId !== null }}
    >
      <TransformComponent wrapperStyle={{ width: "100vw", height: "100vh" }}>
        <div style={{ width: "2000px", height: "2000px", position: "relative" }}>
          
          <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
            <defs>
              <linearGradient id="trunkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
            
            <rect x="998" y={isAbyss ? 0 : 1750} width="4" height="250" fill="url(#trunkGrad)" />

            {Object.entries(treeData).map(([id, data]) => {
              const parent = treeData[data.parent];
              if (!parent) return null;
              return (
                <motion.path
                  key={`line-${id}`}
                  d={`M ${parent.pos.x} ${parent.pos.y} Q ${(parent.pos.x + data.pos.x) / 2} ${(parent.pos.y + data.pos.y) / 2 - (world === 'light' ? 20 : -20)} ${data.pos.x} ${data.pos.y}`}
                  stroke={data.level > 0 ? accentColor : inactiveColor}
                  strokeWidth="2"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                />
              );
            })}
          </svg>

          {Object.entries(treeData).map(([id, data]) => (
            <div 
              key={id} 
              style={{ 
                position: 'absolute', 
                left: 0, top: 0,
                transform: `translate(${data.pos.x}px, ${data.pos.y}px)`, 
                zIndex: draggingId === id ? 100 : 10,
              }}
            >
              <motion.div
                drag
                dragMomentum={false}
                onDragStart={() => setDraggingId(id)}
                onDragEnd={() => setDraggingId(null)}
                onDrag={(e, info) => {
                  setOffsets(prev => ({
                    ...prev,
                    [id]: { x: (prev[id]?.x || 0) + info.delta.x, y: (prev[id]?.y || 0) + info.delta.y }
                  }));
                }}
                onTap={() => {
                    setSelectedSkill(id);
                    setPopupMode('menu');
                    setShowPopup(true);
                }}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  transform: 'translate(-50%, -50%)',
                  cursor: draggingId === id ? 'grabbing' : 'pointer'
                }}
              >
                <div style={{
                  width: '28px', height: '28px', transform: 'rotate(45deg)',
                  background: data.level > 0 ? accentColor : inactiveColor,
                  border: `2px solid ${data.level > 0 ? accentColor : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: data.level > 0 ? `0 0 15px ${accentColor}66` : 'none',
                  transition: 'background 0.3s ease'
                }} />
                
                <div style={{ 
                  marginTop: '12px', 
                  textAlign: 'center',
                  color: isAbyss ? '#ff4d4d' : (theme === 'dark' ? '#fff' : '#0f172a'),
                  fontSize: '11px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none', // Щоб текст не заважав клікати по ромбу
                  textTransform: 'uppercase'
                }}>
                  {data.name}
                  <div style={{ fontSize: '9px', opacity: 0.6 }}>{Math.floor(data.level)}%</div>
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
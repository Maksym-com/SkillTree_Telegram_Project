import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const SkillTree = ({ 
  skills, offsets, setOffsets, world, theme, 
  setSelectedSkill, setShowPopup, setPopupMode, 
  draggingId, setDraggingId 
}) => {

  const treeData = useMemo(() => {
    // ЗАХИСТ: Якщо даних ще немає, не ламаємо додаток
    if (!skills || typeof skills !== 'object' || Object.keys(skills).length === 0) return {};

    const result = {};
    const centerX = 1000;
    const isLight = world === 'light';
    
    // Координати залежно від світу
    const startY = isLight ? 1750 : 250; 
    const baseLength = 220;
    const baseSpread = 90; // Загальний кут розхилу

    const build = (id, x, y, parentAngle, depth = 0) => {
      const skill = skills[id];
      if (!skill) return;

      // Знаходимо дітей за parent_id (стиковка з твоїм API)
      const children = Object.values(skills).filter(s => s.parent_id === id);

      // Додаємо Drag offsets
      const ownOffset = offsets[id] || { x: 0, y: 0 };
      const finalX = x + ownOffset.x;
      const finalY = y + ownOffset.y;

      result[id] = {
        ...skill,
        pos: { x: finalX, y: finalY },
        depth
      };

      if (children.length === 0) return;

      // Розрахунок кутів для симетрії
      const currentSpread = baseSpread / (depth + 1);
      const startAngle = parentAngle - currentSpread / 2;
      const angleStep = children.length > 1 ? currentSpread / (children.length - 1) : 0;

      children.forEach((child, index) => {
        const currentAngle = children.length === 1 
          ? parentAngle 
          : startAngle + (angleStep * index);

        const rad = (currentAngle * Math.PI) / 180;
        const length = baseLength * Math.pow(0.82, depth); // Гілки коротшають

        build(child.id, x + Math.cos(rad) * length, y + Math.sin(rad) * length, currentAngle, depth + 1);
      });
    };

    // Шукаємо корінь (Core)
    const rootSkill = Object.values(skills).find(s => !s.parent_id || s.parent_id.startsWith('root_'));
    if (rootSkill) {
      build(rootSkill.id, centerX, startY, isLight ? -90 : 90);
    }

    return result;
  }, [skills, offsets, world]);

  // Стилі ліній та кольори
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
          
          <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
            {/* Градієнт для стовбура */}
            <defs>
              <linearGradient id="trunkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
            
            {/* Стовбур */}
            <rect 
              x="998" 
              y={isAbyss ? 0 : 1750} 
              width="4" 
              height="250" 
              fill="url(#trunkGrad)" 
              style={{ transform: isAbyss ? 'rotate(180deg)' : 'none', transformOrigin: '1000px 125px' }}
            />

            {/* Малюємо лінії зв'язків */}
            {Object.entries(treeData).map(([id, data]) => {
              const parent = treeData[data.parent_id];
              if (!parent) return null;
              
              return (
                <motion.path
                  key={`line-${id}`}
                  d={`M ${parent.pos.x} ${parent.pos.y} Q ${(parent.pos.x + data.pos.x) / 2} ${(parent.pos.y + data.pos.y) / 2 - (isLight ? 20 : -20)} ${data.pos.x} ${data.pos.y}`}
                  stroke={data.level > 0 ? accentColor : inactiveColor}
                  strokeWidth="2"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  style={{ opacity: 0.5 }}
                />
              );
            })}
          </svg>

          {/* Малюємо вузли (Skills) */}
          {Object.entries(treeData).map(([id, data]) => (
            <div 
              key={id} 
              style={{ 
                position: 'absolute', 
                left: data.pos.x, 
                top: data.pos.y, 
                transform: 'translate(-50%, -50%)',
                zIndex: draggingId === id ? 100 : 10
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
                style={{ cursor: 'pointer', textAlign: 'center' }}
              >
                {/* Ромб навички */}
                <div style={{
                  width: '28px', height: '28px', transform: 'rotate(45deg)',
                  background: data.level > 0 ? accentColor : inactiveColor,
                  border: `2px solid ${data.level > 0 ? accentColor : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: data.level > 0 ? `0 0 15px ${accentColor}66` : 'none',
                  transition: 'all 0.3s ease'
                }} />
                
                {/* Назва під ромбом */}
                <div style={{
                  marginTop: '12px', color: isAbyss ? '#ff4d4d' : (theme === 'dark' ? '#fff' : '#0f172a'),
                  fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap',
                  textShadow: theme === 'dark' ? '0 2px 4px rgba(0,0,0,0.5)' : 'none'
                }}>
                  {data.name.toUpperCase()}
                  <div style={{ opacity: 0.5, fontSize: '9px' }}>{Math.floor(data.level)}%</div>
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
import React, { useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const SkillTree = ({
  skills,
  world,
  theme,
  setSelectedSkill,
  setShowPopup,
  setPopupMode
}) => {

  const treeData = useMemo(() => {
    if (!skills || typeof skills !== 'object' || Object.keys(skills).length === 0) return {};

    const result = {};
    const centerX = 1000;
    const isAbyss = world === 'abyss';
    
    // Фільтруємо навички тільки для поточного світу
    const worldSkills = Object.keys(skills).reduce((acc, key) => {
      if (skills[key].world === world) {
        acc[key] = skills[key];
      }
      return acc;
    }, {});

    const startY = isAbyss ? 250 : 1750;
    const baseLength = 220;
    const spreadAngle = 60;

    const build = (id, x, y, parentAngle, depth = 0) => {
      const skill = worldSkills[id];
      if (!skill) return;

      const childrenIds = Object.keys(worldSkills).filter(
        key => worldSkills[key].parent === id || worldSkills[key].parent_id === id
      );

      result[id] = {
        ...skill,
        id,
        parent: skill.parent || skill.parent_id,
        pos: { x, y },
        depth
      };

      if (childrenIds.length === 0) return;

      const angleStep = childrenIds.length > 1 ? spreadAngle / (childrenIds.length - 1) : 0;
      const startAngle = parentAngle - spreadAngle / 2;

      childrenIds.forEach((childId, index) => {
        const currentAngle = childrenIds.length === 1 ? parentAngle : startAngle + angleStep * index;
        const rad = (currentAngle * Math.PI) / 180;
        const length = baseLength * Math.pow(0.85, depth); // Трохи збільшив коефіцієнт розгалуження

        const childX = x + Math.cos(rad) * length;
        const childY = y + Math.sin(rad) * length;

        build(childId, childX, childY, currentAngle, depth + 1);
      });
    };

    // Шукаємо корінь конкретно для цього світу
    const rootId = Object.keys(worldSkills).find(
      id => id.startsWith(`root_${world}`)
    );

    if (rootId) {
      build(rootId, centerX, startY, isAbyss ? 90 : -90);
    }

    return result;
  }, [skills, world]);

  const isAbyss = world === 'abyss';

  if (!skills || Object.keys(treeData).length === 0) return null;

  return (
    <TransformWrapper
      initialScale={0.8}
      centerOnInit
      minScale={0.2}
      limitToBounds={false}
    >
      <TransformComponent wrapperStyle={{ width: "100vw", height: "100vh" }}>
        <div style={{ width: "2000px", height: "2000px", position: "relative" }}>

          <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              
              <linearGradient id="trunkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isAbyss ? "#ff0000" : "#3b82f6"} stopOpacity="0.6" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Стовбур */}
            <rect 
              x="998" 
              y={isAbyss ? 0 : 1750} 
              width="4" 
              height="250" 
              fill="url(#trunkGradient)" 
            />

            {/* Лінії зв'язку */}
            {Object.entries(treeData).map(([id, data]) => {
              const parent = treeData[data.parent];
              if (!parent) return null;

              const x1 = parent.pos.x;
              const y1 = parent.pos.y;
              const x2 = data.pos.x;
              const y2 = data.pos.y;

              // Розмір ромба (з гіпотенузою, бо ромб — це квадрат, повернутий на 45°)
              const parentSize = parent.depth === 0 ? 42 : 28;
              const childSize = data.depth === 0 ? 42 : 28;
              const parentRadius = (parentSize / 2) * Math.SQRT1_2;
              const childRadius = (childSize / 2) * Math.SQRT1_2;

              // Вектор між центрами
              const dx = x2 - x1;
              const dy = y2 - y1;
              const dist = Math.hypot(dx, dy) || 1;
              const nx = dx / dist;
              const ny = dy / dist;

              // Зрушити початок/кінець до країв ромбів
              const startX = x1 + nx * parentRadius;
              const startY = y1 + ny * parentRadius;
              const endX = x2 - nx * childRadius;
              const endY = y2 - ny * childRadius;

              return (
                <path
                  key={`line-${id}`}
                  d={`M ${startX} ${startY} L ${endX} ${endY}`}
                  stroke={data.level > 0
                    ? (isAbyss ? "#ff4d4d" : "#119484")
                    : (isAbyss ? "#300" : (theme === 'dark' ? "#1e293b" : "#cbd5e1"))
                  }
                  strokeWidth={Math.max(2, 6 - data.depth)}
                  fill="none"
                  style={{
                    opacity: 0.8,
                    transition: 'stroke 0.5s ease',
                    filter: data.level > 0 ? 'url(#glow)' : 'none'
                  }}
                />
              );
            })}
          </svg>

          {/* Вузли */}
          {Object.entries(treeData).map(([id, data]) => (
            <div
              key={`node-${id}`}
              style={{
                position: 'absolute',
                left: data.pos.x,
                top: data.pos.y,
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
                cursor: 'pointer'
              }}
              onClick={() => {
                setSelectedSkill(id);
                setPopupMode('menu');
                setShowPopup(true);
              }}
            >
              <div style={{
                width: data.depth === 0 ? '42px' : '28px',
                height: data.depth === 0 ? '42px' : '28px',
                background: data.level >= 100 
                  ? (isAbyss ? '#ff0000' : '#5ad3c5') 
                  : data.level > 0 
                    ? (isAbyss ? '#900' : '#45da8f') 
                    : (isAbyss ? '#1a0000' : (theme === 'dark' ? '#1e293b' : '#cbd5e1')),
                transform: 'rotate(45deg)',
                border: isAbyss 
                  ? `2px solid ${data.level > 0 ? '#f00' : '#300'}` 
                  : `2px solid ${data.level > 0 ? '#119484' : 'rgba(100,100,100,0.2)'}`,
                boxShadow: data.level > 0 
                  ? `0 0 20px ${isAbyss ? 'rgba(255, 0, 0, 0.6)' : 'rgba(16, 211, 169, 0.6)'}` 
                  : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }} />

              <div style={{
                marginTop: '15px',
                color: isAbyss ? '#ff4d4d' : (theme === 'dark' ? '#fff' : '#0f172a'),
                fontSize: '11px',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                pointerEvents: 'none',
                textShadow: isAbyss ? '0 0 8px #000' : '0 1px 3px rgba(0,0,0,0.2)',
                fontWeight: data.depth === 0 ? 'bold' : 'normal'
              }}>
                <div>{data.name.toUpperCase()}</div>
                <div style={{ 
                    color: isAbyss ? '#f00' : '#2cc3a0', 
                    fontSize: '9px',
                    opacity: 0.8
                }}>
                    {Math.floor(data.level)}%
                </div>
              </div>
            </div>
          ))}

        </div>
      </TransformComponent>
    </TransformWrapper>
  );
};

export default SkillTree;
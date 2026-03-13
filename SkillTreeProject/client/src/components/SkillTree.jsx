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
    const spreadAngle = 70; // Трохи збільшено для кращої читаємості

    const build = (id, x, y, parentAngle, depth = 0) => {
      const skill = worldSkills[id];
      if (!skill) return;

      // Підтримка обох форматів: parent та parent_id
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
        const length = baseLength * Math.pow(0.85, depth);

        const childX = x + Math.cos(rad) * length;
        const childY = y + Math.sin(rad) * length;

        build(childId, childX, childY, currentAngle, depth + 1);
      });
    };

    // Пошук кореня за шаблоном root_world
    const rootId = Object.keys(worldSkills).find(id => id.startsWith(`root_${world}`));

    if (rootId) {
      build(rootId, centerX, startY, isAbyss ? 90 : -90);
    }

    return result;
  }, [skills, world]);

  const isAbyss = world === 'abyss';
  const accentColor = isAbyss ? "#ff4d4d" : "#3b82f6";
  const inactiveColor = isAbyss ? "#1a0000" : (theme === 'dark' ? "#1e293b" : "#cbd5e1");

  if (!skills || Object.keys(treeData).length === 0) return null;

  return (
    <TransformWrapper
      initialScale={0.7}
      centerOnInit
      minScale={0.1}
      maxScale={2}
      limitToBounds={false}
    >
      <TransformComponent wrapperStyle={{ width: "100vw", height: "100vh" }}>
        <div style={{ width: "2000px", height: "2000px", position: "relative" }}>

          {/* ШАР ЛІНІЙ */}
          <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="trunkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity="0.6" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Візуальний стовбур */}
            <rect x="998" y={isAbyss ? 0 : 1750} width="4" height="250" fill="url(#trunkGradient)" />

            {Object.entries(treeData).map(([id, data]) => {
              const parent = treeData[data.parent];
              if (!parent) return null;

              return (
                <line
                  key={`line-${id}`}
                  x1={parent.pos.x}
                  y1={parent.pos.y}
                  x2={data.pos.x}
                  y2={data.pos.y}
                  stroke={data.level > 0 ? accentColor : inactiveColor}
                  strokeWidth={Math.max(2, 4 - data.depth)}
                  style={{
                    opacity: 0.6,
                    filter: data.level > 0 ? 'url(#glow)' : 'none',
                    transition: 'stroke 0.4s ease'
                  }}
                />
              );
            })}
          </svg>

          {/* ШАР ВУЗЛІВ (РОМБІВ) */}
          {Object.entries(treeData).map(([id, data]) => (
            <div
              key={`node-${id}`}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                // Центрування вузла точно в координатах гілки
                transform: `translate(${data.pos.x}px, ${data.pos.y}px) translate(-50%, -50%)`,
                zIndex: 10,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
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
                  ? accentColor 
                  : data.level > 0 ? `${accentColor}cc` : inactiveColor,
                transform: 'rotate(45deg)',
                border: `2px solid ${data.level > 0 ? accentColor : 'rgba(255,255,255,0.1)'}`,
                boxShadow: data.level > 0 ? `0 0 15px ${accentColor}88` : 'none',
                transition: 'all 0.3s ease',
                flexShrink: 0
              }} />

              <div style={{
                marginTop: '12px',
                color: isAbyss ? '#ff4d4d' : (theme === 'dark' ? '#fff' : '#0f172a'),
                fontSize: '10px',
                fontWeight: data.depth === 0 ? 'bold' : '500',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                pointerEvents: 'none',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                textTransform: 'uppercase'
              }}>
                {data.name}
                <div style={{ fontSize: '8px', opacity: 0.7 }}>{Math.floor(data.level)}%</div>
              </div>
            </div>
          ))}
        </div>
      </TransformComponent>
    </TransformWrapper>
  );
};

export default SkillTree;
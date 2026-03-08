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
  const startY = world === 'light' ? 1750 : 250;
  const baseLength = 220; // початкова довжина гілки
  const spreadAngle = 60; // максимальний розкид дітей в градусах

  const build = (id, x, y, parentAngle = -90, depth = 0) => {
    const skill = skills[id];
    if (!skill) return;

    const childrenIds = Object.keys(skills).filter(
      key => skills[key].parent === id || skills[key].parent_id === id
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
      const length = baseLength * Math.pow(0.8, depth); // коротші гілки з глибиною

      const childX = x + Math.cos(rad) * length;
      const childY = y + Math.sin(rad) * length;

      build(childId, childX, childY, currentAngle, depth + 1);
    });
  };

  const rootId = Object.keys(skills).find(
    id => !skills[id].parent && !skills[id].parent_id
  );

  if (rootId) build(rootId, centerX, startY);

  return result;
}, [skills, world]);


  if (!skills || Object.keys(treeData).length === 0) return null;

  return (
    <TransformWrapper
      initialScale={1}
      centerOnInit
      minScale={0.2}
      limitToBounds={false}
    >
      <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
        <div style={{ width: "2000px", height: "2000px", position: "relative" }}>

          {/* Лінії */}
          <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
            {Object.entries(treeData).map(([id, data]) => {
              const parent = treeData[data.parent];
              if (!parent) return null;

              const x1 = parent.pos.x;
              const y1 = parent.pos.y;
              const x2 = data.pos.x;
              const y2 = data.pos.y;

              return (
                <path key={`line-${id}`}
                  d={`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 - 20} ${x2} ${y2}`}
                  stroke={data.level > 0 ? "#119484" : (theme === 'dark' ? "#1e293b" : "#cbd5e1")} 
                  strokeWidth={Math.max(2, 8 - data.depth * 1.5)} 
                  fill="none" 
                  style={{ opacity: 0.6, transition: 'stroke 0.3s' }}
                />
              );
            })}
          </svg>

          {/* Ромби */}
          {Object.entries(treeData).map(([id, data]) => (
            <div 
              key={`node-${id}`} 
              style={{ 
                position: 'absolute', 
                left: data.pos.x,
                top: data.pos.y,
                transform: 'translate(-50%, -50%)', 
                zIndex: 5,
                cursor: 'pointer'
              }}
              onClick={() => {
                setSelectedSkill(id);
                setPopupMode('menu');
                setShowPopup(true);
              }}
            >
              <div style={{
                width: data.depth === 0 ? '36px' : '24px',
                height: data.depth === 0 ? '36px' : '24px',
                background: data.level >= 100 ? '#5ad3c5' : data.level > 0 ? '#45da8f' : (theme === 'dark' ? '#1e293b' : '#cbd5e1'),
                transform: 'rotate(45deg)',
                border: theme === 'dark' ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)',
                boxShadow: data.level > 0 ? `0 0 15px rgba(16, 211, 169, 0.5)` : 'none',
              }} />

              <div style={{
                marginTop: '12px',
                color: theme === 'dark' ? '#fff' : '#0f172a',
                fontSize: '10px',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                <div style={{ fontWeight: 'bold' }}>{data.name}</div>
                <div style={{ color: '#2cc3a0' }}>{Math.floor(data.level)}%</div>
              </div>
            </div>
          ))}

        </div>
      </TransformComponent>
    </TransformWrapper>
  );
};

export default SkillTree;

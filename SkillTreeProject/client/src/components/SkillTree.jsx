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

  // базова позиція без зсуву
  const getBasePos = id => ({
    x: treeData[id]?.pos.x || 0,
    y: treeData[id]?.pos.y || 0,
  });

  // позиція, яку використовують шляхи
  const getPos = id => {
    const base = getBasePos(id);
    const off = offsets[id] || { x: 0, y: 0 };
    return { x: base.x + off.x, y: base.y + off.y };
  };

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

              const { x: x1, y: y1 } = getPos(data.parent);
              const { x: x2, y: y2 } = getPos(id);

              // Викривлення: в Abyss воно дзеркальне
              const curveOffset = isAbyss ? -40 : 40;
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2 + curveOffset;

              return (
                <path 
                  key={`line-${id}`}
                  d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
                  stroke={data.level > 0 
                    ? (isAbyss ? "#ff4d4d" : "#119484") 
                    : (isAbyss ? "#300" : (theme === 'dark' ? "#1e293b" : "#cbd5e1"))
                  } 
                  strokeWidth={Math.max(2, 8 - data.depth * 1.5)} 
                  fill="none" 
                  style={{ opacity: 0.6, transition: 'stroke 0.3s', pointerEvents: 'none' }}
                />
              );
            })}
          </svg>

          {/* ВУЗЛИ (РОМБИ) */}
          {Object.entries(treeData).map(([id, data]) => {
            const { x: baseX, y: baseY } = getBasePos(id);
            const off = offsets[id] || { x: 0, y: 0 };

            return (
              <div
                key={`node-${id}`}
                style={{
                  position: 'absolute',
                  left: baseX,
                  top: baseY,
                  transform: 'translate(-50%, -50%)',
                  zIndex: draggingId === id ? 100 : 5
                  // необов’язково, але корисно для дебагу:
                  // border: '1px solid red'
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
                    x: off.x,
                    y: off.y,
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
                  {/* …вміст ромба… */}
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
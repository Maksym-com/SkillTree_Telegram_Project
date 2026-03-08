import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

/**
 * SkillTree Component
 * 
 * Renders an interactive skill tree visualization with draggable nodes and connecting lines.
 * Supports two worlds (light/abyss) with different visual themes and positioning logic.
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {Object} props.skills - Skill data object where keys are skill IDs and values contain skill details
 * @param {string} props.skills[].name - Display name of the skill
 * @param {number} props.skills[].level - Current level/progress percentage (0-100)
 * @param {string} props.skills[].parent - Parent skill ID
 * @param {string} props.skills[].parent_id - Alternative parent skill ID field
 * @param {Object} props.offsets - Position offsets for skills {skillId: {x, y}}
 * @param {Function} props.setOffsets - State setter for skill position offsets
 * @param {string} props.world - World type: 'light', 'abyss', or other
 * @param {string} props.theme - Visual theme: 'dark' or 'light'
 * @param {Function} props.setSelectedSkill - State setter for selected skill ID
 * @param {Function} props.setShowPopup - State setter for popup visibility
 * @param {Function} props.setPopupMode - State setter for popup mode type
 * @param {string|null} props.draggingId - Currently dragging skill ID or null
 * @param {Function} props.setDraggingId - State setter for dragging skill ID
 * 
 * @returns {React.ReactElement|null} Rendered skill tree with SVG connections or null if no skills
 * 
 * @example
 * <SkillTree 
 *   skills={skillsData}
 *   offsets={positionOffsets}
 *   setOffsets={setPositionOffsets}
 *   world="light"
 *   theme="dark"
 *   setSelectedSkill={setSelected}
 *   setShowPopup={setShow}
 *   setPopupMode={setMode}
 *   draggingId={currentDrag}
 *   setDraggingId={setCurrentDrag}
 * />
 */
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

    // Оптимізація: створюємо мапу дітей заздалегідь
    const childrenMap = {};
    Object.entries(skills).forEach(([id, skill]) => {
      const pId = skill.parent || skill.parent_id;
      if (pId) {
        if (!childrenMap[pId]) childrenMap[pId] = [];
        childrenMap[pId].push(id);
      }
    });

    const build = (id, x, y, parentAngle, depth = 0) => {
      const skill = skills[id];
      if (!skill) return;

      result[id] = {
        ...skill,
        id,
        parent: skill.parent || skill.parent_id,
        pos: { x, y },
        depth
      };

      const childrenIds = childrenMap[id] || [];
      if (childrenIds.length === 0) return;

      const currentSpread = spreadAngle / (depth + 1);
      const startAngle = parentAngle - currentSpread / 2;
      const angleStep = childrenIds.length > 1 ? currentSpread / (childrenIds.length - 1) : 0;

      childrenIds.forEach((childId, index) => {
        const currentAngle = childrenIds.length === 1 ? parentAngle : startAngle + angleStep * index;
        const rad = (currentAngle * Math.PI) / 180;
        const length = baseLength * Math.pow(0.82, depth);

        build(childId, x + Math.cos(rad) * length, y + Math.sin(rad) * length, currentAngle, depth + 1);
      });
    };

    const rootId = Object.keys(skills).find(id => !skills[id].parent && !skills[id].parent_id);
    console.log('Skills structure:', skills);  // Дебаг: структура skills
    console.log('Root ID found:', rootId);     // Дебаг: чи знайдено корінь
    if (rootId) {
      build(rootId, centerX, startY, isLight ? -90 : 90);
    } else {
      console.warn('No root skill found in skills data');  // Попередження, якщо корінь відсутній
    }

    console.log('treeData built:', Object.keys(result).length, 'nodes');

    return result;
  }, [skills, world]);

  const isAbyss = world === 'abyss';

  const getBasePos = id => ({
    x: treeData[id]?.pos.x || 0,
    y: treeData[id]?.pos.y || 0,
  });

  const getPos = id => {
    const base = getBasePos(id);
    const off = offsets[id] || { x: 0, y: 0 };
    const x = base.x + (off.x || 0);
    const y = base.y + (off.y || 0);
    // Перевірка на NaN
    if (isNaN(x) || isNaN(y)) {
      console.warn(`Invalid pos for ${id}:`, { base, off });
      return { x: 0, y: 0 };
    }
    return { x, y };
  };

  if (!skills || Object.keys(treeData).length === 0) {
    console.log('No skills or treeData empty');
    return null;
  }

  return (
    <TransformWrapper
      initialScale={1}
      centerOnInit
      minScale={0.2}
      limitToBounds={false}
      panning={{ disabled: draggingId !== null }}
    >
      <TransformComponent wrapperStyle={{ width: "100vw", height: "100vh" }}>
        <div style={{ width: "4000px", height: "4000px", position: "relative", userSelect: 'none', overflow: 'visible' }}>  {/* Розширено для уникнення обрізання */}
          
        <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
          <defs>
            <linearGradient id="trunkGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isAbyss ? "#ff0000" : "#3b82f6"} stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x="998" y={isAbyss ? 0 : 1750} width="4" height="250" fill="url(#trunkGradient)" />

          {Object.entries(treeData).map(([id, data]) => {
            const parent = treeData[data.parent];
            if (!parent) return null;

            const parentOffset = offsets[data.parent] || { x: 0, y: 0 };
            const childOffset = offsets[id] || { x: 0, y: 0 };

            // Використовуємо центр вузла для path
            const parentSize = parent.depth === 0 ? 36 : 24;
            const childSize = data.depth === 0 ? 36 : 24;

            const { x: x1, y: y1 } = getBasePos(data.parent);
            const { x: x2, y: y2 } = getBasePos(id);

            const x1C = x1 + parentOffset.x + parentSize / 2;
            const y1C = y1 + parentOffset.y + parentSize / 2;
            const x2C = x2 + childOffset.x + childSize / 2;
            const y2C = y2 + childOffset.y + childSize / 2;

            const curveOffset = isAbyss ? 40 : -40;

            return (
              <path 
                key={`line-${id}`}
                d={`M ${x1C} ${y1C} Q ${(x1C + x2C)/2} ${(y1C + y2C)/2 + curveOffset} ${x2C} ${y2C}`}
                stroke={data.level > 0 ? (isAbyss ? "#ff4d4d" : "#119484") : (isAbyss ? "#300" : (theme === 'dark' ? "#1e293b" : "#cbd5e1"))}
                strokeWidth={Math.max(2, 8 - data.depth * 1.5)}
                fill="none"
                style={{ opacity: 0.6, transition: 'stroke 0.3s' }}
              />
            );
          })}
        </svg>

        {Object.entries(treeData).map(([id, data]) => {
          const { x: baseX, y: baseY } = getBasePos(id);
          const off = offsets[id] || { x: 0, y: 0 };
          const nodeSize = data.depth === 0 ? 36 : 24;

          return (
            <motion.div
              key={`node-${id}`}
              drag
              dragElastic={0}
              dragMomentum={false}
              onTap={() => {
                setSelectedSkill(id);
                setPopupMode('menu');
                setShowPopup(true);
              }}
              style={{
                position: 'absolute',
                left: baseX + off.x,        // верхній лівий кут
                top: baseY + off.y,
                width: nodeSize,
                height: nodeSize,
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: draggingId === id ? 'grabbing' : 'grab',
                zIndex: draggingId === id ? 100 : 5
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
              whileDrag={{ scale: 1.15 }}
              animate={{ scale: draggingId === id ? 1.15 : 1 }}
            >
              <div style={{
                width: nodeSize,
                height: nodeSize,
                background: draggingId === id ? '#f59e0b' : (data.level >= 100 ? (isAbyss ? '#f00' : '#5ad3c5') : data.level > 0 ? (isAbyss ? '#900' : '#45da8f') : (isAbyss ? '#1a0000' : (theme === 'dark' ? '#1e293b' : '#cbd5e1'))),
                transform: 'rotate(45deg)',
                border: isAbyss ? '1px solid #600' : (theme === 'dark' ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)'),
                boxShadow: data.level > 0 ? `0 0 15px ${isAbyss ? 'rgba(255, 0, 0, 0.5)' : 'rgba(16, 211, 169, 0.5)'}` : 'none',
                transition: 'background 0.3s'
              }} />
              <div style={{
                marginTop: '12px',
                color: isAbyss ? '#ff4d4d' : (theme === 'dark' ? '#fff' : '#0f172a'),
                fontSize: '10px',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                pointerEvents: 'none',
                fontWeight: 'bold'
              }}>
                {data.name}
                <div style={{ color: isAbyss ? '#ff0000' : '#2cc3a0', fontSize: '9px' }}>{Math.floor(data.level)}%</div>
              </div>
            </motion.div>
          );
        })}

        </div>
      </TransformComponent>
    </TransformWrapper>
  );
};

export default SkillTree;
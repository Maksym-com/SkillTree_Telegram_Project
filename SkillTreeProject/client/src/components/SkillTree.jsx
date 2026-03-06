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


    // --- TREE LAYOUT ---
    const treeData = useMemo(() => {
        if (!skills || Object.keys(skills).length === 0) return {};

        const result = {};
        const centerX = 1000;
        const startY = world === 'light' ? 1750 : 250;
        const verticalSpacing = world === 'light' ? -200 : 200;
        const baseSpread = 90;

        const build = (id, x, y, angle = (world === 'light' ? -90 : 90), depth = 0, inheritedOffset = { x: 0, y: 0 }) => {
        if (!skills[id]) return;

        const children = Object.entries(skills)
            .filter(([_, s]) => s.parent_id === id) // Використовуємо parent_id з БД
            .map(([cid]) => cid);

        const ownOffset = offsets[id] || { x: 0, y: 0 };
        const totalOffset = {
            x: inheritedOffset.x + ownOffset.x,
            y: inheritedOffset.y + ownOffset.y
        };

        const finalX = x + totalOffset.x;
        const finalY = y + totalOffset.y;

        result[id] = {
            ...skills[id],
            pos: { x: finalX, y: finalY },
            depth,
            parent: skills[id].parent_id
        };

        if (children.length === 0) return;

        const spread = baseSpread / (depth + 0.8);
        const startAngle = angle - spread / 2;

        children.forEach((childId, index) => {
            const childAngle = startAngle + (spread / (children.length - 1 || 1)) * index;
            const rad = (childAngle * Math.PI) / 180;
            const length = Math.abs(verticalSpacing) - depth * 15;

            build(childId, x + Math.cos(rad) * length, y + Math.sin(rad) * length, childAngle, depth + 1, totalOffset);
        });
        };

        const rootId = Object.keys(skills).find(id => id.startsWith("root_") || !skills[id].parent_id);
        if (rootId) build(rootId, centerX, startY);

            return result;
        }, [skills, offsets, world]);

        return(
            <TransformWrapper
                initialScale={0.6}
                centerOnInit
                minScale={0.1}
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
                    <rect
                        x="998"
                        y={world === 'light' ? 1750 : 0} // Якщо безодня, стовбур йде зверху
                        width="4"
                        height="300"
                        fill="url(#trunkGradient)"
                        style={{ transform: world === 'abyss' ? 'rotate(180deg)' : 'none', transformOrigin: 'center' }}
                    />
                    {treeData && Object.entries(treeData).map(([id, data]) => {
                        const parent = treeData[data.parent];
                        if (!parent) return null;
                        return (
                        <path key={`line-${id}`}
                            d={`M ${parent.pos.x} ${parent.pos.y} Q ${(parent.pos.x + data.pos.x) / 2} ${(parent.pos.y + data.pos.y) / 2 - (world === 'light' ? 20 : -20)} ${data.pos.x} ${data.pos.y}`}
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
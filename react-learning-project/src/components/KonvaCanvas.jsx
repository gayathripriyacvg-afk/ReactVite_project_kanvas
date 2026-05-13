import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Arrow, Text, Group, Transformer } from 'react-konva';
import { useSelector } from 'react-redux';

const KonvaCanvas = ({ width, height, scale, lines, setLines }) => {
  const isDrawing = useRef(false);
  const { activeTool, brushColor, brushSize } = useSelector((state) => state.tool);
  const [selectedId, setSelectedId] = useState(null);
  const transformerRef = useRef();

  // Helper to calculate dynamic height for text boxes
  const getTextHeight = (text, width, fontSize) => {
    const charsPerLine = width / (fontSize * 0.6);
    const lines = Math.ceil(text.length / charsPerLine);
    return lines * (fontSize * 1.5) + 24; // text lines + padding
  };

  // Normalize coordinates: Convert pixel to percentage (0 to 1)
  const normalizePos = useCallback((pos) => ({
    x: pos.x / width,
    y: pos.y / height
  }), [width, height]);

  // Denormalize: Convert percentage back to pixels
  const denormalizePos = useCallback((nx, ny) => ({
    x: nx * width,
    y: ny * height
  }), [width, height]);

  const denormalizePoints = useCallback((points) => {
    return points.map((val, index) => {
      return index % 2 === 0 ? val * width : val * height;
    });
  }, [width, height]);

  const handleMouseDown = (e) => {
    // If clicking on empty space, deselect
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
      if (editingId) return; // Wait for blur to finish
      if (activeTool === 'select') return;
    } else {
      const id = e.target.id();
      // If clicking an object
      if (activeTool === 'select') {
        setSelectedId(id);
        return;
      }
      if (activeTool === 'text') {
        const anno = lines.find(l => l.id === id || (l.id && id.startsWith(l.id)));
        if (anno) {
          handleTextEdit(anno);
          return;
        }
      }
      // If using other tools and clicking an object, we usually want to start drawing anyway
      // but let's avoid it if it's specifically a selection-like click
    }

    if (activeTool === 'select' || editingId) return;

    isDrawing.current = true;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const nPos = normalizePos(pos);
    const id = `anno-${Date.now()}`;

    let newAnnotation = {
      id,
      type: activeTool,
      points: [nPos.x, nPos.y],
      brushColor: activeTool === 'eraser' ? '#ffffff' : brushColor, // Eraser uses white internally for preview but logic uses destination-out
      brushSize: brushSize,
      x: nPos.x,
      y: nPos.y,
      width: 0,
      height: 0,
      text: ''
    };

    // --- TEXT TOOL (COMMENT) LOGIC ---
    if (activeTool === 'text') {
      // We now treat text as a draggable area. MouseDown marks the start.
      // MouseMove will set the size. MouseUp will trigger editing.
      setLines([...lines, newAnnotation]);
      return;
    }
    // ----------------------------------

    setLines([...lines, newAnnotation]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current || activeTool === 'select') return;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const nPos = normalizePos(pos);

    const lastAnno = { ...lines[lines.length - 1] };
    
    if (activeTool === 'pencil' || activeTool === 'eraser') {
      lastAnno.points = lastAnno.points.concat([nPos.x, nPos.y]);
    } else if (activeTool === 'rect' || activeTool === 'circle' || activeTool === 'arrow' || activeTool === 'text') {
      lastAnno.width = nPos.x - lastAnno.x;
      lastAnno.height = nPos.y - lastAnno.y;
      if (activeTool === 'arrow') {
        lastAnno.points = [lastAnno.x, lastAnno.y, nPos.x, nPos.y];
      }
    }

    const newLines = lines.slice(0, -1);
    newLines.push(lastAnno);
    setLines(newLines);
  };

  const handleMouseUp = () => {
    if (activeTool === 'text') {
      const lastAnno = lines[lines.length - 1];
      if (Math.abs(lastAnno.width) < 0.01) {
         // If they just clicked without dragging, give it a default size
         const newLines = [...lines];
         newLines[newLines.length - 1].width = 0.3; // Increased size for "complete comment"
         newLines[newLines.length - 1].height = 0.12;
         setLines(newLines);
         handleTextEdit(newLines[newLines.length - 1]);
      } else {
         handleTextEdit(lastAnno);
      }
    }
    isDrawing.current = false;
  };

  const [editingId, setEditingId] = useState(null);

  const handleTextEdit = (anno) => {
    setEditingId(anno.id);
  };

  const handleTextDone = (id, newText) => {
    const trimmed = newText.trim();
    if (trimmed === '') {
      setLines(lines.filter(l => l.id !== id));
    } else {
      setLines(lines.map(l => l.id === id ? { ...l, text: trimmed } : l));
    }
    setEditingId(null);
  };

  const handleTransformEnd = (e) => {
    const node = e.target;
    const id = node.id();
    const newAnnos = lines.map((anno) => {
      if (anno.id === id) {
        const nPos = normalizePos({ x: node.x(), y: node.y() });
        return {
          ...anno,
          x: nPos.x,
          y: nPos.y,
        };
      }
      return anno;
    });
    setLines(newAnnos);
  };

  // Sync transformer
  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const stage = transformerRef.current.getStage();
      const selectedNode = stage.findOne('#' + selectedId);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId]);

  const handleDelete = useCallback(() => {
    if (selectedId) {
      setLines(lines.filter(l => l.id !== selectedId));
      setSelectedId(null);
    }
  }, [selectedId, lines, setLines]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !editingId) {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, editingId, handleDelete]);

  return (
    <div style={{ position: 'relative' }}>
      <Stage
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 10, cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
      >
        <Layer>
          {lines.map((anno, i) => {
            const commonProps = {
              key: anno.id || i,
              id: anno.id || `anno-${i}`,
              stroke: anno.brushColor,
              strokeWidth: anno.brushSize * scale,
              draggable: activeTool === 'select',
              onDragEnd: handleTransformEnd,
            };

            if (!anno.type || anno.type === 'pencil' || anno.type === 'eraser') {
              return (
                <Line
                  {...commonProps}
                  points={denormalizePoints(anno.points)}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={anno.type === 'eraser' ? 'destination-out' : 'source-over'}
                />
              );
            }

            const pos = denormalizePos(anno.x, anno.y);
            const size = denormalizePos(anno.width, anno.height);

            if (anno.type === 'rect') {
              return <Rect {...commonProps} x={pos.x} y={pos.y} width={size.x} height={size.y} fill={anno.brushColor + '33'} />;
            }

            if (anno.type === 'circle') {
              const radius = Math.sqrt(size.x ** 2 + size.y ** 2);
              return <Circle {...commonProps} x={pos.x} y={pos.y} radius={radius} fill={anno.brushColor + '33'} />;
            }

            if (anno.type === 'arrow') {
              return <Arrow {...commonProps} points={denormalizePoints(anno.points)} fill={anno.brushColor} />;
            }

            if (anno.type === 'text') {
              const isEditing = editingId === anno.id;
              const w = anno.width * width;
              const h = anno.height * height;
              const x = w < 0 ? pos.x + w : pos.x;
              const y = h < 0 ? pos.y + h : pos.y;
              const absW = Math.abs(w);
              const absH = Math.abs(h);

              return (
                <Group
                  key={anno.id}
                  x={x}
                  y={y}
                  draggable={activeTool === 'select'}
                  onDblClick={() => handleTextEdit(anno)}
                  onClick={() => activeTool === 'select' && setSelectedId(anno.id)}
                >
                  <Rect
                    width={absW}
                    height={absH}
                    fill="white"
                    opacity={isEditing ? 0 : 0.95}
                    cornerRadius={8}
                    stroke={selectedId === anno.id ? "#3b82f6" : "transparent"}
                    strokeWidth={2}
                    shadowBlur={10}
                    shadowColor="rgba(0,0,0,0.1)"
                  />
                  {!isEditing && (
                    <Text
                      text={anno.text || "Type here..."}
                      width={absW}
                      height={absH}
                      padding={12 * scale}
                      fontSize={16 * scale}
                      fill={anno.brushColor}
                      fontFamily="'Inter', 'Outfit', sans-serif"
                      fontStyle="500"
                      lineHeight={1.4}
                      wrap="word"
                      align="left"
                      opacity={anno.text ? 1 : 0.3}
                    />
                  )}
                </Group>
              );
            }

            return null;
          })}
          
          {activeTool === 'select' && selectedId && (
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) return oldBox;
                return newBox;
              }}
            />
          )}
        </Layer>
      </Stage>

      {/* OVERLAY DELETE BUTTON FOR SELECTED ITEM */}
      {activeTool === 'select' && selectedId && !editingId && (
        <DeleteButton 
          selectedId={selectedId} 
          lines={lines} 
          width={width} 
          height={height} 
          onDelete={handleDelete} 
        />
      )}

      {/* INLINE TEXT EDITOR OVERLAY */}
      {editingId && (
        <EditableTextArea 
          anno={lines.find(l => l.id === editingId)} 
          canvasWidth={width}
          canvasHeight={height}
          onDone={handleTextDone}
        />
      )}
    </div>
  );
};

// Helper for general delete button
const DeleteButton = ({ selectedId, lines, width, height, onDelete }) => {
  const anno = lines.find(l => l.id === selectedId);
  if (!anno) return null;

  // Calculate position (roughly top right of the object)
  let x, y;
  if (anno.type === 'pencil' || anno.type === 'eraser' || anno.type === 'arrow') {
    // For lines/arrows, use the first point or a bounding box center
    x = anno.x ? anno.x * width : (anno.points ? anno.points[0] * width : 0);
    y = anno.y ? anno.y * height : (anno.points ? anno.points[1] * height : 0);
  } else {
    const w = anno.width * width;
    const h = anno.height * height;
    x = w < 0 ? (anno.x * width) + w : (anno.x * width);
    y = h < 0 ? (anno.y * height) + h : (anno.y * height);
    x += Math.abs(w);
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
      style={{
        position: 'absolute',
        top: `${y - 12}px`,
        left: `${x - 12}px`,
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: '#ef4444',
        color: 'white',
        border: '2px solid white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        fontWeight: 'bold',
        zIndex: 1001,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
      title="Delete Annotation"
    >
      ×
    </button>
  );
};

// Helper Component for Inline Editing
const EditableTextArea = ({ anno, canvasWidth, canvasHeight, onDone }) => {
  const [val, setVal] = useState(anno.text || '');
  const areaRef = useRef();

  useEffect(() => {
    if (areaRef.current) {
      areaRef.current.focus();
      areaRef.current.select();
    }
  }, []);

  const w = anno.width * canvasWidth;
  const h = anno.height * canvasHeight;
  const x = w < 0 ? (anno.x * canvasWidth) + w : anno.x * canvasWidth;
  const y = h < 0 ? (anno.y * canvasHeight) + h : anno.y * canvasHeight;

  const style = {
    position: 'absolute',
    top: `${y}px`,
    left: `${x}px`,
    width: `${Math.abs(w)}px`,
    height: `${Math.abs(h)}px`,
    padding: '16px',
    fontSize: '16px',
    lineHeight: '1.5',
    fontFamily: 'Inter, sans-serif',
    border: '2px solid #3b82f6',
    borderRadius: '12px',
    background: 'white',
    outline: 'none',
    resize: 'none',
    zIndex: 1000,
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
  };

  return (
    <textarea
      ref={areaRef}
      style={style}
      value={val}
      placeholder="Type your comment..."
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onDone(anno.id, val)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          onDone(anno.id, val);
        }
      }}
    />
  );
};

export default KonvaCanvas;

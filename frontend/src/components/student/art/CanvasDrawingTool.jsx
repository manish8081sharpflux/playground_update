import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * CanvasDrawingTool Component - Story 12.9 (FIX-014)
 * HTML5 Canvas drawing interface for Free Sketch mode.
 * Tools: pen (color picker), eraser, clear, undo.
 * Brush sizes: small / medium / large.
 * Exports canvas as Blob for submission via existing API.
 */

const BRUSH_SIZES = [
  { id: 'small', label: 'S', size: 3 },
  { id: 'medium', label: 'M', size: 8 },
  { id: 'large', label: 'L', size: 16 },
];

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280',
];

export default function CanvasDrawingTool({ onBlobReady }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen'); // 'pen' | 'eraser'
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState('medium');
  const [undoStack, setUndoStack] = useState([]);
  const [canvasReady, setCanvasReady] = useState(false);

  // Track last point for smooth lines
  const lastPoint = useRef(null);

  const getBrushRadius = () => {
    const found = BRUSH_SIZES.find(b => b.id === brushSize);
    return found ? found.size : 8;
  };

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = containerRef.current;
    const width = container ? container.clientWidth : 800;
    const height = Math.min(600, Math.round(width * 0.75));

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    setCanvasReady(true);
    // Save initial blank state
    saveToUndoStack();
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      // Save current image
      const imageData = canvas.toDataURL();

      const width = container.clientWidth;
      const height = Math.min(600, Math.round(width * 0.75));

      canvas.width = width;
      canvas.height = height;

      // Restore image
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = imageData;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const saveToUndoStack = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    setUndoStack(prev => {
      const next = [...prev, dataUrl];
      // Keep max 30 undo states to limit memory
      if (next.length > 30) next.shift();
      return next;
    });
  }, []);

  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    lastPoint.current = point;
    setIsDrawing(true);

    // Draw a dot for single clicks
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const radius = getBrushRadius();

    ctx.beginPath();
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }
    ctx.lineWidth = radius;
    ctx.arc(point.x, point.y, radius / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const point = getCanvasPoint(e);
    const radius = getBrushRadius();

    ctx.beginPath();
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }
    ctx.lineWidth = radius;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (lastPoint.current) {
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
    lastPoint.current = point;
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    if (e) e.preventDefault();
    setIsDrawing(false);
    lastPoint.current = null;
    saveToUndoStack();
  };

  const handleUndo = () => {
    if (undoStack.length <= 1) return; // keep at least initial state

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    setUndoStack(prev => {
      const next = [...prev];
      next.pop(); // remove current state
      const previousState = next[next.length - 1];
      if (previousState) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = previousState;
      }
      return next;
    });
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToUndoStack();
  };

  const exportBlob = useCallback(() => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        resolve(null);
        return;
      }
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  }, []);

  const handleSaveAndSubmit = async () => {
    const blob = await exportBlob();
    if (blob && onBlobReady) {
      onBlobReady(blob);
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
        {/* Tool selection */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTool('pen')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              tool === 'pen'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
            title="Pen tool"
          >
            Pen
          </button>
          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              tool === 'eraser'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
            title="Eraser tool"
          >
            Eraser
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-300" />

        {/* Color picker */}
        {tool === 'pen' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    color === c ? 'border-pink-600 scale-125' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-gray-300"
              title="Custom color"
              aria-label="Custom color picker"
            />
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-8 bg-gray-300" />

        {/* Brush size */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 mr-1">Size:</span>
          {BRUSH_SIZES.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBrushSize(b.id)}
              className={`w-8 h-8 rounded-md text-xs font-bold transition-colors ${
                brushSize === b.id
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
              }`}
              title={`${b.id} brush (${b.size}px)`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-300" />

        {/* Undo & Clear */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStack.length <= 1}
            className="px-3 py-2 rounded-md text-sm font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Undo last stroke"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-2 rounded-md text-sm font-medium bg-white text-red-600 border border-red-300 hover:bg-red-50 transition-colors"
            title="Clear canvas"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white cursor-crosshair"
      >
        <canvas
          ref={canvasRef}
          className="block w-full touch-none"
          style={{ maxHeight: '600px' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
        />
      </div>

      {/* Save & Submit button */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSaveAndSubmit}
          className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-sm"
        >
          Save &amp; Submit Drawing
        </button>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';

interface KnobProps {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (val: number) => void;
  color?: string;
}

export const Knob: React.FC<KnobProps> = ({ label, min, max, value, onChange, color = '#333' }) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate rotation based on value
  // min -> -135deg, max -> 135deg
  const percentage = (value - min) / (max - min);
  const rotation = -135 + (percentage * 270);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault(); // Prevent text selection
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    // Implementing "drag up/down" to change value for better UX
    const handleDrag = (e: MouseEvent) => {
        if (!isDragging) return;
        const sensitivity = 0.005;
        const delta = -e.movementY * (max - min) * sensitivity;
        let newValue = value + delta;
        newValue = Math.max(min, Math.min(max, newValue));
        onChange(newValue);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, value, min, max, onChange]);

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div 
        ref={knobRef}
        onMouseDown={handleMouseDown}
        className="w-16 h-16 rounded-full relative cursor-ns-resize shadow-lg"
        style={{ 
            background: `conic-gradient(from 180deg at 50% 50%, #222 0deg, #555 360deg)`,
            transform: `rotate(${rotation}deg)`,
            border: `2px solid ${color}`
        }}
      >
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-4 bg-white rounded-full pointer-events-none"></div>
      </div>
      <span className="text-xs uppercase tracking-widest font-bold" style={{ color }}>{label}</span>
    </div>
  );
};

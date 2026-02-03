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
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !knobRef.current) return;

      const rect = knobRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Calculate angle from center to mouse
      const deltaX = e.clientX - centerX;
      const deltaY = centerY - e.clientY; // Invert Y because screen coords
      
      let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
      // Angle is now: 0 (right), 90 (top), 180 (left), -90 (bottom)
      // Map to 0-360 starting from bottom-left (-135 position)
      
      // Simpler approach: use Y delta for linear adjustment or implementing actual rotary feels
      // Let's implement standard "drag up/down" logic for precision or "rotary" logic?
      // Rotary is more fun.
      
      // Convert to 0-360 standard clock-wise from 6 o'clock?
      // Let's just use drag distance for simplicity and robustness
    };

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

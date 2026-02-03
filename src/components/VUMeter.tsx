import { useEffect, useRef } from 'react';
import { audioEngine } from '../audio/AudioEngine';

export const VUMeter: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const draw = () => {
            const vol = audioEngine.getVolumeData(); // 0-1
            
            // Draw Needle Meter
            const width = canvas.width;
            const height = canvas.height;
            
            ctx.clearRect(0,0, width, height);
            
            // Background / Scale
            ctx.beginPath();
            ctx.arc(width/2, height, width/2 - 10, Math.PI, 0); // Semi circle
            ctx.fillStyle = '#111';
            ctx.fill();
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Ticks
            // -20dB to +3dB roughly
            // Angle range: PI (left) to 0 (right). Typically meters go from PI*0.8 to PI*0.2
            const startAngle = Math.PI * 0.9;
            const endAngle = Math.PI * 0.1;
            
            // Draw Ticks
            for (let i = 0; i <= 10; i++) {
                const t = i / 10;
                const angle = startAngle + (endAngle - startAngle) * t;
                const r1 = width/2 - 20;
                const r2 = width/2 - 30;
                
                const x1 = width/2 + Math.cos(angle) * r1;
                const y1 = height + Math.sin(angle) * r1;
                const x2 = width/2 + Math.cos(angle) * r2;
                const y2 = height + Math.sin(angle) * r2;
                
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = t > 0.8 ? '#ef4444' : '#d4d4d8'; // Red zone
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Needle
            // Map volume 0-1 to angle
            // Use log scale for realism? simple linear for now
            // Add some smoothing/jitter
            const angle = startAngle + (endAngle - startAngle) * (Math.min(vol * 1.5, 1));
            
            const needleLen = width/2 - 25;
            const nx = width/2 + Math.cos(angle) * needleLen;
            const ny = height + Math.sin(angle) * needleLen;

            ctx.beginPath();
            ctx.moveTo(width/2, height - 10);
            ctx.lineTo(nx, ny);
            ctx.strokeStyle = '#f59e0b'; // Amber
            ctx.lineWidth = 3;
            ctx.stroke();

            // Bolt
            ctx.beginPath();
            ctx.arc(width/2, height - 10, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#333';
            ctx.fill();

            animationRef.current = requestAnimationFrame(draw);
        };
        draw();
        
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        }
    }, []);

    return (
        <div className="flex flex-col items-center">
            <div className="bg-zinc-800 border border-zinc-700 rounded-t-lg overflow-hidden relative shadow-inner">
                <canvas ref={canvasRef} width={120} height={70}></canvas>
                <div className="absolute top-2 left-0 w-full text-center">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">dB LEVEL</span>
                </div>
            </div>
            <div className="w-full bg-zinc-900 border-x border-b border-zinc-700 text-center py-1">
                 <div className="text-[8px] font-bold text-amber-600 tracking-widest">VU</div>
            </div>
        </div>
    );
};

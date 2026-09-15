import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

export const CursorEffect: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Position tracking with smooth spring lerp
  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const particles = useRef<Particle[]>([]);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const colors = ['#ff1a40', '#ff4d6d', '#ff0055', '#ff758f', '#ffffff'];

    // Mouse Move
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;

      setIsVisible(true);

      // 0ms instant position for inner dot
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      // Emit glowing sparks behind mouse
      if (particles.current.length < 50) {
        const speed = Math.random() * 2.5 + 0.5;
        const angle = Math.random() * Math.PI * 2;
        particles.current.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.5,
          size: Math.random() * 3.5 + 2,
          alpha: 1,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };

    // Detect Hovering over interactive elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest(
        'button, a, input, textarea, select, [role="button"], .product-card, .btn-primary, .btn-outline, label, .clickable'
      );
      setIsHovering(Boolean(interactive));
    };

    const handleMouseDown = (e: MouseEvent) => {
      setIsClicking(true);
      // Burst 12 bright particles on click
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12;
        const speed = Math.random() * 4 + 2;
        particles.current.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 4 + 2.5,
          alpha: 1,
          color: '#ff1a40'
        });
      }
    };

    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseover', handleMouseOver, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    // Render loop
    const render = () => {
      // 1. Smooth Spring Lerp for Outer Ring
      const lerp = 0.22;
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * lerp;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * lerp;

      if (cursorRingRef.current) {
        cursorRingRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
      }

      // 2. Draw Particle Trail
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.022;
        p.size *= 0.96;

        if (p.alpha <= 0 || p.size <= 0.3) {
          particles.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999999,
        overflow: 'hidden',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.25s ease'
      }}
    >
      {/* 1. Canvas for Floating Sparks & Click Burst */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />

      {/* 2. Fluid Outer Ring with Neon Ruby Glow */}
      <div
        ref={cursorRingRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: isHovering ? '48px' : isClicking ? '26px' : '36px',
          height: isHovering ? '48px' : isClicking ? '26px' : '36px',
          marginTop: isHovering ? '-24px' : isClicking ? '-13px' : '-18px',
          marginLeft: isHovering ? '-24px' : isClicking ? '-13px' : '-18px',
          borderRadius: '50%',
          border: isHovering ? '2px solid #ff4d6d' : '1.5px solid rgba(255, 26, 64, 0.75)',
          background: isHovering
            ? 'radial-gradient(circle, rgba(255, 26, 64, 0.28) 0%, rgba(255, 77, 109, 0.08) 70%, transparent 100%)'
            : isClicking
            ? 'rgba(255, 26, 64, 0.45)'
            : 'radial-gradient(circle, rgba(255, 26, 64, 0.15) 0%, transparent 80%)',
          boxShadow: isHovering
            ? '0 0 25px rgba(255, 26, 64, 0.8), inset 0 0 12px rgba(255, 77, 109, 0.5)'
            : '0 0 16px rgba(255, 26, 64, 0.5)',
          transition: 'width 0.18s cubic-bezier(0.16, 1, 0.3, 1), height 0.18s cubic-bezier(0.16, 1, 0.3, 1), margin 0.18s cubic-bezier(0.16, 1, 0.3, 1), background 0.18s ease, border 0.18s ease, box-shadow 0.18s ease',
          pointerEvents: 'none',
          willChange: 'transform'
        }}
      />

      {/* 3. Central Neon Dot */}
      <div
        ref={cursorDotRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: isHovering ? '6px' : isClicking ? '10px' : '8px',
          height: isHovering ? '6px' : isClicking ? '10px' : '8px',
          marginTop: isHovering ? '-3px' : isClicking ? '-5px' : '-4px',
          marginLeft: isHovering ? '-3px' : isClicking ? '-5px' : '-4px',
          borderRadius: '50%',
          background: isHovering ? '#ffffff' : '#ff1a40',
          boxShadow: isHovering
            ? '0 0 12px #ffffff, 0 0 22px #ff1a40'
            : '0 0 12px #ff1a40, 0 0 18px #ff4d6d',
          pointerEvents: 'none',
          willChange: 'transform',
          transition: 'width 0.12s ease, height 0.12s ease, margin 0.12s ease, background 0.12s ease'
        }}
      />
    </div>
  );
};

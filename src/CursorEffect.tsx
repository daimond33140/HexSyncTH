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
  const [isTouchDevice, setIsTouchDevice] = useState(true); // default to true to prevent initial flash on mobile
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

  // Only enable on desktop PC with precision mouse pointer
  useEffect(() => {
    const checkTouch = () => {
      const isMobile =
        window.matchMedia('(max-width: 768px)').matches ||
        window.matchMedia('(pointer: coarse)').matches ||
        'ontouchstart' in window ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
      setIsTouchDevice(Boolean(isMobile));
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  useEffect(() => {
    if (isTouchDevice) return;

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

    // Mouse Leave / Enter window
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    // Mouse Down / Up
    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    // Dynamic hover detection over interactive elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest('button, a, input, select, textarea, [role="button"], .interactive-hover');
      setIsHovering(Boolean(interactive));
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mouseenter', handleMouseEnter);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseover', handleMouseOver, { passive: true });

    // Smooth Canvas Particle Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Smooth lag lerp for outer ring (damping: 0.18 for tight responsiveness)
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.18;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.18;

      if (cursorRingRef.current) {
        cursorRingRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
      }

      // Render & update particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.025;
        p.size *= 0.96;

        if (p.alpha <= 0 || p.size < 0.3) {
          particles.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
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
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseover', handleMouseOver);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isTouchDevice]);

  if (isTouchDevice) return null;

  return (
    <>
      {/* Background Particle FX Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 99998,
        }}
      />

      {/* Center Laser Dot */}
      <div
        ref={cursorDotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '6px',
          height: '6px',
          backgroundColor: '#ffffff',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 100000,
          transform: 'translate3d(-100px, -100px, 0)',
          marginTop: '-3px',
          marginLeft: '-3px',
          opacity: isVisible ? 1 : 0,
          boxShadow: '0 0 10px #ff1a40, 0 0 20px #ff0055',
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Cybernetic Trailing Spring Ring */}
      <div
        ref={cursorRingRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: isHovering ? '48px' : isClicking ? '26px' : '36px',
          height: isHovering ? '48px' : isClicking ? '26px' : '36px',
          border: isHovering ? '1.5px solid #ff4d6d' : '1px solid rgba(255, 26, 64, 0.75)',
          backgroundColor: isHovering ? 'rgba(255, 26, 64, 0.12)' : isClicking ? 'rgba(255, 26, 64, 0.25)' : 'transparent',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 99999,
          transform: 'translate3d(-100px, -100px, 0)',
          marginTop: isHovering ? '-24px' : isClicking ? '-13px' : '-18px',
          marginLeft: isHovering ? '-24px' : isClicking ? '-13px' : '-18px',
          opacity: isVisible ? 1 : 0,
          boxShadow: isHovering
            ? '0 0 20px rgba(255, 26, 64, 0.5), inset 0 0 10px rgba(255, 26, 64, 0.3)'
            : '0 0 12px rgba(255, 26, 64, 0.3)',
          transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1), height 0.2s cubic-bezier(0.16, 1, 0.3, 1), margin 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, border 0.2s ease, opacity 0.2s ease',
        }}
      />
    </>
  );
};

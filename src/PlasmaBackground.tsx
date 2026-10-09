import React, { useEffect, useRef } from 'react';

export const PlasmaBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // Floating Plasma Dust Particles (Optimized)
    const particleCount = 35;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.5 + 1.2,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.7 + 0.3,
      color: Math.random() > 0.4 ? '#a855f7' : Math.random() > 0.5 ? '#d946ef' : '#06b6d4',
    }));

    let time = 0;

    const render = () => {
      time += 0.007;

      // Fill background
      ctx.fillStyle = '#07020d';
      ctx.fillRect(0, 0, width, height);

      // --- Wave 1: Deep Amethyst Energy Plasma Stream ---
      for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        const startY = height * (0.2 + layer * 0.2);
        ctx.moveTo(0, startY);

        const step = 30; // High performance step size for 144FPS
        for (let x = 0; x <= width + step; x += step) {
          const freq1 = 0.002 + layer * 0.0006;
          const amp1 = 120 + layer * 25;
          const y =
            startY +
            Math.sin(x * freq1 + time * 1.3 + layer) * amp1 +
            Math.cos(x * 0.005 - time * 0.9) * 50;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, 0, width, height);
        if (layer === 0) {
          grad.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
          grad.addColorStop(0.5, 'rgba(217, 70, 239, 0.25)');
          grad.addColorStop(1, 'transparent');
        } else if (layer === 1) {
          grad.addColorStop(0, 'rgba(217, 70, 239, 0.35)');
          grad.addColorStop(0.6, 'rgba(139, 92, 246, 0.2)');
          grad.addColorStop(1, 'transparent');
        } else {
          grad.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
          grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.18)');
          grad.addColorStop(1, 'transparent');
        }

        ctx.fillStyle = grad;
        ctx.fill();
      }

      // --- Wave 2: Swirling Vortex Ribbon ---
      for (let layer = 0; layer < 2; layer++) {
        ctx.beginPath();
        const startY = height * (0.75 - layer * 0.25);
        ctx.moveTo(width, startY);

        const step = 30;
        for (let x = width; x >= -step; x -= step) {
          const freq = 0.0025 + layer * 0.001;
          const amp = 110 + layer * 35;
          const y =
            startY +
            Math.cos(x * freq - time * 1.4 + layer) * amp +
            Math.sin(x * 0.006 + time * 0.8) * 45;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(0, 0);
        ctx.lineTo(width, 0);
        ctx.closePath();

        const grad = ctx.createLinearGradient(width, 0, 0, height);
        grad.addColorStop(0, 'rgba(217, 70, 239, 0.3)');
        grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.2)');
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.fill();
      }

      // --- Render Fast Cosmic Particles ---
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: -3,
        filter: 'blur(22px)',
        transform: 'translateZ(0)',
        willChange: 'transform',
        opacity: 0.9,
      }}
    />
  );
};

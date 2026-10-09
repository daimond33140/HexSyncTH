import React, { useEffect, useRef } from 'react';

export const PlasmaBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Cosmic Plasma Particles
    const particles = Array.from({ length: 65 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.8 + 0.8,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      alpha: Math.random() * 0.8 + 0.2,
      color: Math.random() > 0.4 ? '#a855f7' : Math.random() > 0.5 ? '#d946ef' : '#06b6d4',
    }));

    let time = 0;

    const render = () => {
      time += 0.006;
      ctx.clearRect(0, 0, width, height);

      // Deep Space Obsidian Background Base
      const bgGrad = ctx.createRadialGradient(
        width * 0.5, height * 0.4, 80,
        width * 0.5, height * 0.5, Math.max(width, height)
      );
      bgGrad.addColorStop(0, '#0d0418');
      bgGrad.addColorStop(0.5, '#07020e');
      bgGrad.addColorStop(1, '#040108');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // --- Draw Swirling Plasma Tendril 1 (Left to Right Energy Stream) ---
      for (let layer = 0; layer < 4; layer++) {
        ctx.save();
        ctx.beginPath();
        const startY = height * (0.2 + layer * 0.15);
        ctx.moveTo(0, startY);

        for (let x = 0; x <= width; x += 12) {
          const freq1 = 0.0025 + layer * 0.0005;
          const freq2 = 0.006 - layer * 0.0008;
          const amp1 = 140 + layer * 30;
          const amp2 = 70 - layer * 15;

          const y =
            startY +
            Math.sin(x * freq1 + time * 1.4 + layer) * amp1 +
            Math.cos(x * freq2 - time * 1.1) * amp2 +
            Math.sin(time * 0.6 + x * 0.001) * 30;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, 0, width, height);
        if (layer === 0) {
          grad.addColorStop(0, 'rgba(168, 85, 247, 0.32)');
          grad.addColorStop(0.5, 'rgba(217, 70, 239, 0.22)');
          grad.addColorStop(1, 'rgba(6, 182, 212, 0.05)');
        } else if (layer === 1) {
          grad.addColorStop(0, 'rgba(217, 70, 239, 0.28)');
          grad.addColorStop(0.6, 'rgba(139, 92, 246, 0.18)');
          grad.addColorStop(1, 'rgba(88, 28, 135, 0.04)');
        } else {
          grad.addColorStop(0, 'rgba(6, 182, 212, 0.2)');
          grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.15)');
          grad.addColorStop(1, 'transparent');
        }

        ctx.fillStyle = grad;
        ctx.filter = `blur(${25 + layer * 10}px)`;
        ctx.fill();
        ctx.restore();
      }

      // --- Draw Swirling Plasma Tendril 2 (Right Top to Left Bottom Vortex Ribbon) ---
      for (let layer = 0; layer < 3; layer++) {
        ctx.save();
        ctx.beginPath();
        const startY = height * (0.8 - layer * 0.2);
        ctx.moveTo(width, startY);

        for (let x = width; x >= 0; x -= 12) {
          const freq = 0.003 + layer * 0.001;
          const amp = 120 + layer * 40;

          const y =
            startY +
            Math.cos(x * freq - time * 1.6 + layer) * amp +
            Math.sin(x * 0.008 + time * 0.9) * 50;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(0, 0);
        ctx.lineTo(width, 0);
        ctx.closePath();

        const grad = ctx.createLinearGradient(width, 0, 0, height);
        grad.addColorStop(0, 'rgba(217, 70, 239, 0.25)');
        grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.16)');
        grad.addColorStop(1, 'rgba(6, 182, 212, 0.06)');

        ctx.fillStyle = grad;
        ctx.filter = `blur(${30 + layer * 8}px)`;
        ctx.fill();
        ctx.restore();
      }

      // --- Render Cosmic Particles & Plasma Dust ---
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const pAlpha = p.alpha * (0.5 + Math.sin(time * 2.5 + p.x * 0.01) * 0.5);

        ctx.save();
        ctx.globalAlpha = Math.max(0.1, Math.min(1, pAlpha));
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

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
      }}
    />
  );
};

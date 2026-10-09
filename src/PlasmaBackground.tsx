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

    // Floating Plasma Energy Particles
    const particleCount = 45;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.5 + 0.8,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.7 + 0.3,
      color: Math.random() > 0.4 ? '#a855f7' : Math.random() > 0.5 ? '#d946ef' : '#06b6d4',
    }));

    let time = 0;

    const render = () => {
      time += 0.008;
      ctx.clearRect(0, 0, width, height);

      // Deep Cosmic Space Void Background Base
      const bgGrad = ctx.createRadialGradient(
        width * 0.5, height * 0.4, 100,
        width * 0.5, height * 0.5, Math.max(width, height)
      );
      bgGrad.addColorStop(0, '#0f051d');
      bgGrad.addColorStop(0.5, '#0a0314');
      bgGrad.addColorStop(1, '#050209');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // --- Wave 1: Deep Amethyst Energy Plasma Wave ---
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, height * 0.5);
      for (let x = 0; x <= width; x += 15) {
        const y =
          height * 0.5 +
          Math.sin(x * 0.003 + time * 1.2) * 110 +
          Math.sin(x * 0.007 - time * 0.8) * 60 +
          Math.cos(time * 0.5 + x * 0.002) * 40;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();

      const waveGrad1 = ctx.createLinearGradient(0, 0, width, height);
      waveGrad1.addColorStop(0, 'rgba(139, 92, 246, 0.28)');
      waveGrad1.addColorStop(0.5, 'rgba(168, 85, 247, 0.18)');
      waveGrad1.addColorStop(1, 'rgba(88, 28, 135, 0.05)');
      ctx.fillStyle = waveGrad1;
      ctx.filter = 'blur(30px)';
      ctx.fill();
      ctx.restore();

      // --- Wave 2: Neon Magenta Fluid Plasma Wave ---
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, height * 0.3);
      for (let x = 0; x <= width; x += 15) {
        const y =
          height * 0.45 +
          Math.cos(x * 0.004 - time * 1.5) * 120 +
          Math.sin(x * 0.009 + time * 1.1) * 70 +
          Math.sin(time * 0.7) * 35;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();

      const waveGrad2 = ctx.createLinearGradient(0, height, width, 0);
      waveGrad2.addColorStop(0, 'rgba(217, 70, 239, 0.22)');
      waveGrad2.addColorStop(0.5, 'rgba(168, 85, 247, 0.14)');
      waveGrad2.addColorStop(1, 'rgba(6, 182, 212, 0.05)');
      ctx.fillStyle = waveGrad2;
      ctx.filter = 'blur(40px)';
      ctx.fill();
      ctx.restore();

      // --- Wave 3: Electric Cyan Core Ray ---
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, height * 0.7);
      for (let x = 0; x <= width; x += 20) {
        const y =
          height * 0.65 +
          Math.sin(x * 0.005 + time * 1.8) * 80 +
          Math.cos(x * 0.003 - time * 1.2) * 50;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();

      const waveGrad3 = ctx.createLinearGradient(width * 0.2, 0, width * 0.8, height);
      waveGrad3.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
      waveGrad3.addColorStop(0.5, 'rgba(217, 70, 239, 0.12)');
      waveGrad3.addColorStop(1, 'transparent');
      ctx.fillStyle = waveGrad3;
      ctx.filter = 'blur(35px)';
      ctx.fill();
      ctx.restore();

      // --- Render Cosmic Particles & Stars ---
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const pAlpha = p.alpha * (0.6 + Math.sin(time * 2 + p.x) * 0.4);

        ctx.save();
        ctx.globalAlpha = Math.max(0.1, Math.min(1, pAlpha));
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
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

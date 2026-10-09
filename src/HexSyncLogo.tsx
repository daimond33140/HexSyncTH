import React from 'react';

export const HexSyncLogo: React.FC<{ size?: number; showVersion?: boolean }> = ({ size = 36, showVersion = true }) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', userSelect: 'none' }}>
      <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="hexGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#d946ef" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <filter id="hexGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Hexagon Outer Frame */}
          <polygon
            points="20,2 36,11 36,29 20,38 4,29 4,11"
            fill="rgba(24, 10, 42, 0.75)"
            stroke="url(#hexGrad)"
            strokeWidth="3"
            filter="url(#hexGlow)"
          />
          {/* Inner Hexagon Core & Sync Symbol */}
          <polygon points="20,9 30,15 30,25 20,31 10,25 10,15" fill="none" stroke="#d946ef" strokeWidth="1.5" opacity="0.85" />
          <path d="M14 20L20 14L26 20M26 20L20 26L14 20" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="20" cy="20" r="2.5" fill="#06b6d4" />
        </svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{
            fontSize: `${size * 0.58}px`,
            fontWeight: 900,
            letterSpacing: '0.5px',
            background: 'linear-gradient(90deg, #ffffff 40%, #e879f9 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontFamily: 'Outfit, sans-serif'
          }}>
            HEXSYNC
          </span>
          <span style={{
            fontSize: `${size * 0.58}px`,
            fontWeight: 900,
            color: '#a855f7',
            fontFamily: 'Outfit, sans-serif',
            textShadow: '0 0 12px rgba(168, 85, 247, 0.7)'
          }}>
            TH
          </span>
          {showVersion && (
            <span style={{
              fontSize: `${Math.max(10, size * 0.28)}px`,
              fontWeight: 800,
              color: '#d946ef',
              background: 'rgba(217, 70, 239, 0.18)',
              border: '1px solid rgba(217, 70, 239, 0.45)',
              padding: '1px 6px',
              borderRadius: '5px',
              marginLeft: '2px',
              boxShadow: '0 0 8px rgba(217, 70, 239, 0.3)'
            }}>
              v2.0
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

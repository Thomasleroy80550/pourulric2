"use client";

import React from 'react';

const EMOJIS = ['🎃', '🦇', '💀', '👻', '🕷️'];
const NUM_DECORATIONS = 30;

const HalloweenDecorations = () => {
  const decorations = Array.from({ length: NUM_DECORATIONS }).map((_, i) => {
    const style: React.CSSProperties = {
      left: `${Math.random() * 100}vw`,
      top: `${Math.random() * 100 + 100}vh`, // Start below the screen
      animationDuration: `${Math.random() * 10 + 8}s`, // 8 to 18 seconds
      animationDelay: `${Math.random() * 10}s`,
      fontSize: `${Math.random() * 1.5 + 0.75}rem`, // 0.75rem to 2.25rem
      '--start-rot': `${Math.random() * 360}deg`,
      '--end-rot': `${Math.random() * 720 - 360}deg`,
      '--x-dir': `${Math.random() * 2 - 1}`,
      textShadow: '0 0 8px rgba(255, 165, 0, 0.7), 0 0 12px rgba(255, 69, 0, 0.5)', // Orange glow
    } as React.CSSProperties;
    
    return (
      <div key={i} className="halloween-decoration" style={style}>
        {EMOJIS[i % EMOJIS.length]}
      </div>
    );
  });

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {decorations}
      <div className="fog-layer fog-layer-1"></div>
      <div className="fog-layer fog-layer-2"></div>
    </div>
  );
};

export default HalloweenDecorations;
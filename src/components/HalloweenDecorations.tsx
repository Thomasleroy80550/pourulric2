"use client";

import React from 'react';

const EMOJIS = ['🎃', '🦇', '💀', '👻', '🕷️', '🦴', '🕸️', '⚰️', '🔮'];
const NUM_DECORATIONS = 50;

const HalloweenDecorations = () => {
  const decorations = Array.from({ length: NUM_DECORATIONS }).map((_, i) => {
    const style: React.CSSProperties = {
      left: `${Math.random() * 100}vw`,
      top: `${Math.random() * 100 + 100}vh`,
      animationDuration: `${Math.random() * 15 + 10}s`,
      animationDelay: `${Math.random() * 15}s`,
      fontSize: `${Math.random() * 2 + 1}rem`, // Plus grand : 1rem à 3rem
      '--start-rot': `${Math.random() * 360}deg`,
      '--end-rot': `${Math.random() * 720 - 360}deg`,
      '--x-dir': `${Math.random() * 2 - 1}`,
      textShadow: '0 0 10px rgba(255, 165, 0, 0.8), 0 0 20px rgba(255, 69, 0, 0.6), 0 0 30px rgba(255, 0, 0, 0.4)',
      zIndex: 9999,
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
      <div className="fog-layer fog-layer-3"></div>
    </div>
  );
};

export default HalloweenDecorations;
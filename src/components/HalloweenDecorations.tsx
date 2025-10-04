"use client";

import React from 'react';

const EMOJIS = ['🎃', '🦇', '💀', '👻', '🕷️'];
const NUM_DECORATIONS = 25;
const NUM_SPIDERS = 8; // Nombre d'araignées

const HalloweenDecorations = () => {
  const decorations = Array.from({ length: NUM_DECORATIONS }).map((_, i) => {
    const style: React.CSSProperties = {
      left: `${Math.random() * 100}vw`,
      top: `${Math.random() * 100 + 100}vh`,
      animationDuration: `${Math.random() * 12 + 8}s`,
      animationDelay: `${Math.random() * 10}s`,
      fontSize: `${Math.random() * 1.5 + 0.75}rem`,
      '--start-rot': `${Math.random() * 360}deg`,
      '--end-rot': `${Math.random() * 720 - 360}deg`,
      '--x-dir': `${Math.random() * 2 - 1}`,
      textShadow: '0 0 6px rgba(255, 140, 0, 0.6), 0 0 10px rgba(255, 100, 0, 0.4)',
      opacity: 0.7,
      zIndex: 9999,
    } as React.CSSProperties;
    
    return (
      <div key={i} className="halloween-decoration" style={style}>
        {EMOJIS[i % EMOJIS.length]}
      </div>
    );
  });

  // Araignées supplémentaires qui rampent
  const spiders = Array.from({ length: NUM_SPIDERS }).map((_, i) => {
    const spiderStyle: React.CSSProperties = {
      left: `${Math.random() * 90}vw`,
      top: `${Math.random() * 80}vh`,
      animationDuration: `${Math.random() * 15 + 10}s`,
      animationDelay: `${Math.random() * 5}s`,
      fontSize: '1.2rem',
      zIndex: 9998,
      opacity: 0.8,
    } as React.CSSProperties;

    return (
      <div 
        key={`spider-${i}`} 
        className="spider-crawl" 
        style={spiderStyle}
      >
        🕷️
      </div>
    );
  });

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {/* Image de fond Halloween */}
      <div className="halloween-bg"></div>
      {decorations}
      {spiders}
      <div className="fog-layer fog-layer-1"></div>
      <div className="fog-layer fog-layer-2"></div>
    </div>
  );
};

export default HalloweenDecorations;
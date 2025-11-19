"use client";

import React, { useMemo } from "react";

const SnowfallOverlay: React.FC = () => {
  const flakes = useMemo(() => {
    return Array.from({ length: 80 }).map((_, i) => {
      const size = 1.5 + Math.random() * 2.5; // 1.5px à 4px
      const left = Math.random() * 100; // position horizontale
      const duration = 10 + Math.random() * 10; // 10s à 20s
      const delay = Math.random() * 5; // 0s à 5s
      const opacity = 0.6 + Math.random() * 0.4; // 0.6 à 1.0
      return { id: i, size, left, duration, delay, opacity };
    });
  }, []);

  return (
    <div aria-hidden="true" className="snowflakes">
      {flakes.map(flake => (
        <span
          key={flake.id}
          className="snowflake"
          style={{
            left: `${flake.left}%`,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            animationDuration: `${flake.duration}s`,
            animationDelay: `${flake.delay}s`,
            opacity: flake.opacity,
          }}
        />
      ))}
    </div>
  );
};

export default SnowfallOverlay;
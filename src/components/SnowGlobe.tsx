"use client";

import React from "react";

const SnowGlobe: React.FC = () => {
  return (
    <div
      aria-label="Décoration Noël: Boule de neige"
      className="snow-globe"
    >
      <div className="snow-globe-inner">
        {/* neige (texture animée) */}
        <div className="snow-globe-snow" />
        {/* aspect verre */}
        <div className="snow-globe-glass" />
      </div>
    </div>
  );
};

export default SnowGlobe;
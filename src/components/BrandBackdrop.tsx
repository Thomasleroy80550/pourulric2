"use client";

import React from "react";

type BrandBackdropProps = {
  variant?: "indigo" | "blue" | "sunset";
  className?: string;
};

const BrandBackdrop: React.FC<BrandBackdropProps> = ({ variant = "indigo", className }) => {
  return (
    <div className={`absolute inset-0 ${className || ""}`}>
      {/* Motif diagonal très léger */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            variant === "indigo"
              ? "repeating-linear-gradient(135deg, rgba(79,70,229,0.12) 0, rgba(79,70,229,0.12) 2px, transparent 2px, transparent 14px)"
              : "repeating-linear-gradient(135deg, rgba(14,165,233,0.12) 0, rgba(14,165,233,0.12) 2px, transparent 2px, transparent 14px)",
        }}
      />
      {/* Halo radial doux */}
      <div
        className="absolute inset-0"
        style={{
          background:
            variant === "sunset"
              ? "radial-gradient(circle at center, rgba(245,158,11,0.14), transparent 60%)"
              : "radial-gradient(circle at center, rgba(79,70,229,0.12), transparent 60%)",
        }}
      />
      {/* Aurore conique très légère */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background:
            "conic-gradient(from 180deg at 50% 20%, #4f46e5 0%, #0ea5e9 35%, #f59e0b 70%, #4f46e5 100%)",
        }}
      />
    </div>
  );
};

export default BrandBackdrop;
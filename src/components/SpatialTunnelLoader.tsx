import React from 'react';
import { cn } from '@/lib/utils';

interface SpatialTunnelLoaderProps {
  className?: string;
}

const SpatialTunnelLoader: React.FC<SpatialTunnelLoaderProps> = ({ className }) => {
  // Generate an array of 100 stars for a denser effect
  const stars = Array.from({ length: 100 }, (_, i) => (
    <div key={i} className={`tunnel-stars delay-${i + 1}`}></div>
  ));

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden",
      "spatial-tunnel-container", // Custom class for CSS animation
      className
    )}>
      {stars}
    </div>
  );
};

export default SpatialTunnelLoader;
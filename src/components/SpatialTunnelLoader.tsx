import React from 'react';
import { cn } from '@/lib/utils';

interface SpatialTunnelLoaderProps {
  className?: string;
}

const SpatialTunnelLoader: React.FC<SpatialTunnelLoaderProps> = ({ className }) => {
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden",
      "spatial-tunnel-container", // Custom class for CSS animation
      className
    )}>
      <div className="tunnel-stars"></div>
      <div className="tunnel-stars delay-1"></div>
      <div className="tunnel-stars delay-2"></div>
      <div className="tunnel-stars delay-3"></div>
      <div className="tunnel-stars delay-4"></div>
      <div className="tunnel-stars delay-5"></div>
      <div className="tunnel-stars delay-6"></div>
      <div className="tunnel-stars delay-7"></div>
      <div className="tunnel-stars delay-8"></div>
      <div className="tunnel-stars delay-9"></div>
      <div className="tunnel-stars delay-10"></div>
      <div className="tunnel-stars delay-11"></div>
      <div className="tunnel-stars delay-12"></div>
      <div className="tunnel-stars delay-13"></div>
      <div className="tunnel-stars delay-14"></div>
      <div className="tunnel-stars delay-15"></div>
      <div className="tunnel-stars delay-16"></div>
      <div className="tunnel-stars delay-17"></div>
      <div className="tunnel-stars delay-18"></div>
      <div className="tunnel-stars delay-19"></div>
      <div className="tunnel-stars delay-20"></div>
      <div className="tunnel-stars delay-21"></div>
      <div className="tunnel-stars delay-22"></div>
      <div className="tunnel-stars delay-23"></div>
      <div className="tunnel-stars delay-24"></div>
      <div className="tunnel-stars delay-25"></div>
      <div className="tunnel-stars delay-26"></div>
      <div className="tunnel-stars delay-27"></div>
      <div className="tunnel-stars delay-28"></div>
      <div className="tunnel-stars delay-29"></div>
      <div className="tunnel-stars delay-30"></div>
      <div className="tunnel-stars delay-31"></div>
      <div className="tunnel-stars delay-32"></div>
      <div className="tunnel-stars delay-33"></div>
      <div className="tunnel-stars delay-34"></div>
      <div className="tunnel-stars delay-35"></div>
      <div className="tunnel-stars delay-36"></div>
      <div className="tunnel-stars delay-37"></div>
      <div className="tunnel-stars delay-38"></div>
      <div className="tunnel-stars delay-39"></div>
      <div className="tunnel-stars delay-40"></div>
      <div className="tunnel-stars delay-41"></div>
      <div className="tunnel-stars delay-42"></div>
      <div className="tunnel-stars delay-43"></div>
      <div className="tunnel-stars delay-44"></div>
      <div className="tunnel-stars delay-45"></div>
      <div className="tunnel-stars delay-46"></div>
      <div className="tunnel-stars delay-47"></div>
      <div className="tunnel-stars delay-48"></div>
      <div className="tunnel-stars delay-49"></div>
      <div className="tunnel-stars delay-50"></div>
    </div>
  );
};

export default SpatialTunnelLoader;
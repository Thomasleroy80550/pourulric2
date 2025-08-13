import React from 'react';
import { cn } from '@/lib/utils';

interface OnboardingVisualProgressProps {
  currentStatusIndex: number;
}

const OnboardingVisualProgress: React.FC<OnboardingVisualProgressProps> = ({ currentStatusIndex }) => {
  // Function to determine the fill color based on the current status index
  const getFillClass = (stageIndex: number) => {
    return currentStatusIndex >= stageIndex ? 'fill-blue-500 transition-all duration-500 ease-in-out' : 'fill-gray-300';
  };

  return (
    <div className="flex justify-center items-center p-4">
      <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Stage 0: Foundation */}
        <rect id="foundation" x="50" y="150" width="100" height="20" className={cn(getFillClass(0))} />

        {/* Stage 1: Walls */}
        <rect id="walls" x="50" y="90" width="100" height="60" className={cn(getFillClass(1))} />

        {/* Stage 2: Roof */}
        <path id="roof" d="M50 90 L100 50 L150 90 H50 Z" className={cn(getFillClass(2))} />

        {/* Stage 3: Windows and Door */}
        <rect id="door" x="90" y="110" width="20" height="40" className={cn(getFillClass(3))} />
        <rect id="window1" x="60" y="100" width="20" height="20" className={cn(getFillClass(3))} />
        <rect id="window2" x="120" y="100" width="20" height="20" className={cn(getFillClass(3))} />

        {/* Stage 4: Chimney (basic detail) */}
        <rect id="chimney" x="125" y="60" width="10" height="20" className={cn(getFillClass(4))} />

        {/* Stage 5: Tree (more detail) */}
        <circle id="tree_leaves" cx="30" cy="130" r="20" className={cn(getFillClass(5))} />
        <rect id="tree_trunk" x="25" y="150" width="10" height="20" className={cn(getFillClass(5))} />

        {/* Stage 6: Sun (final touch, vibrant) */}
        <circle id="sun" cx="170" cy="30" r="20" className={cn(currentStatusIndex >= 6 ? 'fill-yellow-400 transition-all duration-500 ease-in-out' : 'fill-gray-300')} />
      </svg>
    </div>
  );
};

export default OnboardingVisualProgress;
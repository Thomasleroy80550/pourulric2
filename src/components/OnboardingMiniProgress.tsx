"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";

interface OnboardingMiniProgressProps {
  currentIndex: number;
  totalSteps: number;
}

const OnboardingMiniProgress: React.FC<OnboardingMiniProgressProps> = ({ currentIndex, totalSteps }) => {
  const clampedCurrent = Math.max(0, Math.min(currentIndex, totalSteps - 1));
  const value = Math.round(((clampedCurrent) / (totalSteps - 1)) * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Progression</span>
        <span>Étape {clampedCurrent}/{totalSteps - 1}</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
};

export default OnboardingMiniProgress;
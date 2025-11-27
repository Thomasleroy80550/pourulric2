"use client";

import React from "react";
import { Zap } from "lucide-react";
import clsx from "clsx";

type Props = {
  className?: string;
};

const ElectricitySpark: React.FC<Props> = ({ className }) => {
  return (
    <div className={clsx("relative overflow-hidden rounded-md", className)}>
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-300/20 via-blue-400/20 to-indigo-500/20 blur-md" />
      <div className="relative flex items-center gap-2 px-3 py-2">
        <Zap className="h-4 w-4 text-yellow-400 animate-pulse" />
        <div className="h-1 w-full rounded-full bg-gradient-to-r from-yellow-400 via-blue-500 to-indigo-500 animate-pulse" />
        <Zap className="h-4 w-4 text-blue-400 animate-pulse" />
      </div>
    </div>
  );
};

export default ElectricitySpark;
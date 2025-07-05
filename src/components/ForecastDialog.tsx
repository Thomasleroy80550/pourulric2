"use client";

import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ForecastDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  forecastAmount: number;
  year: number;
}

const ForecastDialog: React.FC<ForecastDialogProps> = ({ isOpen, onOpenChange, forecastAmount, year }) => {
  const [displayedForecastAmount, setDisplayedForecastAmount] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Simple data for a bar chart showing forecast amount
  const data = [
    { name: `Prévision ${year}`, amount: forecastAmount },
  ];

  useEffect(() => {
    if (isOpen) {
      setDisplayedForecastAmount(0); // Reset to 0 when dialog opens
      startTimeRef.current = null; // Reset start time

      const duration = 1500; // Animation duration in milliseconds

      const animate = (currentTime: number) => {
        if (!startTimeRef.current) {
          startTimeRef.current = currentTime;
        }
        const progress = (currentTime - startTimeRef.current) / duration;

        if (progress < 1) {
          const easedProgress = 0.5 - Math.cos(progress * Math.PI) / 2; // Ease-in-out effect
          setDisplayedForecastAmount(forecastAmount * easedProgress);
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayedForecastAmount(forecastAmount); // Ensure it hits the exact target
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Clean up animation frame when dialog closes
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isOpen, forecastAmount]); // Re-run effect when dialog opens or forecastAmount changes

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full p-6 rounded-lg shadow-lg bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-green-600">Prévision Financière</DialogTitle>
          <DialogDescription className="text-center text-gray-700 dark:text-gray-300 mt-2 mb-4">
            Voici la prévision du résultat financier pour l'année {year} basée sur vos données actuelles.
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Ce montant est une projection linéaire de votre bénéfice net actuel sur l'ensemble de l'année.
            </p>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400 mt-4">
              ⚠️ Cette prévision est indicative et non garantie. Elle est basée sur les données passées et ne prend pas en compte les fluctuations futures.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="text-center text-4xl font-extrabold text-green-700 dark:text-green-400 mt-6 mb-6">
          {displayedForecastAmount.toFixed(2)}€
        </div>
        <div className="w-full h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis dataKey="name" className="text-sm text-gray-600 dark:text-gray-400" />
              <YAxis className="text-sm text-gray-600 dark:text-gray-400" />
              <Tooltip formatter={(value: number) => `${value.toFixed(2)}€`} />
              <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <DialogFooter className="mt-6 flex justify-center">
          <Button onClick={() => onOpenChange(false)} className="px-8">
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ForecastDialog;
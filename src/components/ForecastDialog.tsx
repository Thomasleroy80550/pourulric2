"use client";

import React from 'react';
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
  // Simple data for a bar chart showing forecast amount
  const data = [
    { name: `Prévision ${year}`, amount: forecastAmount },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full p-6 rounded-lg shadow-lg bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-green-600">Prévision Financière</DialogTitle>
          <DialogDescription className="text-center text-gray-700 dark:text-gray-300 mt-2 mb-6">
            Voici la prévision du résultat financier pour l'année {year} basée sur vos données actuelles.
          </DialogDescription>
        </DialogHeader>
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
        <div className="text-center text-4xl font-extrabold text-green-700 dark:text-green-400 mt-6">
          {forecastAmount.toFixed(2)}€
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
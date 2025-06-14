import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

const performanceData = [
  { name: 'Jan', revenus: 4000, depenses: 2400 },
  { name: 'Fév', revenus: 3000, depenses: 1398 },
  { name: 'Mar', revenus: 2000, depenses: 9800 },
  { name: 'Avr', revenus: 2780, depenses: 3908 },
  { name: 'Mai', revenus: 1890, depenses: 4800 },
  { name: 'Juin', revenus: 2390, depenses: 3800 },
];

const PerformancePage: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate data fetching
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500); // Simulate 1.5 seconds loading

    return () => clearTimeout(timer);
  }, []);

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Performances</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {loading ? (
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : (
            <>
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Revenus Totaux</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">15,000€</p>
                  <p className="text-sm text-gray-500">+12% par rapport au mois dernier</p>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Taux d'Occupation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">75%</p>
                  <p className="text-sm text-gray-500">+5% par rapport à l'année dernière</p>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Note Moyenne</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-yellow-600">4.7 / 5</p>
                  <p className="text-sm text-gray-500">Basé sur 120 avis</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Revenus et Dépenses Mensuels</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis dataKey="name" className="text-sm text-gray-600 dark:text-gray-400" />
                  <YAxis className="text-sm text-gray-600 dark:text-gray-400" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Bar dataKey="revenus" fill="hsl(var(--primary))" name="Revenus" />
                  <Bar dataKey="depenses" fill="hsl(var(--destructive))" name="Dépenses" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PerformancePage;
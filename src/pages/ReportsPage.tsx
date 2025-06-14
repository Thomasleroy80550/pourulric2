import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

const ReportsPage: React.FC = () => {
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
        <h1 className="text-3xl font-bold mb-6">Rapports</h1>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Génération de rapports personnalisés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
                <Skeleton className="h-10 w-full md:w-auto" />
                <div className="mt-8 space-y-2">
                  <Skeleton className="h-6 w-1/2 mb-3" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="report-type">Type de Rapport</Label>
                    <Select>
                      <SelectTrigger id="report-type">
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="financial">Financier</SelectItem>
                        <SelectItem value="bookings">Réservations</SelectItem>
                        <SelectItem value="performance">Performances</SelectItem>
                        <SelectItem value="reviews">Avis Clients</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="time-period">Période</Label>
                    <Select>
                      <SelectTrigger id="time-period">
                        <SelectValue placeholder="Sélectionner une période" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current-month">Mois en cours</SelectItem>
                        <SelectItem value="last-month">Mois dernier</SelectItem>
                        <SelectItem value="current-quarter">Trimestre en cours</SelectItem>
                        <SelectItem value="last-quarter">Trimestre dernier</SelectItem>
                        <SelectItem value="current-year">Année en cours</SelectItem>
                        <SelectItem value="last-year">Année dernière</SelectItem>
                        <SelectItem value="custom">Personnalisée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Date de début</Label>
                    <Input id="start-date" type="date" />
                  </div>
                  <div>
                    <Label htmlFor="end-date">Date de fin</Label>
                    <Input id="end-date" type="date" />
                  </div>
                </div>
                <Button className="w-full md:w-auto">Générer le Rapport</Button>

                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-3">Rapports Récents</h2>
                  <ul className="space-y-2">
                    <li className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                      <span>Rapport Financier - Mai 2025</span>
                      <Button variant="outline" size="sm">Télécharger</Button>
                    </li>
                    <li className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                      <span>Rapport de Réservations - T1 2025</span>
                      <Button variant="outline" size="sm">Télécharger</Button>
                    </li>
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ReportsPage;
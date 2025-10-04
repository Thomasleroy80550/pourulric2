"use client";

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, List, Grid } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import BookingPlanningGridMobile from '@/components/BookingPlanningGridMobile';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Reservation {
  id: string;
  room_id: string;
  room_name: string;
  start_date: string;
  end_date: string;
  guest_name: string;
  status: string;
  platform: string;
  total_amount: number;
}

const CalendarPageMobile: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('planning');

  // Fetch des réservations
  const { data: reservations = [], isLoading, error } = useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processed_reservations')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data as Reservation[];
    },
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les réservations",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-2 space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 space-y-4 max-w-full overflow-hidden">
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendrier Mobile
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="planning" className="text-sm">
                <Grid className="h-4 w-4 mr-1" />
                Planning
              </TabsTrigger>
              <TabsTrigger value="liste" className="text-sm">
                <List className="h-4 w-4 mr-1" />
                Liste
              </TabsTrigger>
            </TabsList>

            <TabsContent value="planning" className="mt-4 p-0">
              <BookingPlanningGridMobile 
                reservations={reservations} 
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="liste" className="mt-4 p-0">
              <Card>
                <CardHeader className="p-3">
                  <CardTitle className="text-base">Liste des réservations</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {reservations.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Aucune réservation trouvée
                      </p>
                    ) : (
                      reservations.map((reservation) => (
                        <div
                          key={reservation.id}
                          className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">{reservation.guest_name}</h4>
                              <p className="text-xs text-muted-foreground">{reservation.room_name}</p>
                              <p className="text-xs text-muted-foreground">{reservation.platform}</p>
                            </div>
                            <div className="text-right ml-2">
                              <p className="text-sm font-semibold">{reservation.total_amount}€</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(reservation.start_date).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <span className={`
                              inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                              ${reservation.status === 'confirmed' ? 'bg-green-100 text-green-800' : ''}
                              ${reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                              ${reservation.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                            `}>
                              {reservation.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarPageMobile;
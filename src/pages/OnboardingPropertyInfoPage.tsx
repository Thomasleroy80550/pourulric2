import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserRooms, UserRoom } from '@/lib/user-room-api';
import { updateProfile } from '@/lib/profile-api';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { RoomGeneralInfoForm } from '@/components/RoomGeneralInfoForm';
import { RoomAccessInfoForm } from '@/components/RoomAccessInfoForm';
import { RoomEquipmentForm } from '@/components/RoomEquipmentForm';
import { RoomHouseRulesForm } from '@/components/RoomHouseRulesForm';
import { RoomParkingForm } from '@/components/RoomParkingForm';
import { RoomSafetyForm } from '@/components/RoomSafetyForm';
import { RoomFurnitureList } from '@/components/RoomFurnitureList';
import { Loader2 } from 'lucide-react';
import React from 'react';

function RoomForms({ room }: { room: UserRoom }) {
  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-7 mb-4 h-auto">
        <TabsTrigger value="general">Général</TabsTrigger>
        <TabsTrigger value="access">Accès</TabsTrigger>
        <TabsTrigger value="equipment">Équipements</TabsTrigger>
        <TabsTrigger value="rules">Règlement</TabsTrigger>
        <TabsTrigger value="parking">Stationnement</TabsTrigger>
        <TabsTrigger value="safety">Sécurité</TabsTrigger>
        <TabsTrigger value="furniture">Mobilier</TabsTrigger>
      </TabsList>
      <Card>
        <CardContent className="pt-6">
          <TabsContent value="general"><RoomGeneralInfoForm room={room} /></TabsContent>
          <TabsContent value="access"><RoomAccessInfoForm room={room} /></TabsContent>
          <TabsContent value="equipment"><RoomEquipmentForm room={room} /></TabsContent>
          <TabsContent value="rules"><RoomHouseRulesForm room={room} /></TabsContent>
          <TabsContent value="parking"><RoomParkingForm room={room} /></TabsContent>
          <TabsContent value="safety"><RoomSafetyForm room={room} /></TabsContent>
          <TabsContent value="furniture"><RoomFurnitureList room={room} /></TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}

export default function OnboardingPropertyInfoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: rooms, isLoading: isLoadingRooms } = useQuery({
    queryKey: ['userRooms'],
    queryFn: getUserRooms,
  });

  const mutation = useMutation({
    mutationFn: () => updateProfile({ onboarding_status: 'photoshoot_done' }),
    onSuccess: () => {
      toast.success("Informations enregistrées ! Vous allez être redirigé.");
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setTimeout(() => navigate('/onboarding/status'), 2000);
    },
    onError: (error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  if (isLoadingRooms) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!rooms || rooms.length === 0) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Aucun logement trouvé</CardTitle>
            <CardDescription>
              Aucun logement n'est associé à votre profil pour le moment. Veuillez contacter le support.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Informations sur votre/vos logement(s)</h1>
        <p className="text-muted-foreground">
          Veuillez compléter attentivement tous les champs pour chaque logement. Vos modifications sont sauvegardées automatiquement à chaque formulaire.
        </p>
      </header>

      {rooms.length > 1 ? (
        <Accordion type="single" collapsible className="w-full space-y-4" defaultValue={rooms[0].id}>
          {rooms.map((room) => (
            <AccordionItem value={room.id} key={room.id}>
              <AccordionTrigger className="text-xl font-semibold">{room.room_name}</AccordionTrigger>
              <AccordionContent>
                <RoomForms room={room} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <RoomForms room={rooms[0]} />
      )}

      <div className="mt-8 flex justify-end">
        <Button size="lg" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          J'ai terminé, passer à l'étape suivante
        </Button>
      </div>
    </div>
  );
}
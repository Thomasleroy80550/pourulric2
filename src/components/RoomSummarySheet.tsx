"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserRoom } from '@/lib/user-room-api';
import { getFurnitureForRoom } from '@/lib/furniture-api';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer, Loader2 } from 'lucide-react';

interface RoomSummarySheetProps {
  room: UserRoom;
}

const InfoSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-6">
    <h3 className="text-lg font-semibold mb-2 text-primary">{title}</h3>
    <div className="text-sm text-muted-foreground space-y-1">{children}</div>
  </div>
);

const InfoPair = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex justify-between">
    <span className="font-medium text-foreground">{label}</span>
    <span>{value || 'Non défini'}</span>
  </div>
);

export function RoomSummarySheet({ room }: RoomSummarySheetProps) {
  const [open, setOpen] = useState(false);

  const { data: furniture, isLoading } = useQuery({
    queryKey: ['furniture', room.id],
    queryFn: () => getFurnitureForRoom(room.id),
    enabled: open, // Only fetch when the sheet is open
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">Fiche d'information</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <div id="room-summary-to-print" className="flex-grow overflow-y-auto p-6">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl">Fiche d'information : {room.room_name}</SheetTitle>
            <SheetDescription>{room.property_type}</SheetDescription>
          </SheetHeader>
          
          <InfoSection title="Informations Générales">
            <InfoPair label="Nom du logement" value={room.room_name} />
            <InfoPair label="Type de propriété" value={room.property_type} />
            <InfoPair label="ID Krossbooking" value={room.room_id} />
            <InfoPair label="ID Secondaire" value={room.room_id_2} />
          </InfoSection>

          <InfoSection title="Accès & Codes">
            <InfoPair label="Code Boîte à clés" value={room.keybox_code} />
            <InfoPair label="Code Wi-Fi" value={room.wifi_code} />
            <h4 className="font-medium text-foreground mt-4 mb-1">Instructions d'arrivée</h4>
            <p className="whitespace-pre-wrap">{room.arrival_instructions || 'Non définies'}</p>
            <h4 className="font-medium text-foreground mt-4 mb-1">Informations Parking</h4>
            <p className="whitespace-pre-wrap">{room.parking_info || 'Non définies'}</p>
          </InfoSection>

          <InfoSection title="Compteurs">
             <h4 className="font-medium text-foreground mb-1">Emplacement des compteurs</h4>
            <p className="whitespace-pre-wrap">{room.utility_locations || 'Non défini'}</p>
          </InfoSection>

          <InfoSection title="Règlement Intérieur">
            <p className="whitespace-pre-wrap">{room.house_rules || 'Non défini'}</p>
          </InfoSection>

          <InfoSection title="Inventaire du mobilier">
            {isLoading && <div className="flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
            {furniture && furniture.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Date d'achat</TableHead>
                    <TableHead className="text-right">Prix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {furniture.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell className="text-right">{item.price ? `${item.price} €` : 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
             {furniture && furniture.length === 0 && <p>Aucun mobilier enregistré.</p>}
          </InfoSection>
        </div>
        <SheetFooter className="p-6 border-t bg-background no-print">
          <Button onClick={handlePrint} className="w-full">
            <Printer className="mr-2 h-4 w-4" />
            Imprimer la fiche
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
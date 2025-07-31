"use client";

import { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { useQueryClient } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { UserRoom } from '@/lib/user-room-api';
import { getFurnitureForRoom } from '@/lib/furniture-api';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Furniture {
  id: string;
  name: string;
  purchase_date: string | null;
  price: number | null;
}

interface DownloadRoomSummaryButtonProps {
  room: UserRoom;
}

const InfoSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-2 text-blue-800">{title}</h3>
      <div className="text-sm text-gray-600 space-y-1">{children}</div>
    </div>
  );
  
const InfoPair = ({ label, value }: { label: string; value?: string | null }) => (
<div className="flex justify-between">
    <span className="font-medium text-black">{label}</span>
    <span className="text-gray-800">{value || 'Non défini'}</span>
</div>
);

const SummaryContent = ({ room, furniture }: { room: UserRoom, furniture: Furniture[] | null }) => {
    return (
        <div className="p-8 bg-white text-black" style={{ width: '800px' }}>
            <div className="mb-6 border-b pb-4">
                <h2 className="text-3xl font-bold text-gray-900">Fiche d'information : {room.room_name}</h2>
                <p className="text-lg text-gray-500">{room.property_type}</p>
            </div>
            
            <InfoSection title="Informations Générales">
                <InfoPair label="Nom du logement" value={room.room_name} />
                <InfoPair label="Type de propriété" value={room.property_type} />
                <InfoPair label="ID Krossbooking" value={room.room_id} />
                <InfoPair label="ID Secondaire" value={room.room_id_2} />
            </InfoSection>

            <InfoSection title="Accès & Codes">
                <InfoPair label="Code Boîte à clés" value={room.keybox_code} />
                <InfoPair label="Code Wi-Fi" value={room.wifi_code} />
                <h4 className="font-medium text-black mt-4 mb-1">Instructions d'arrivée</h4>
                <p className="whitespace-pre-wrap text-gray-800">{room.arrival_instructions || 'Non définies'}</p>
                <h4 className="font-medium text-black mt-4 mb-1">Informations Parking</h4>
                <p className="whitespace-pre-wrap text-gray-800">{room.parking_info || 'Non définies'}</p>
            </InfoSection>

            <InfoSection title="Compteurs">
                <h4 className="font-medium text-black mb-1">Emplacement des compteurs</h4>
                <p className="whitespace-pre-wrap text-gray-800">{room.utility_locations || 'Non défini'}</p>
            </InfoSection>

            <InfoSection title="Règlement Intérieur">
                <p className="whitespace-pre-wrap text-gray-800">{room.house_rules || 'Non défini'}</p>
            </InfoSection>

            <InfoSection title="Inventaire du mobilier">
                {furniture && furniture.length > 0 ? (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="text-black">Nom</TableHead>
                        <TableHead className="text-black">Date d'achat</TableHead>
                        <TableHead className="text-right text-black">Prix</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {furniture.map((item) => (
                        <TableRow key={item.id}>
                        <TableCell className="text-gray-800">{item.name}</TableCell>
                        <TableCell className="text-gray-800">{item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell className="text-right text-gray-800">{item.price ? `${item.price} €` : 'N/A'}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                ) : <p className="text-gray-600">Aucun mobilier enregistré.</p>}
            </InfoSection>
        </div>
    );
};

export function DownloadRoomSummaryButton({ room }: DownloadRoomSummaryButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const queryClient = useQueryClient();

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      const furniture = await queryClient.fetchQuery<Furniture[]>({
        queryKey: ['furniture', room.id],
        queryFn: () => getFurnitureForRoom(room.id),
      });

      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      document.body.appendChild(container);

      const root = ReactDOM.createRoot(container);
      root.render(<SummaryContent room={room} furniture={furniture} />);

      await new Promise(resolve => setTimeout(resolve, 500));

      const contentElement = container.firstChild as HTMLElement;
      if (!contentElement) throw new Error("PDF content element not found.");

      const canvas = await html2canvas(contentElement, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      const imgWidth = pdfWidth;
      const imgHeight = imgWidth / ratio;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`fiche-info-${room.room_name.replace(/\s+/g, '_')}.pdf`);

      root.unmount();
      document.body.removeChild(container);

    } catch (error) {
      console.error("Failed to generate PDF", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={isDownloading} variant="outline">
      {isDownloading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Télécharger
    </Button>
  );
}
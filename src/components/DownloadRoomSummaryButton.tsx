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
    <div className="mb-6 break-inside-avoid">
      <h3 className="text-lg font-semibold mb-2 text-blue-800 border-b border-blue-200 pb-1">{title}</h3>
      <div className="text-sm text-gray-600 space-y-2">{children}</div>
    </div>
  );
  
const InfoPair = ({ label, value }: { label: string; value?: string | number | null | boolean }) => {
    let displayValue: React.ReactNode = 'Non défini';
    if (typeof value === 'boolean') {
        displayValue = value ? <span className="font-bold text-green-600">Oui</span> : <span className="font-bold text-red-600">Non</span>;
    } else if (value) {
        displayValue = <span className="text-gray-800">{value}</span>;
    }

    return (
        <div className="flex justify-between items-start">
            <span className="font-medium text-black w-1/2">{label}</span>
            <div className="w-1/2 text-right">{displayValue}</div>
        </div>
    );
};

const InfoText = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
        <h4 className="font-medium text-black mt-2 mb-1">{label}</h4>
        <p className="whitespace-pre-wrap text-gray-800 text-xs bg-gray-50 p-2 rounded">{value || 'Non défini'}</p>
    </div>
);


const SummaryContent = ({ room, furniture }: { room: UserRoom, furniture: Furniture[] | null }) => {
    return (
        <div className="p-8 bg-white text-black" style={{ width: '800px' }}>
            <div className="mb-8 border-b pb-4">
                <h2 className="text-3xl font-bold text-gray-900">Fiche d'information : {room.room_name}</h2>
                <p className="text-lg text-gray-500">{room.property_type}</p>
            </div>
            
            <div className="columns-2 gap-8">
                <InfoSection title="Informations Générales">
                    <InfoPair label="Nom du logement" value={room.room_name} />
                    <InfoPair label="Type de propriété" value={room.property_type} />
                    <InfoPair label="ID Krossbooking" value={room.room_id} />
                    <InfoPair label="ID Secondaire" value={room.room_id_2} />
                    <InfoPair label="Manuel de la maison" value={room.has_house_manual} />
                    <InfoText label="Instructions d'arrivée" value={room.arrival_instructions} />
                    <InfoText label="Instructions de départ" value={room.departure_instructions} />
                    <InfoText label="Particularités du logement" value={room.logement_specificities} />
                    <InfoText label="Travaux récents" value={room.recent_works} />
                </InfoSection>

                <InfoSection title="Accès & Wi-Fi">
                    <InfoPair label="Code Boîte à clés" value={room.keybox_code} />
                    <InfoPair label="Nom du réseau (SSID)" value={room.wifi_ssid} />
                    <InfoPair label="Mot de passe Wi-Fi" value={room.wifi_code} />
                    <InfoText label="Localisation de la box" value={room.wifi_box_location} />
                </InfoSection>

                <InfoSection title="Stationnement">
                    <InfoPair label="Adresse" value={room.parking_address} />
                    <InfoPair label="Nombre de places" value={room.parking_spots} />
                    <InfoPair label="Type" value={room.parking_type} />
                    <InfoPair label="Badge/disque fourni" value={room.parking_badge_or_disk} />
                    <InfoText label="Instructions zone réglementée" value={room.parking_regulated_zone_instructions} />
                    <InfoText label="Autres infos parking" value={room.parking_info} />
                </InfoSection>

                <InfoSection title="Sécurité & Logistique">
                    <InfoPair label="Alarme / Vidéosurveillance" value={room.has_alarm_or_cctv} />
                    <InfoPair label="Détecteur de fumée" value={room.has_smoke_detector} />
                    <InfoPair label="Détecteur de CO" value={room.has_co_detector} />
                    <InfoText label="Emplacement des compteurs" value={room.utility_locations} />
                    <InfoText label="Local technique / produits" value={room.technical_room_location} />
                </InfoSection>

                <InfoSection title="Règlement Intérieur">
                    <InfoPair label="Non-fumeur" value={room.is_non_smoking} />
                    <InfoPair label="Animaux autorisés" value={room.are_pets_allowed} />
                    <InfoPair label="Bruit toléré jusqu'à" value={room.noise_limit_time} />
                    <InfoText label="Consignes de tri" value={room.waste_sorting_instructions} />
                    <InfoText label="Espaces interdits" value={room.forbidden_areas} />
                    <InfoText label="Autres règles" value={room.house_rules} />
                </InfoSection>

                <InfoSection title="Équipements">
                    <InfoPair label="Lit bébé" value={room.has_baby_cot} />
                    <InfoPair label="Chaise haute" value={room.has_high_chair} />
                    <InfoPair label="Matériel de ménage" value={room.has_cleaning_equipment} />
                    <InfoText label="Couchages" value={room.bedding_description} />
                    <InfoText label="Électroménagers" value={room.appliances_list} />
                    <InfoText label="Appareils spécifiques" value={room.specific_appliances} />
                    <InfoText label="Équipement extérieur" value={room.outdoor_equipment} />
                </InfoSection>
            </div>

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
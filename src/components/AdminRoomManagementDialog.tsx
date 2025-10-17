import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info, KeyRound, Car, BookText, Sofa, Shield } from 'lucide-react';
import { UserRoom } from '@/lib/user-room-api';
import { RoomGeneralInfoForm } from './RoomGeneralInfoForm';
import { RoomAccessInfoForm } from './RoomAccessInfoForm';
import { RoomParkingForm } from './RoomParkingForm';
import { RoomHouseRulesForm } from './RoomHouseRulesForm';
import { RoomEquipmentForm } from './RoomEquipmentForm';
import { RoomSafetyForm } from './RoomSafetyForm';

type Section = 'general' | 'access' | 'parking' | 'rules' | 'equipment' | 'safety';

const sections: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'Infos Générales', icon: Info },
  { id: 'access', label: 'Accès & Wi-Fi', icon: KeyRound },
  { id: 'parking', label: 'Stationnement', icon: Car },
  { id: 'rules', label: 'Règlement', icon: BookText },
  { id: 'equipment', label: 'Équipements', icon: Sofa },
  { id: 'safety', label: 'Sécurité & Logistique', icon: Shield },
];

interface AdminRoomManagementDialogProps {
  room: UserRoom;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminRoomManagementDialog: React.FC<AdminRoomManagementDialogProps> = ({ room, isOpen, onOpenChange }) => {
  const [activeSection, setActiveSection] = useState<Section>('general');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl">Gérer (Admin) : {room.room_name}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow flex overflow-hidden">
          <nav className="w-1/4 border-r p-4 space-y-2 overflow-y-auto">
            {sections.map((section) => (
              <Button
                key={section.id}
                variant={activeSection === section.id ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveSection(section.id)}
              >
                <section.icon className="mr-2 h-4 w-4" />
                {section.label}
              </Button>
            ))}
          </nav>
          <div className="w-3/4 p-6 overflow-y-auto">
            {activeSection === 'general' && <RoomGeneralInfoForm room={room} />}
            {activeSection === 'access' && <RoomAccessInfoForm room={room} />}
            {activeSection === 'parking' && <RoomParkingForm room={room} />}
            {activeSection === 'rules' && <RoomHouseRulesForm room={room} />}
            {activeSection === 'equipment' && <RoomEquipmentForm room={room} />}
            {activeSection === 'safety' && <RoomSafetyForm room={room} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminRoomManagementDialog;
import { useState } from 'react';
import { UserRoom } from '@/lib/user-room-api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { RoomGeneralInfoForm } from './RoomGeneralInfoForm';
import { RoomAccessInfoForm } from './RoomAccessInfoForm';
import { RoomFurnitureList } from './RoomFurnitureList';
import { RoomHouseRulesForm } from './RoomHouseRulesForm';
import { Info, KeyRound, Lamp, BookText } from 'lucide-react';

type Section = 'general' | 'access' | 'furniture' | 'rules';

const sections: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'Infos Générales', icon: Info },
  { id: 'access', label: 'Accès & Codes', icon: KeyRound },
  { id: 'furniture', label: 'Inventaire', icon: Lamp },
  { id: 'rules', label: 'Règlement', icon: BookText },
];

interface RoomManagementDialogProps {
  room: UserRoom;
}

export function RoomManagementDialog({ room }: RoomManagementDialogProps) {
  const [activeSection, setActiveSection] = useState<Section>('general');

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Gérer le logement</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl">Gérer : {room.room_name}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow flex overflow-hidden">
          <nav className="w-1/4 border-r p-4 space-y-2">
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
            {activeSection === 'furniture' && <RoomFurnitureList userRoomId={room.id} />}
            {activeSection === 'rules' && <RoomHouseRulesForm room={room} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from "react";
import { Check, ChevronDown, Home } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { UserRoom } from "@/lib/user-room-api";
import { cn } from "@/lib/utils";

interface PropertySelectorProps {
  rooms: UserRoom[];
  selectedRoomId: string | null;
  onSelect: (roomId: string | null) => void;
}

const PropertySelector: React.FC<PropertySelectorProps> = ({
  rooms,
  selectedRoomId,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);
  if (rooms.length <= 1) return null;

  const selected = rooms.find((r) => r.room_id === selectedRoomId);

  const handleSelect = (roomId: string | null) => {
    onSelect(roomId);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-hk-50">
          <Home className="h-5 w-5 text-hk-600" />
        </span>
        <span className="flex-1 text-left">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Logement
          </span>
          <span className="block text-sm font-semibold text-slate-900">
            {selected ? selected.room_name : "Tous mes logements"}
          </span>
        </span>
        <ChevronDown className="h-5 w-5 text-slate-400" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader className="pb-1">
            <DrawerTitle>Choisir un logement</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-1 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <button
              onClick={() => handleSelect(null)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left",
                selectedRoomId === null ? "bg-hk-50" : "active:bg-slate-50"
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                <Home className="h-4 w-4 text-slate-500" />
              </span>
              <span className="flex-1 text-sm font-semibold text-slate-900">
                Tous mes logements
              </span>
              {selectedRoomId === null && (
                <Check className="h-5 w-5 text-hk-600" />
              )}
            </button>
            {rooms.map((room) => (
              <button
                key={room.room_id}
                onClick={() => handleSelect(room.room_id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left",
                  selectedRoomId === room.room_id
                    ? "bg-hk-50"
                    : "active:bg-slate-50"
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-hk-500 to-hk-700">
                  <Home className="h-4 w-4 text-white" />
                </span>
                <span className="flex-1 text-sm font-semibold text-slate-900">
                  {room.room_name}
                </span>
                {selectedRoomId === room.room_id && (
                  <Check className="h-5 w-5 text-hk-600" />
                )}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default PropertySelector;

"use client";

import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchKrossbookingRoomTypes, KrossbookingRoomType } from "@/lib/krossbooking";

export type RoomOption = {
  id_room: number;
  label: string;
};

interface RoomSelectorComboboxProps {
  value?: RoomOption | null;
  onChange: (room: RoomOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

const RoomSelectorCombobox: React.FC<RoomSelectorComboboxProps> = ({
  value,
  onChange,
  placeholder = "Sélectionner un logement",
  disabled = false,
}) => {
  const [open, setOpen] = React.useState(false);
  const [rooms, setRooms] = React.useState<RoomOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const loadRooms = async () => {
      setLoading(true);
      try {
        const types: KrossbookingRoomType[] = await fetchKrossbookingRoomTypes();
        const options: RoomOption[] = [];
        types.forEach((t) => {
          t.rooms.forEach((r) => {
            options.push({ id_room: r.id_room, label: r.label });
          });
        });
        // Tri alphabétique
        options.sort((a, b) => a.label.localeCompare(b.label));
        setRooms(options);
      } catch (e) {
        console.error("Erreur lors du chargement des logements:", e);
      } finally {
        setLoading(false);
      }
    };
    loadRooms();
  }, []);

  const handleSelect = (room: RoomOption) => {
    onChange(room);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          <span className="flex items-center">
            <Home className="h-4 w-4 mr-2" />
            {value ? value.label : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(90vw,480px)] p-0">
        <Command>
          <CommandInput placeholder="Rechercher un logement..." />
          <CommandList>
            {loading ? (
              <div className="py-3 text-center text-sm text-muted-foreground">Chargement...</div>
            ) : (
              <>
                <CommandEmpty>Aucun logement trouvé.</CommandEmpty>
                <CommandGroup heading="Logements">
                  {rooms.map((room) => (
                    <CommandItem key={room.id_room} onSelect={() => handleSelect(room)}>
                      <Check className={cn("mr-2 h-4 w-4", value?.id_room === room.id_room ? "opacity-100" : "opacity-0")} />
                      {room.label} <span className="ml-auto text-xs text-muted-foreground">#{room.id_room}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default RoomSelectorCombobox;
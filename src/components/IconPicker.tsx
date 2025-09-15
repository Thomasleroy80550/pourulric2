import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Check, Sparkles } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

// Filtrer pour ne garder que les composants d'icônes de lucide-react (qui sont des fonctions)
const iconNames = Object.keys(LucideIcons).filter(key => 
  typeof LucideIcons[key as keyof typeof LucideIcons] === 'function' && 
  key !== 'createLucideIcon' && 
  key !== 'icons' &&
  /^[A-Z]/.test(key) // S'assurer que c'est un nom de composant
);

interface IconPickerProps {
  value?: string;
  onChange: (value: string) => void;
}

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);

  const IconComponent = value ? (LucideIcons[value as keyof typeof LucideIcons] as React.ElementType) : Sparkles;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center">
            <IconComponent className="mr-2 h-4 w-4" />
            {value || "Sélectionner une icône..."}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Rechercher une icône..." />
          <CommandList>
            <CommandEmpty>Aucune icône trouvée.</CommandEmpty>
            <CommandGroup>
              {iconNames.map((iconName) => {
                const CurrentIcon = LucideIcons[iconName as keyof typeof LucideIcons] as React.ElementType;
                return (
                  <CommandItem
                    key={iconName}
                    value={iconName}
                    onSelect={(currentValue) => {
                      const selectedIconName = iconNames.find(name => name.toLowerCase() === currentValue.toLowerCase()) || '';
                      onChange(selectedIconName);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === iconName ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <CurrentIcon className="mr-2 h-4 w-4" />
                    {iconName}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default IconPicker;
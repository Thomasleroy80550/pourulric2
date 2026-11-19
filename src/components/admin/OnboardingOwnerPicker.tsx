import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { OnboardingOwner } from "@/lib/owner-channel-api";
import { onboardingOwnerName } from "@/lib/channel-onboarding-matching";

export default function OnboardingOwnerPicker({ owners, value, onChange, disabled }: {
  owners: OnboardingOwner[];
  value: string;
  onChange: (id: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = owners.find(owner => owner.id === value);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button type="button" variant="outline" role="combobox" aria-expanded={open} aria-label="Choisir le propriétaire du logement" disabled={disabled} className="w-full justify-between text-left">
        <span className="truncate">{current ? onboardingOwnerName(current) : "Choisir un propriétaire"}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-[min(400px,90vw)] p-0" align="start">
      <Command>
        <CommandInput placeholder="Nom, e-mail, adresse…" />
        <CommandList>
          <CommandEmpty>Aucun propriétaire actif trouvé.</CommandEmpty>
          <CommandGroup>
            <CommandItem value="Sans attribution" onSelect={() => { onChange(""); setOpen(false); }}>Ne pas attribuer</CommandItem>
            {owners.map(owner => <CommandItem key={owner.id} value={`${onboardingOwnerName(owner)} ${owner.email || ""} ${owner.property_address || ""} ${owner.property_city || ""} ${owner.id}`} onSelect={() => { onChange(owner.id); setOpen(false); }}>
              <Check className={`mr-2 h-4 w-4 shrink-0 ${owner.id === value ? "opacity-100" : "opacity-0"}`} />
              <div className="min-w-0"><p>{onboardingOwnerName(owner)}</p><p className="break-all text-xs text-muted-foreground">{owner.email || owner.id}</p><p className="text-xs text-muted-foreground">{[owner.property_address, owner.property_city].filter(Boolean).join(" · ")}</p></div>
            </CommandItem>)}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}

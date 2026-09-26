import React, { useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KeyRound, Search, Trash2, Loader2, MapPin, Wand2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import KeyBoardAutoAssignDialog from "@/components/admin/KeyBoardAutoAssignDialog";
import { generateKeyBoardPdf } from "@/lib/key-board-pdf";
import {
  KEY_BOARD_AGENCIES,
  KEY_BOARD_SLOT_COUNT,
  getKeyBoardSlots,
  upsertKeyBoardSlot,
  clearKeyBoardSlot,
  type KeyBoardAgency,
  type KeyBoardSlot,
} from "@/lib/key-board-api";

const SLOT_NUMBERS = Array.from({ length: KEY_BOARD_SLOT_COUNT }, (_, i) => i + 1);

function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const AdminKeyBoardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [agency, setAgency] = useState<KeyBoardAgency>("baie_de_somme");
  const [search, setSearch] = useState("");
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [autoOpen, setAutoOpen] = useState(false);

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["key-board-slots", agency],
    queryFn: () => getKeyBoardSlots(agency),
  });

  const slotsByNumber = useMemo(() => {
    const map = new Map<number, KeyBoardSlot>();
    slots.forEach((s) => map.set(s.slot_number, s));
    return map;
  }, [slots]);

  const query = normalize(search.trim());
  const matches = useMemo(() => {
    if (!query) return [] as KeyBoardSlot[];
    return slots.filter(
      (s) =>
        normalize(s.room_name).includes(query) ||
        normalize(s.address || "").includes(query) ||
        String(s.slot_number) === query,
    );
  }, [slots, query]);
  const matchNumbers = useMemo(() => new Set(matches.map((m) => m.slot_number)), [matches]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["key-board-slots", agency] });

  const saveMutation = useMutation({
    mutationFn: upsertKeyBoardSlot,
    onSuccess: () => {
      toast.success("Clé enregistrée.");
      invalidate();
      setEditingSlot(null);
    },
    onError: (e: Error) => toast.error(`Erreur : ${e.message}`),
  });

  const clearMutation = useMutation({
    mutationFn: (slotNumber: number) => clearKeyBoardSlot(agency, slotNumber),
    onSuccess: () => {
      toast.success("Emplacement libéré.");
      invalidate();
      setEditingSlot(null);
    },
    onError: (e: Error) => toast.error(`Erreur : ${e.message}`),
  });

  const occupiedCount = slots.length;
  const agencyLabel = KEY_BOARD_AGENCIES.find((a) => a.value === agency)?.label ?? "";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <KeyRound className="h-6 w-6" /> Tableau à clés
            </h1>
            <p className="text-muted-foreground text-sm">
              Retrouvez et classez les clés de chaque logement. Un tableau par agence, numéroté de 1 à{" "}
              {KEY_BOARD_SLOT_COUNT}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="w-fit">
              {occupiedCount} / {KEY_BOARD_SLOT_COUNT} emplacements occupés
            </Badge>
            <Button
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={() => {
                generateKeyBoardPdf(agencyLabel, slots);
                toast.success("PDF généré.");
              }}
            >
              <FileDown className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button size="sm" onClick={() => setAutoOpen(true)}>
              <Wand2 className="mr-2 h-4 w-4" /> Attribution automatique
            </Button>
          </div>
        </div>

        <KeyBoardAutoAssignDialog open={autoOpen} onClose={() => setAutoOpen(false)} />

        <Tabs value={agency} onValueChange={(v) => { setAgency(v as KeyBoardAgency); setSearch(""); }}>
          <TabsList>
            {KEY_BOARD_AGENCIES.map((a) => (
              <TabsTrigger key={a.value} value={a.value}>
                {a.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Où est la clé ?</CardTitle>
            <CardDescription>Tapez le nom du logement, l'adresse ou un numéro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Ex : Villa Rose, rue de la Plage, 12…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {query && (
              <div className="space-y-2">
                {matches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune clé trouvée dans le tableau {agencyLabel}.</p>
                ) : (
                  matches.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setEditingSlot(m.slot_number)}
                      className="w-full flex items-center gap-3 rounded-lg border bg-emerald-50 border-emerald-200 p-3 text-left hover:bg-emerald-100 transition"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white text-xl font-bold">
                        {m.slot_number}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{m.room_name}</p>
                        {m.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3" /> {m.address}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {m.key_sets} jeu{m.key_sets > 1 ? "x" : ""} de clés
                          {m.badge_count > 0 && ` · ${m.badge_count} badge${m.badge_count > 1 ? "s" : ""}`}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tableau {agencyLabel}</CardTitle>
            <CardDescription>Cliquez sur un crochet pour y attribuer un logement ou le modifier.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-10 gap-2">
                {SLOT_NUMBERS.map((n) => (
                  <Skeleton key={n} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-10 gap-2">
                {SLOT_NUMBERS.map((n) => {
                  const slot = slotsByNumber.get(n);
                  const isMatch = matchNumbers.has(n);
                  const dimmed = !!query && !isMatch;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setEditingSlot(n)}
                      title={slot ? `${slot.room_name}${slot.address ? ` — ${slot.address}` : ""}` : "Emplacement libre"}
                      className={cn(
                        "flex h-20 flex-col items-center justify-start rounded-lg border p-1.5 text-center transition",
                        slot
                          ? "bg-primary/10 border-primary/30 hover:bg-primary/20"
                          : "bg-muted/40 border-dashed hover:bg-muted",
                        isMatch && "ring-2 ring-emerald-500 bg-emerald-50 border-emerald-300",
                        dimmed && "opacity-30",
                      )}
                    >
                      <span className={cn("text-lg font-bold leading-none", !slot && "text-muted-foreground")}>{n}</span>
                      {slot ? (
                        <span className="mt-1 text-[11px] leading-tight line-clamp-2 break-words w-full">
                          {slot.room_name}
                        </span>
                      ) : (
                        <span className="mt-1 text-[10px] text-muted-foreground">libre</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {editingSlot !== null && (
        <SlotDialog
          agencyLabel={agencyLabel}
          slotNumber={editingSlot}
          slot={slotsByNumber.get(editingSlot) ?? null}
          saving={saveMutation.isPending}
          clearing={clearMutation.isPending}
          onClose={() => setEditingSlot(null)}
          onSave={(values) => saveMutation.mutate({ agency, slot_number: editingSlot, ...values })}
          onClear={() => clearMutation.mutate(editingSlot)}
        />
      )}
    </AdminLayout>
  );
};

interface SlotDialogProps {
  agencyLabel: string;
  slotNumber: number;
  slot: KeyBoardSlot | null;
  saving: boolean;
  clearing: boolean;
  onClose: () => void;
  onSave: (values: { room_name: string; address: string; key_sets: number; badge_count: number; notes: string }) => void;
  onClear: () => void;
}

const SlotDialog: React.FC<SlotDialogProps> = ({ agencyLabel, slotNumber, slot, saving, clearing, onClose, onSave, onClear }) => {
  const [roomName, setRoomName] = useState(slot?.room_name ?? "");
  const [address, setAddress] = useState(slot?.address ?? "");
  const [keySets, setKeySets] = useState(String(slot?.key_sets ?? 1));
  const [badgeCount, setBadgeCount] = useState(String(slot?.badge_count ?? 0));
  const [notes, setNotes] = useState(slot?.notes ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      toast.error("Le nom du logement est obligatoire.");
      return;
    }
    onSave({
      room_name: roomName,
      address,
      key_sets: Math.max(0, parseInt(keySets, 10) || 0),
      badge_count: Math.max(0, parseInt(badgeCount, 10) || 0),
      notes,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              {slotNumber}
            </span>
            Crochet n°{slotNumber} — {agencyLabel}
          </DialogTitle>
          <DialogDescription>
            {slot ? "Modifier le logement de cet emplacement." : "Attribuer un logement à cet emplacement libre."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="room_name">Nom du logement *</Label>
            <Input id="room_name" value={roomName} onChange={(e) => setRoomName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="key_sets">Jeux de clés</Label>
              <Input id="key_sets" type="number" min={0} value={keySets} onChange={(e) => setKeySets(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="badge_count">Badges</Label>
              <Input id="badge_count" type="number" min={0} value={badgeCount} onChange={(e) => setBadgeCount(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex : clé boîte aux lettres incluse…" />
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {slot ? (
              <Button type="button" variant="destructive" onClick={onClear} disabled={clearing || saving}>
                {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span className="ml-2">Libérer</span>
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving || clearing}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminKeyBoardPage;

import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Wand2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  KEY_BOARD_AGENCIES,
  KEY_BOARD_SLOT_COUNT,
  fetchKeyBoardRoomCandidates,
  getAllKeyBoardSlots,
  bulkUpsertKeyBoardSlots,
  type KeyBoardAgency,
  type KeyBoardRoomCandidate,
  type KeyBoardSlotInput,
} from "@/lib/key-board-api";

type Choice = KeyBoardAgency | "skip";

interface Props {
  open: boolean;
  onClose: () => void;
}

const labelOf = (a: KeyBoardAgency) => KEY_BOARD_AGENCIES.find((x) => x.value === a)?.label ?? a;

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const KeyBoardAutoAssignDialog: React.FC<Props> = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const [choices, setChoices] = useState<Record<string, Choice>>({});

  const { data: candidates = [], isLoading: loadingRooms } = useQuery({
    queryKey: ["key-board-candidates"],
    queryFn: fetchKeyBoardRoomCandidates,
    enabled: open,
  });
  const { data: allSlots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ["key-board-slots-all"],
    queryFn: getAllKeyBoardSlots,
    enabled: open,
  });

  // Logements déjà présents sur un tableau (par nom) → ignorés
  const alreadyPlaced = useMemo(() => new Set(allSlots.map((s) => norm(s.room_name))), [allSlots]);
  const remaining = useMemo(
    () => candidates.filter((c) => !alreadyPlaced.has(norm(c.room_name))),
    [candidates, alreadyPlaced],
  );
  const sureOnes = useMemo(() => remaining.filter((c) => c.sure), [remaining]);
  const unsureOnes = useMemo(() => remaining.filter((c) => !c.sure), [remaining]);

  useEffect(() => {
    if (!open) return;
    const init: Record<string, Choice> = {};
    unsureOnes.forEach((c) => (init[c.room_id] = c.suggested));
    setChoices(init);
  }, [open, unsureOnes]);

  // Plan d'attribution : par agence, on remplit les crochets libres dans l'ordre
  const plan = useMemo(() => {
    const result: Record<KeyBoardAgency, { assigned: KeyBoardSlotInput[]; overflow: string[] }> = {
      baie_de_somme: { assigned: [], overflow: [] },
      cote_opale: { assigned: [], overflow: [] },
    };
    for (const agency of KEY_BOARD_AGENCIES.map((a) => a.value)) {
      const used = new Set(allSlots.filter((s) => s.agency === agency).map((s) => s.slot_number));
      const free: number[] = [];
      for (let n = 1; n <= KEY_BOARD_SLOT_COUNT; n++) if (!used.has(n)) free.push(n);

      const rooms: KeyBoardRoomCandidate[] = [
        ...sureOnes.filter((c) => c.suggested === agency),
        ...unsureOnes.filter((c) => choices[c.room_id] === agency),
      ].sort((a, b) => (norm(a.room_name) < norm(b.room_name) ? -1 : 1));

      rooms.forEach((r, i) => {
        if (i < free.length) {
          result[agency].assigned.push({
            agency,
            slot_number: free[i],
            room_name: r.room_name,
            address: r.address,
            key_sets: 1,
            badge_count: 0,
            notes: r.owner_name ? `Propriétaire : ${r.owner_name}` : null,
          });
        } else {
          result[agency].overflow.push(r.room_name);
        }
      });
    }
    return result;
  }, [allSlots, sureOnes, unsureOnes, choices]);

  const totalToAssign = plan.baie_de_somme.assigned.length + plan.cote_opale.assigned.length;
  const totalOverflow = plan.baie_de_somme.overflow.length + plan.cote_opale.overflow.length;

  const mutation = useMutation({
    mutationFn: () => bulkUpsertKeyBoardSlots([...plan.baie_de_somme.assigned, ...plan.cote_opale.assigned]),
    onSuccess: () => {
      toast.success(`${totalToAssign} clé${totalToAssign > 1 ? "s" : ""} attribuée${totalToAssign > 1 ? "s" : ""}.`);
      queryClient.invalidateQueries({ queryKey: ["key-board-slots"] });
      queryClient.invalidateQueries({ queryKey: ["key-board-slots-all"] });
      onClose();
    },
    onError: (e: Error) => toast.error(`Erreur : ${e.message}`),
  });

  const loading = loadingRooms || loadingSlots;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" /> Attribution automatique
          </DialogTitle>
          <DialogDescription>
            Les logements sont placés sur le tableau de leur agence (d'après le profil du propriétaire), dans les
            crochets libres, par ordre alphabétique. Les logements déjà placés sont ignorés.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Analyse des logements…
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0 pr-3">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {KEY_BOARD_AGENCIES.map((a) => (
                  <div key={a.value} className="rounded-lg border p-3">
                    <p className="font-semibold">{a.label}</p>
                    <p className="text-2xl font-bold">{plan[a.value].assigned.length}</p>
                    <p className="text-xs text-muted-foreground">
                      logement{plan[a.value].assigned.length > 1 ? "s" : ""} à placer ·{" "}
                      {sureOnes.filter((c) => c.suggested === a.value).length} sûr
                      {sureOnes.filter((c) => c.suggested === a.value).length > 1 ? "s" : ""}
                    </p>
                  </div>
                ))}
              </div>

              {totalOverflow > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Pas assez de crochets libres</AlertTitle>
                  <AlertDescription>
                    {totalOverflow} logement{totalOverflow > 1 ? "s" : ""} ne pourron{totalOverflow > 1 ? "t" : "a"} pas
                    être placé{totalOverflow > 1 ? "s" : ""} (tableau plein).
                  </AlertDescription>
                </Alert>
              )}

              {remaining.length === 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Tout est déjà placé</AlertTitle>
                  <AlertDescription>Tous les logements actifs ont déjà un crochet.</AlertDescription>
                </Alert>
              )}

              {unsureOnes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <h3 className="font-semibold">Pas sûr de l'agence ({unsureOnes.length})</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choisissez l'agence pour chaque logement, ou ignorez-le pour le placer plus tard à la main.
                  </p>
                  <div className="divide-y rounded-lg border">
                    {unsureOnes.map((c) => (
                      <div key={c.room_id} className="flex items-center gap-3 p-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{c.room_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {c.owner_name}
                            {c.owner_name && " · "}
                            {c.reason}
                          </p>
                        </div>
                        <Select
                          value={choices[c.room_id] ?? c.suggested}
                          onValueChange={(v) => setChoices((prev) => ({ ...prev, [c.room_id]: v as Choice }))}
                        >
                          <SelectTrigger className="w-[170px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {KEY_BOARD_AGENCIES.map((a) => (
                              <SelectItem key={a.value} value={a.value}>
                                {a.label}
                              </SelectItem>
                            ))}
                            <SelectItem value="skip">Ignorer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sureOnes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <h3 className="font-semibold">Attribution sûre ({sureOnes.length})</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sureOnes.map((c) => (
                      <Badge key={c.room_id} variant="secondary" className="font-normal">
                        {c.room_name}
                        <span className="ml-1 text-muted-foreground">· {labelOf(c.suggested)}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Annuler
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={loading || totalToAssign === 0 || mutation.isPending}>
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Attribuer {totalToAssign} clé{totalToAssign > 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default KeyBoardAutoAssignDialog;

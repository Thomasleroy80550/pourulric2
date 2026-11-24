import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SmartPricingNotice from "@/components/SmartPricingNotice";
import { SEASON_2027_PERIODS, SEASON_2027_OTA_MARKUPS, formatSeasonOtaPrice } from "@/lib/season-2027";
import { safeFormat } from "@/lib/date-utils";
import type { AdminUserRoom } from "@/lib/admin-api";
import type { SeasonPricingItem, SeasonPricingRequest } from "@/lib/season-pricing-api";

export default function Season2027RequestEditor({ room, request, smartPricing, onClose, onSaved }: {
  room: AdminUserRoom;
  request?: SeasonPricingRequest;
  smartPricing: boolean;
  onClose: () => void;
  onSaved: (request: SeasonPricingRequest) => void;
}) {
  const [items, setItems] = useState<SeasonPricingItem[]>(() => request?.items.length ? request.items.map(item => ({ ...item })) : SEASON_2027_PERIODS.map(period => ({
    start_date: period.start, end_date: period.end, period_type: period.label,
    price: null, min_stay: period.minStay, closed: period.minStay === null,
  })));
  const [saving, setSaving] = useState(false);
  const update = (index: number, field: "price" | "min_stay", value: string) => setItems(previous => previous.map((item, i) => i === index ? { ...item, [field]: value === "" ? null : Number(value) } : item));
  const save = async () => {
    if (saving || smartPricing) return;
    for (const item of items.filter(item => !item.closed)) {
      if (item.price != null && (!Number.isFinite(item.price) || item.price <= 0 || item.price > 100000)) return toast.error("Le prix doit être compris entre 1 et 100 000 €.");
      if (item.min_stay == null || !Number.isInteger(item.min_stay) || item.min_stay < 1 || item.min_stay > 365) return toast.error("Renseignez un séjour minimum entier entre 1 et 365 nuits.");
    }
    setSaving(true);
    try {
      const query = request
        ? supabase.from("season_price_requests").update({ items }).eq("id", request.id)
        : supabase.from("season_price_requests").insert({ user_id: room.user_id, room_id: room.room_id, room_name: room.room_name, season_year: 2027, status: "pending", items });
      const { data, error } = await query.select("*").single();
      if (error) throw new Error(error.message);
      onSaved(data as SeasonPricingRequest);
      toast.success("Demande enregistrée en attente. Aucun envoi à Cadence.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Tarifs 2027 — {room.room_name}</DialogTitle>
          <DialogDescription>Enregistrez la demande, puis utilisez « Valider et envoyer à Cadence » dans le suivi. Tout changement de tarif nécessite une nouvelle validation.</DialogDescription>
        </DialogHeader>
        {smartPricing ? <SmartPricingNotice /> : <>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Période</TableHead><TableHead>Du / Au (inclus)</TableHead><TableHead>Prix par nuit (€)</TableHead><TableHead>Min. nuits</TableHead>
              {SEASON_2027_OTA_MARKUPS.map(ota => <TableHead key={ota.label} className="min-w-36 text-right">{ota.label}<span className="block text-xs font-normal">+{ota.percent} % · par nuit</span></TableHead>)}
            </TableRow></TableHeader>
            <TableBody>{items.map((item, index) => <TableRow key={`${item.start_date}-${index}`}>
              <TableCell>{item.period_type}</TableCell>
              <TableCell className="whitespace-nowrap">{safeFormat(item.start_date, "dd/MM/yyyy")} – {safeFormat(item.end_date, "dd/MM/yyyy")}</TableCell>
              {item.closed ? <TableCell colSpan={2} className="text-muted-foreground">Fermeture — à traiter séparément dans Cadence</TableCell> : <>
                <TableCell><Input aria-label={`Prix ${item.period_type} ${item.start_date}`} type="number" min={1} max={100000} value={item.price ?? ""} onChange={event => update(index, "price", event.target.value)} disabled={saving} /></TableCell>
                <TableCell><Input aria-label={`Séjour minimum ${item.period_type} ${item.start_date}`} type="number" min={1} max={365} step={1} value={item.min_stay ?? ""} onChange={event => update(index, "min_stay", event.target.value)} disabled={saving} /></TableCell>
              </>}
              {SEASON_2027_OTA_MARKUPS.map(ota => <TableCell key={ota.label} className="whitespace-nowrap text-right font-medium tabular-nums">{formatSeasonOtaPrice(item.closed ? null : item.price, ota.percent)}</TableCell>)}
            </TableRow>)}</TableBody>
          </Table>
          <p className="text-xs text-muted-foreground">Prix OTA estimés après majoration. Seul le prix de base saisi est enregistré et transmis à Cadence sur votre validation.</p>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
            <Button onClick={() => void save()} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer sans envoyer</Button>
          </div>
        </>}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Tag, CircleSlash, Users, Info } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { fetchKrossbookingRoomTypes, KrossbookingRoomType, fetchChannelPricesAndAvailability, ChannelPriceAvailabilityItem } from "@/lib/krossbooking";

const CHANNEL_OPTIONS = [
  { value: "AIRBNB", label: "Airbnb" },
  { value: "BOOKING", label: "Booking.com" },
  { value: "ABRITEL", label: "Abritel/VRBO" },
  { value: "DIRECT", label: "Direct" },
];

const PricePlanningGrid: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [roomTypes, setRoomTypes] = useState<KrossbookingRoomType[]>([]);
  const [loadingRoomTypes, setLoadingRoomTypes] = useState(false);

  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<number | null>(null);
  const [rateId, setRateId] = useState<string>(""); // id_rate
  const [codChannel, setCodChannel] = useState<string>(CHANNEL_OPTIONS[0].value);
  const [withOccupancies, setWithOccupancies] = useState<boolean>(false);

  const [loadingPrices, setLoadingPrices] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ChannelPriceAvailabilityItem[]>([]);

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  useEffect(() => {
    const loadRoomTypes = async () => {
      setLoadingRoomTypes(true);
      try {
        const types = await fetchKrossbookingRoomTypes();
        setRoomTypes(types);
        if (types.length > 0) {
          setSelectedRoomTypeId(types[0].id_room_type);
        }
      } catch (e: any) {
        console.error("Erreur chargement room types:", e);
        setError(e.message ?? "Erreur chargement des types de chambres");
      } finally {
        setLoadingRoomTypes(false);
      }
    };
    loadRoomTypes();
  }, []);

  const handleFetchPrices = async () => {
    if (!selectedRoomTypeId || !rateId || !codChannel) {
      setError("Sélectionnez un type de chambre, saisissez un id_rate et un canal.");
      return;
    }
    setLoadingPrices(true);
    setError(null);
    setItems([]);
    try {
      const date_from = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const date_to = format(endOfMonth(currentMonth), "yyyy-MM-dd");
      const data = await fetchChannelPricesAndAvailability({
        id_room_type: selectedRoomTypeId,
        id_rate: Number(rateId),
        cod_channel: codChannel,
        date_from,
        date_to,
        with_occupancies: withOccupancies,
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error("Erreur fetch prices:", e);
      setError(e.message ?? "Erreur lors du chargement des prix.");
    } finally {
      setLoadingPrices(false);
    }
  };

  const itemByDate = useMemo(() => {
    const map = new Map<string, ChannelPriceAvailabilityItem>();
    items.forEach((it) => {
      if (it.date) {
        map.set(it.date, it);
      }
    });
    return map;
  }, [items]);

  return (
    <Card className="shadow-md max-w-full overflow-hidden border border-slate-200 dark:border-slate-700">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg font-semibold">Planning Prix (OTAs)</CardTitle>
        <div className="flex flex-wrap items-end gap-2">
          {/* Room Type */}
          <div className="flex flex-col">
            <label className="text-xs text-muted-foreground">Type de chambre</label>
            {loadingRoomTypes ? (
              <Skeleton className="h-9 w-56" />
            ) : (
              <Select
                value={selectedRoomTypeId ? String(selectedRoomTypeId) : ""}
                onValueChange={(v) => setSelectedRoomTypeId(Number(v))}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((t) => (
                    <SelectItem key={t.id_room_type} value={String(t.id_room_type)}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {/* Rate ID */}
          <div className="flex flex-col">
            <label className="text-xs text-muted-foreground">ID Tarif (id_rate)</label>
            <Input
              placeholder="ex: 1001"
              value={rateId}
              onChange={(e) => setRateId(e.target.value)}
              className="w-32"
              inputMode="numeric"
            />
          </div>
          {/* Channel */}
          <div className="flex flex-col">
            <label className="text-xs text-muted-foreground">Canal</label>
            <Select value={codChannel} onValueChange={setCodChannel}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* with_occupancies */}
          <div className="flex items-center gap-2">
            <Switch checked={withOccupancies} onCheckedChange={setWithOccupancies} />
            <span className="text-xs text-muted-foreground">Prix par occupation</span>
          </div>
          {/* Fetch button */}
          <Button variant="outline" onClick={handleFetchPrices} disabled={loadingPrices || !selectedRoomTypeId || !rateId}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Charger prix
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 w-full max-w-full overflow-hidden">
        {error && <div className="text-sm text-destructive mb-3">Erreur: {error}</div>}

        {/* Header days */}
        <div
          className="grid grid-rows-[auto] gap-0"
          style={{
            display: "grid",
            gridTemplateColumns: `160px repeat(${daysInMonth.length}, 44px)`,
          }}
        >
          {/* Sticky label column */}
          <div className="sticky left-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-r px-2 py-2 text-sm font-medium">
            Jour
          </div>
          {daysInMonth.map((day, idx) => (
            <div
              key={`hnum-${idx}`}
              className="text-center text-xs font-semibold border-b border-r py-2"
            >
              {format(day, "dd", { locale: fr })}
            </div>
          ))}

          {/* Second header row: Day names */}
          <div className="sticky left-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-r px-2 py-2 text-xs text-muted-foreground">
            Nom
          </div>
          {daysInMonth.map((day, idx) => (
            <div key={`hname-${idx}`} className="text-center text-[11px] text-muted-foreground border-b border-r py-2">
              {format(day, "EEE", { locale: fr })}
            </div>
          ))}

          {/* Price row */}
          <div className="sticky left-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-r px-2 py-2 text-sm font-medium flex items-center gap-2">
            <Tag className="h-4 w-4 text-amber-600" />
            Prix
          </div>
          {daysInMonth.map((day, idx) => {
            const key = format(day, "yyyy-MM-dd");
            const it = itemByDate.get(key);
            return (
              <Tooltip key={`p-${idx}`}>
                <TooltipTrigger asChild>
                  <div
                    className={`border-b border-r py-2 text-center text-xs ${it?.closed ? "bg-red-50 dark:bg-red-900/20" : "bg-gray-50 dark:bg-gray-800"}`}
                  >
                    {typeof it?.price === "number" ? `${it!.price}€` : "—"}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="p-2 text-xs">
                  <div className="flex items-center gap-1 mb-1">
                    <Tag className="h-3 w-3" />
                    <span>Jour: {format(day, "dd/MM", { locale: fr })}</span>
                  </div>
                  <div>Prix: {typeof it?.price === "number" ? `${it!.price}€` : "Non défini"}</div>
                  <div className="mt-1 flex items-center gap-1">
                    {it?.closed ? <CircleSlash className="h-3 w-3 text-red-600" /> : <Info className="h-3 w-3 text-emerald-600" />}
                    <span>{it?.closed ? "Fermé à la vente" : "Ouvert"}</span>
                  </div>
                  {it?.restrictions && (
                    <div className="mt-1">
                      <span className="font-medium">Restrictions:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(it.restrictions).map(([k, v]) => (
                          <Badge key={k} variant="outline" className="text-[10px]">
                            {k}:{String(v)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {withOccupancies && Array.isArray(it?.occupancies) && (
                    <div className="mt-1">
                      <span className="font-medium">Occupations:</span>
                      <div className="mt-1 space-y-1">
                        {it!.occupancies!.map((o, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{o.guests} pers: {o.price}€</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Availability row (fermé/ouvert) */}
          <div className="sticky left-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-r px-2 py-2 text-sm font-medium">
            Ouverture
          </div>
          {daysInMonth.map((day, idx) => {
            const key = format(day, "yyyy-MM-dd");
            const it = itemByDate.get(key);
            const closed = !!it?.closed;
            return (
              <div
                key={`a-${idx}`}
                className={`border-b border-r py-2 text-center text-[11px] ${closed ? "text-red-600" : "text-emerald-600"}`}
              >
                {closed ? "Fermé" : "Ouvert"}
              </div>
            );
          })}
        </div>

        {/* Action row */}
        <div className="mt-4 flex items-center gap-2">
          <Button variant="outline" onClick={handleFetchPrices} disabled={loadingPrices || !selectedRoomTypeId || !rateId}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recharger
          </Button>
          {loadingPrices && <span className="text-xs text-muted-foreground">Chargement des prix…</span>}
        </div>
      </CardContent>
    </Card>
  );
};

export default PricePlanningGrid;
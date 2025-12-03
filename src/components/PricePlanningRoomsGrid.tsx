"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Tag, CircleSlash, Users, Info, Home, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, addDays, min } from "date-fns";
import { fr } from "date-fns/locale";
import { fetchKrossbookingRoomTypes, KrossbookingRoomType } from "@/lib/krossbooking";
import { supabase } from "@/integrations/supabase/client";
import { UserRoom } from "@/lib/user-room-api";

type ChannelPriceItem = {
  date: string;
  price?: number;
  closed?: boolean;
  restrictions?: Record<string, any>;
  occupancies?: { guests: number; price: number }[];
};

// Canal figé sur BE
const FIXED_CHANNEL = "BE";

type Props = {
  userRooms: UserRoom[];
};

const PricePlanningRoomsGrid: React.FC<Props> = ({ userRooms }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const [roomTypes, setRoomTypes] = useState<KrossbookingRoomType[]>([]);
  const [loadingRoomTypes, setLoadingRoomTypes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sélections
  // Canal figé
  const codChannel = FIXED_CHANNEL;
  // id_rate auto-détecté et mémorisé
  const [defaultRateId, setDefaultRateId] = useState<number | null>(() => {
    const saved = localStorage.getItem("kb_default_rate_id");
    return saved ? Number(saved) : 1; // id_rate par défaut: 1
  });

  const [loadingPrices, setLoadingPrices] = useState<boolean>(false);

  // Mapping room_id -> id_room_type
  const roomIdToRoomTypeId = useMemo(() => {
    const map = new Map<string, number>();
    roomTypes.forEach((type) => {
      type.rooms.forEach((r) => {
        map.set(String(r.id_room), type.id_room_type);
      });
    });
    return map;
  }, [roomTypes]);

  // Ids de room_type présents chez l'utilisateur
  const activeRoomTypeIds = useMemo(() => {
    const ids = new Set<number>();
    userRooms.forEach((room) => {
      const typeId = roomIdToRoomTypeId.get(String(room.room_id));
      if (typeof typeId === "number") ids.add(typeId);
    });
    return Array.from(ids.values());
  }, [userRooms, roomIdToRoomTypeId]);

  // Stockage des prix: par room_type -> par date
  const [pricesByType, setPricesByType] = useState<Map<number, Map<string, ChannelPriceItem>>>(new Map());

  // Jours du mois
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  useEffect(() => {
    const loadRoomTypes = async () => {
      setLoadingRoomTypes(true);
      setError(null);
      try {
        const types = await fetchKrossbookingRoomTypes();
        setRoomTypes(types);
      } catch (e: any) {
        console.error("Erreur chargement room types:", e);
        setError(e.message ?? "Erreur chargement des types de chambres");
      } finally {
        setLoadingRoomTypes(false);
      }
    };
    loadRoomTypes();
  }, []);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Normalisation d'une réponse d'edge function
  const unwrapPrices = (payload: any): ChannelPriceItem[] => {
    const arr = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.data?.data) ? payload.data.data : [];
    return arr.map((d: any) => ({
      date: d.date || d.day || d.date_from || "",
      price: typeof d.price === "number" ? d.price : d.price ? Number(d.price) : undefined,
      closed: !!(d.closed ?? d.is_closed),
      restrictions: d.restrictions,
      occupancies: Array.isArray(d.occupancies)
        ? d.occupancies.map((o: any) => ({ guests: Number(o.guests ?? o.occupancy ?? 0), price: Number(o.price ?? o.amount ?? 0) }))
        : undefined,
    }));
  };

  const handleFetchPrices = async () => {
    if (activeRoomTypeIds.length === 0) {
      setError("Aucune correspondance de type de chambre pour vos logements.");
      return;
    }
    if (!defaultRateId) {
      setError("Impossible de déterminer le tarif (id_rate).");
      return;
    }

    setLoadingPrices(true);
    setError(null);
    setPricesByType(new Map());

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    // Découper le mois en segments de 10 jours pour couvrir 28/30/31 jours (limites d'API)
    const segmentSize = 10;
    const chunks: { from: Date; to: Date }[] = [];
    let cur = monthStart;
    while (cur <= monthEnd) {
      const to = min([addDays(cur, segmentSize - 1), monthEnd]);
      chunks.push({ from: cur, to });
      cur = addDays(to, 1);
    }

    const entries: [number, Map<string, ChannelPriceItem>][] = [];

    // Appeler l'edge function pour chaque type de chambre et chaque segment, puis fusionner
    const results = await Promise.allSettled(
      activeRoomTypeIds.map(async (typeId) => {
        const merged = new Map<string, ChannelPriceItem>();
        for (const seg of chunks) {
          const { data, error } = await supabase.functions.invoke("krossbooking-get-prices", {
            body: {
              id_room_type: typeId,
              id_rate: Number(defaultRateId),
              cod_channel: codChannel, // BE (fixé)
              date_from: format(seg.from, "yyyy-MM-dd"),
              date_to: format(seg.to, "yyyy-MM-dd"),
              with_occupancies: false,
            },
          });
          if (error) {
            console.warn("Erreur krossbooking-get-prices:", error.message);
            continue; // on poursuit avec les autres segments
          }
          // Unwrap robuste (data, data.data, tableaux)
          const items = unwrapPrices(data);
          items.forEach((it) => {
            if (it.date && !merged.has(it.date)) {
              merged.set(it.date, it);
            }
          });
        }
        return { typeId, map: merged };
      })
    );

    results.forEach((r) => {
      if (r.status === "fulfilled") {
        entries.push([r.value.typeId, r.value.map]);
      }
    });

    setPricesByType(new Map(entries));
    setLoadingPrices(false);
  };

  // Détection automatique d'un id_rate utilisable (stocké en localStorage)
  const detectDefaultRateId = async () => {
    try {
      // Essaye sur le premier type actif, avec une liste d'id_rate courants
      const candidateTypeId = activeRoomTypeIds[0];
      if (!candidateTypeId) return null;
      const date_from = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const date_to = format(endOfMonth(currentMonth), "yyyy-MM-dd");
      const candidates = [1001, 1000, 1, 2, 3];
      for (const rid of candidates) {
        const { data, error } = await supabase.functions.invoke("krossbooking-get-prices", {
          body: {
            id_room_type: candidateTypeId,
            id_rate: rid,
            cod_channel: codChannel,
            date_from,
            date_to,
            with_occupancies: false,
          },
        });
        if (!error) {
          const items = unwrapPrices(data);
          if (Array.isArray(items) && items.length > 0) {
            setDefaultRateId(rid);
            localStorage.setItem("kb_default_rate_id", String(rid));
            return rid;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  // Chargement auto: quand types chargés et rate détecté, récupère les prix; recharge à chaque changement de mois.
  useEffect(() => {
    const run = async () => {
      if (activeRoomTypeIds.length === 0) return;
      let rid = defaultRateId;
      if (!rid) {
        rid = await detectDefaultRateId();
      }
      if (rid) {
        await handleFetchPrices();
      } else {
        setError("Veuillez configurer un id_rate par défaut (aucun tarif détecté).");
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, activeRoomTypeIds.length]);

  return (
    <Card className="shadow-md max-w-full overflow-hidden border border-slate-200 dark:border-slate-700">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium text-lg">{format(currentMonth, "MMMM yyyy", { locale: fr })}</span>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {/* Contrôles simplifiés: uniquement recharger si besoin */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground px-2 py-1 border rounded">
            Canal: DIRECT {defaultRateId ? `• Tarif: ${defaultRateId}` : ""}
          </div>
          <Button variant="outline" onClick={handleFetchPrices} disabled={loadingPrices || !defaultRateId}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recharger
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 w-full max-w-full overflow-hidden">
        {error && <div className="text-sm text-destructive mb-3">Erreur: {error}</div>}
        {loadingRoomTypes && (
          <div className="mb-3">
            <Skeleton className="h-5 w-64" />
          </div>
        )}

        {/* Grille type planning standard */}
        <div
          className="grid grid-rows-[auto] gap-0"
          style={{
            display: "grid",
            gridTemplateColumns: `200px repeat(${daysInMonth.length}, 44px)`,
          }}
        >
          {/* Header row: Day numbers */}
          <div className="sticky left-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-r px-2 py-2 text-sm font-medium">
            <span className="inline-flex items-center gap-2">
              <Tag className="h-4 w-4 text-amber-600" />
              Chambre / Jour
            </span>
          </div>
          {daysInMonth.map((day, idx) => (
            <div key={`hnum-${idx}`} className="text-center text-xs font-semibold border-b border-r py-2">
              {format(day, "dd", { locale: fr })}
            </div>
          ))}

          {/* Header row 2: Day names */}
          <div className="sticky left-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-r px-2 py-2 text-xs text-muted-foreground">
            Nom
          </div>
          {daysInMonth.map((day, idx) => (
            <div key={`hname-${idx}`} className="text-center text-[11px] text-muted-foreground border-b border-r py-2">
              {format(day, "EEE", { locale: fr })}
            </div>
          ))}

          {/* Rows per room */}
          {userRooms.map((room, rIdx) => {
            const typeId = roomIdToRoomTypeId.get(String(room.room_id));
            return (
              <React.Fragment key={room.id}>
                {/* Sticky room name */}
                <div className="sticky left-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-r border-b px-2 py-2 text-sm font-medium flex items-center gap-2">
                  <Home className="h-4 w-4 text-gray-500" />
                  <span className="truncate">{room.room_name}</span>
                </div>
                {/* Price cells */}
                {daysInMonth.map((day, dIdx) => {
                  const key = format(day, "yyyy-MM-dd");
                  const it = typeof typeId === "number" ? pricesByType.get(typeId)?.get(key) : undefined;
                  const closed = !!it?.closed;
                  // Fallback: si le prix n'est pas renvoyé, prendre le min des occupancies s'il existe
                  const occupancyMin = Array.isArray(it?.occupancies) && it!.occupancies!.length > 0
                    ? Math.min(...it!.occupancies!.map(o => Number(o.price ?? 0)))
                    : undefined;
                  const displayPrice = typeof it?.price === "number"
                    ? it!.price
                    : (typeof occupancyMin === "number" && Number.isFinite(occupancyMin) ? occupancyMin : undefined);
                  return (
                    <Tooltip key={`${room.id}-${dIdx}`}>
                      <TooltipTrigger asChild>
                        <div
                          className={`border-b border-r py-2 text-center text-xs ${
                            closed ? "bg-red-50 dark:bg-red-900/20 text-red-600"
                            : "bg-gray-50 dark:bg-gray-800"
                          } ${displayPrice === undefined ? "text-muted-foreground" : ""}`}
                        >
                          {displayPrice !== undefined ? `${displayPrice}€` : "—"}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="p-2 text-xs">
                        <div className="mb-1 font-medium">{room.room_name}</div>
                        <div className="flex items-center gap-1 mb-1">
                          <Tag className="h-3 w-3" />
                          <span>Jour: {format(day, "dd/MM", { locale: fr })}</span>
                        </div>
                        <div>
                          Prix: {typeof it?.price === "number" ? `${it!.price}€` :
                            (displayPrice !== undefined ? `${displayPrice}€ (occup.)` : "Non défini")}
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          {closed ? <CircleSlash className="h-3 w-3 text-red-600" /> : <Info className="h-3 w-3 text-emerald-600" />}
                          <span>{closed ? "Fermé à la vente" : "Ouvert"}</span>
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
                        {Array.isArray(it?.occupancies) && (
                          <div className="mt-1">
                            <span className="font-medium">Occupations:</span>
                            <div className="mt-1 space-y-1">
                              {it!.occupancies!.map((o, i) => (
                                <div key={i} className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  <span>
                                    {o.guests} pers: {o.price}€
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>

        {/* Action row */}
        <div className="mt-4 flex items-center gap-2">
          <Button variant="outline" onClick={handleFetchPrices} disabled={loadingPrices || !defaultRateId}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recharger
          </Button>
          {loadingPrices && <span className="text-xs text-muted-foreground">Chargement des prix…</span>}
        </div>
      </CardContent>
    </Card>
  );
};

export default PricePlanningRoomsGrid;
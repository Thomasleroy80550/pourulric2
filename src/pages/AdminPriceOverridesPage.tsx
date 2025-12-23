"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Filter, RotateCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { getAllPriceOverridesAdmin } from "@/lib/price-override-api";

type OverrideRow = {
  id: string;
  created_at: string | null;
  user_id: string;
  room_id: string | null;
  room_name: string | null;
  start_date: string;
  end_date: string;
  price: number | null;
  min_stay: number | null;
  closed: boolean | null;
  closed_on_arrival: boolean | null;
  closed_on_departure: boolean | null;
  // joined fields
  profiles?: {
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

const PAGE_SIZE = 25;

const AdminPriceOverridesPage: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<OverrideRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [qClient, setQClient] = useState("");
  const [qRoom, setQRoom] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [qPrice, setQPrice] = useState("");
  const [qMinStay, setQMinStay] = useState("");

  const dateLabel = useMemo(() => {
    if (!dateFrom && !dateTo) return "Période (création)";
    const from = dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: fr }) : "…";
    const to = dateTo ? format(dateTo, "dd/MM/yyyy", { locale: fr }) : "…";
    return `${from} → ${to}`;
  }, [dateFrom, dateTo]);

  const resetFilters = () => {
    setQClient("");
    setQRoom("");
    setDateFrom(undefined);
    setDateTo(undefined);
    setQPrice("");
    setQMinStay("");
    setPage(1);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // We rely on a helper to fetch with filters. If not available, fallback inside helper to construct query.
      const { data, count } = await getAllPriceOverridesAdmin({
        page,
        pageSize: PAGE_SIZE,
        qClient,
        qRoom,
        dateFrom,
        dateTo,
        qPrice,
        qMinStay,
      });
      setRows(data || []);
      setTotal(count || 0);
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Impossible de charger les overrides.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const applyFilters = () => {
    setPage(1);
    fetchData();
  };

  const clearDates = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminLayout title="Price Overrides">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-end">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Client (nom/email)</label>
              <Input
                placeholder="Rechercher un client…"
                value={qClient}
                onChange={(e) => setQClient(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Logement (nom/id)</label>
              <Input
                placeholder="Rechercher un logement…"
                value={qRoom}
                onChange={(e) => setQRoom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Prix exact</label>
              <Input
                placeholder="ex: 120"
                inputMode="numeric"
                value={qPrice}
                onChange={(e) => setQPrice(e.target.value.replace(/[^0-9.-]/g, ""))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Min stay exact</label>
              <Input
                placeholder="ex: 2"
                inputMode="numeric"
                value={qMinStay}
                onChange={(e) => setQMinStay(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal w-[220px]",
                    !dateFrom && !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs mb-1 text-muted-foreground">Du</div>
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                      />
                    </div>
                    <div>
                      <div className="text-xs mb-1 text-muted-foreground">Au</div>
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={clearDates}>
                      Effacer
                    </Button>
                    <Button size="sm" onClick={applyFilters}>
                      Appliquer
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button onClick={applyFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Filtrer
            </Button>
            <Button variant="outline" onClick={resetFilters}>
              <RotateCw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date création</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Logement</TableHead>
                <TableHead>Période</TableHead>
                <TableHead className="text-right">Prix</TableHead>
                <TableHead className="text-right">Min stay</TableHead>
                <TableHead>Fermetures</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Aucun résultat
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const created = r.created_at ? format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: fr }) : "-";
                const period = `${format(new Date(r.start_date), "dd/MM/yyyy", { locale: fr })} → ${format(new Date(r.end_date), "dd/MM/yyyy", { locale: fr })}`;
                const clientName = [
                  r.profiles?.first_name,
                  r.profiles?.last_name
                ].filter(Boolean).join(" ");
                const client = clientName || r.profiles?.email || r.user_id;
                const closures = (
                  <div className="flex flex-wrap gap-1">
                    {r.closed ? <Badge variant="destructive">Fermé</Badge> : null}
                    {r.closed_on_arrival ? <Badge variant="secondary">Fermé à l'arrivée</Badge> : null}
                    {r.closed_on_departure ? <Badge variant="secondary">Fermé au départ</Badge> : null}
                    {!r.closed && !r.closed_on_arrival && !r.closed_on_departure ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : null}
                  </div>
                );
                return (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{created}</TableCell>
                    <TableCell className="whitespace-nowrap max-w-[220px]">
                      <div className="truncate">{client}</div>
                      {r.user_id ? (
                        <div className="text-[10px] text-muted-foreground truncate">#{r.user_id}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap max-w-[220px]">
                      <div className="truncate">{r.room_name || r.room_id || "-"}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{period}</TableCell>
                    <TableCell className="text-right">{r.price ?? "-"}</TableCell>
                    <TableCell className="text-right">{r.min_stay ?? "-"}</TableCell>
                    <TableCell>{closures}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {total} résultat{total > 1 ? "s" : ""} • page {page}/{totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Suivant
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPriceOverridesPage;
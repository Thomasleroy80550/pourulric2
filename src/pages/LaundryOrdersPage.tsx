import React, { useEffect, useMemo, useState } from 'react';
import { addDays, endOfDay, format, parseISO, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertTriangle,
  CalendarDays,
  Copy,
  FileSpreadsheet,
  Package,
  RefreshCw,
  Save,
  ShoppingCart,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import AdminLayout from '@/components/AdminLayout';
import MainLayout from '@/components/MainLayout';
import BannedUserMessage from '@/components/BannedUserMessage';
import SuspendedAccountMessage from '@/components/SuspendedAccountMessage';
import { useSession } from '@/components/SessionContextProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { AdminUserRoom, getAllUserRooms } from '@/lib/admin-api';
import { fetchKrossbookingReservationsForAdminRooms, KrossbookingReservation } from '@/lib/krossbooking';
import { parseLaundryInterventionsWorkbook, type ParsedLaundryIntervention } from '@/lib/laundry-interventions';
import { updateUserRoom } from '@/lib/user-room-api';

const defaultEndDate = format(addDays(new Date(), 90), 'yyyy-MM-dd');
const defaultStartDate = format(new Date(), 'yyyy-MM-dd');
const excludedStatuses = new Set(['CANC', 'PROP0']);
const unmatchedRoomValue = 'unmatched';

interface LaundryOrdersPageProps {
  adminView?: boolean;
}

type LinenDraft = {
  linen_guest_capacity: number;
  linen_large_sheet_qty: number;
  linen_large_duvet_cover_qty: number;
  linen_small_sheet_qty: number;
  linen_small_duvet_cover_qty: number;
  linen_bath_towel_qty: number;
  linen_hand_towel_qty: number;
  linen_bath_mat_qty: number;
  linen_kitchen_towel_qty: number;
};

type LinenTotals = {
  guest_capacity: number;
  pillowcase_qty: number;
  linen_large_sheet_qty: number;
  linen_large_duvet_cover_qty: number;
  linen_small_sheet_qty: number;
  linen_small_duvet_cover_qty: number;
  linen_bath_towel_qty: number;
  linen_hand_towel_qty: number;
  linen_bath_mat_qty: number;
  linen_kitchen_towel_qty: number;
};

type ReservationWithLinen = {
  reservation: KrossbookingReservation;
  room?: AdminUserRoom;
  totals: LinenTotals;
  totalPieces: number;
  hasConfiguration: boolean;
};

type ImportedInterventionState = ParsedLaundryIntervention & {
  selectedRoomId: string;
};

type ImportedInterventionWithLinen = ImportedInterventionState & {
  room?: AdminUserRoom;
  totals: LinenTotals;
  totalPieces: number;
  hasConfiguration: boolean;
};

const emptyDraft = (): LinenDraft => ({
  linen_guest_capacity: 0,
  linen_large_sheet_qty: 0,
  linen_large_duvet_cover_qty: 0,
  linen_small_sheet_qty: 0,
  linen_small_duvet_cover_qty: 0,
  linen_bath_towel_qty: 0,
  linen_hand_towel_qty: 0,
  linen_bath_mat_qty: 0,
  linen_kitchen_towel_qty: 0,
});

const emptyTotals = (): LinenTotals => ({
  guest_capacity: 0,
  pillowcase_qty: 0,
  linen_large_sheet_qty: 0,
  linen_large_duvet_cover_qty: 0,
  linen_small_sheet_qty: 0,
  linen_small_duvet_cover_qty: 0,
  linen_bath_towel_qty: 0,
  linen_hand_towel_qty: 0,
  linen_bath_mat_qty: 0,
  linen_kitchen_towel_qty: 0,
});

const getRoomDraft = (room: AdminUserRoom): LinenDraft => ({
  linen_guest_capacity: room.linen_guest_capacity ?? 0,
  linen_large_sheet_qty: room.linen_large_sheet_qty ?? 0,
  linen_large_duvet_cover_qty: room.linen_large_duvet_cover_qty ?? 0,
  linen_small_sheet_qty: room.linen_small_sheet_qty ?? 0,
  linen_small_duvet_cover_qty: room.linen_small_duvet_cover_qty ?? 0,
  linen_bath_towel_qty: room.linen_bath_towel_qty ?? 0,
  linen_hand_towel_qty: room.linen_hand_towel_qty ?? 0,
  linen_bath_mat_qty: room.linen_bath_mat_qty ?? 0,
  linen_kitchen_towel_qty: room.linen_kitchen_towel_qty ?? 0,
});

const fallbackToCapacity = (value: number, guestCapacity: number) => (value > 0 ? value : guestCapacity);

const computeLinenTotals = (draft?: LinenDraft): LinenTotals => {
  if (!draft) return emptyTotals();

  return {
    guest_capacity: draft.linen_guest_capacity,
    pillowcase_qty: draft.linen_guest_capacity,
    linen_large_sheet_qty: draft.linen_large_sheet_qty,
    linen_large_duvet_cover_qty: draft.linen_large_duvet_cover_qty,
    linen_small_sheet_qty: draft.linen_small_sheet_qty,
    linen_small_duvet_cover_qty: draft.linen_small_duvet_cover_qty,
    linen_bath_towel_qty: fallbackToCapacity(draft.linen_bath_towel_qty, draft.linen_guest_capacity),
    linen_hand_towel_qty: fallbackToCapacity(draft.linen_hand_towel_qty, draft.linen_guest_capacity),
    linen_bath_mat_qty: draft.linen_bath_mat_qty,
    linen_kitchen_towel_qty: draft.linen_kitchen_towel_qty,
  };
};

const countPieces = (totals: LinenTotals) =>
  totals.pillowcase_qty +
  totals.linen_large_sheet_qty +
  totals.linen_large_duvet_cover_qty +
  totals.linen_small_sheet_qty +
  totals.linen_small_duvet_cover_qty +
  totals.linen_bath_towel_qty +
  totals.linen_hand_towel_qty +
  totals.linen_bath_mat_qty +
  totals.linen_kitchen_towel_qty;

const isConfigured = (draft: LinenDraft) =>
  draft.linen_guest_capacity > 0 ||
  draft.linen_large_sheet_qty > 0 ||
  draft.linen_large_duvet_cover_qty > 0 ||
  draft.linen_small_sheet_qty > 0 ||
  draft.linen_small_duvet_cover_qty > 0 ||
  draft.linen_bath_towel_qty > 0 ||
  draft.linen_hand_towel_qty > 0 ||
  draft.linen_bath_mat_qty > 0 ||
  draft.linen_kitchen_towel_qty > 0;

const ownerName = (room?: AdminUserRoom) => {
  if (!room?.profiles) return 'Non attribué';
  return [room.profiles.first_name, room.profiles.last_name].filter(Boolean).join(' ') || 'Sans nom';
};

const formatLinenDetails = (totals: LinenTotals) => {
  const items = [
    { label: 'Taies', value: totals.pillowcase_qty },
    { label: 'Grands draps', value: totals.linen_large_sheet_qty },
    { label: 'Grandes housses', value: totals.linen_large_duvet_cover_qty },
    { label: 'Petits draps', value: totals.linen_small_sheet_qty },
    { label: 'Petites housses', value: totals.linen_small_duvet_cover_qty },
    { label: 'Grandes serviettes', value: totals.linen_bath_towel_qty },
    { label: 'Petites serviettes', value: totals.linen_hand_towel_qty },
    { label: 'Tapis de bain', value: totals.linen_bath_mat_qty },
    { label: 'Torchons', value: totals.linen_kitchen_towel_qty },
  ].filter((item) => item.value > 0);

  return items.length > 0
    ? items.map((item) => `${item.label}: ${item.value}`).join(' • ')
    : 'Configuration linge non renseignée';
};

const parseNumericInput = (value: string) => {
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? 0 : Math.max(0, numberValue);
};

const LaundryOrdersPage: React.FC<LaundryOrdersPageProps> = ({ adminView = false }) => {
  const { profile } = useSession();
  const Layout = adminView ? AdminLayout : MainLayout;

  const [userRooms, setUserRooms] = useState<AdminUserRoom[]>([]);
  const [reservations, setReservations] = useState<KrossbookingReservation[]>([]);
  const [roomDrafts, setRoomDrafts] = useState<Record<string, LinenDraft>>({});
  const [loading, setLoading] = useState(true);
  const [importingFile, setImportingFile] = useState(false);
  const [savingRoomId, setSavingRoomId] = useState<string | null>(null);
  const [filterRoomId, setFilterRoomId] = useState('all');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [importedRows, setImportedRows] = useState<ImportedInterventionState[]>([]);
  const [importedFileName, setImportedFileName] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const rooms = await getAllUserRooms();
      const bookingData = await fetchKrossbookingReservationsForAdminRooms(rooms, true);

      setUserRooms(rooms);
      setReservations(bookingData);
      setRoomDrafts(Object.fromEntries(rooms.map((room) => [room.id, getRoomDraft(room)])));
    } catch (error: any) {
      toast.error(error.message || 'Impossible de charger la blanchisserie.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin' && !profile?.is_banned && !profile?.is_payment_suspended) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [profile?.role, profile?.is_banned, profile?.is_payment_suspended]);

  const roomById = useMemo(() => new Map(userRooms.map((room) => [room.id, room])), [userRooms]);
  const roomByKrossbookingId = useMemo(
    () => new Map(userRooms.map((room) => [room.room_id, room])),
    [userRooms],
  );
  const effectiveDraftByRoomId = useMemo(
    () => new Map(userRooms.map((room) => [room.id, roomDrafts[room.id] || getRoomDraft(room)])),
    [roomDrafts, userRooms],
  );

  const filteredReservations = useMemo(() => {
    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));

    return reservations
      .filter((reservation) => !excludedStatuses.has((reservation.status || '').toUpperCase()))
      .filter((reservation) => {
        const checkInDate = parseISO(reservation.check_in_date);
        return checkInDate >= start && checkInDate <= end;
      })
      .filter((reservation) => filterRoomId === 'all' || reservation.krossbooking_room_id === filterRoomId)
      .sort((a, b) => parseISO(a.check_in_date).getTime() - parseISO(b.check_in_date).getTime());
  }, [endDate, filterRoomId, reservations, startDate]);

  const totalActiveReservations = useMemo(
    () => reservations.filter((reservation) => !excludedStatuses.has((reservation.status || '').toUpperCase())).length,
    [reservations],
  );

  const reservationsWithLinen = useMemo<ReservationWithLinen[]>(() => {
    return filteredReservations.map((reservation) => {
      const room = roomByKrossbookingId.get(reservation.krossbooking_room_id);
      const draft = room ? effectiveDraftByRoomId.get(room.id) : undefined;
      const totals = computeLinenTotals(draft);

      return {
        reservation,
        room,
        totals,
        totalPieces: countPieces(totals),
        hasConfiguration: room && draft ? isConfigured(draft) : false,
      };
    });
  }, [effectiveDraftByRoomId, filteredReservations, roomByKrossbookingId]);

  const aggregatedTotals = useMemo(() => {
    return reservationsWithLinen.reduce<LinenTotals>((acc, item) => {
      acc.guest_capacity += item.totals.guest_capacity;
      acc.pillowcase_qty += item.totals.pillowcase_qty;
      acc.linen_large_sheet_qty += item.totals.linen_large_sheet_qty;
      acc.linen_large_duvet_cover_qty += item.totals.linen_large_duvet_cover_qty;
      acc.linen_small_sheet_qty += item.totals.linen_small_sheet_qty;
      acc.linen_small_duvet_cover_qty += item.totals.linen_small_duvet_cover_qty;
      acc.linen_bath_towel_qty += item.totals.linen_bath_towel_qty;
      acc.linen_hand_towel_qty += item.totals.linen_hand_towel_qty;
      acc.linen_bath_mat_qty += item.totals.linen_bath_mat_qty;
      acc.linen_kitchen_towel_qty += item.totals.linen_kitchen_towel_qty;
      return acc;
    }, emptyTotals());
  }, [reservationsWithLinen]);

  const roomsMissingConfiguration = useMemo(() => {
    const missingRooms = new Map<string, AdminUserRoom>();

    reservationsWithLinen.forEach((item) => {
      if (item.room && !item.hasConfiguration) {
        missingRooms.set(item.room.id, item.room);
      }
    });

    return Array.from(missingRooms.values());
  }, [reservationsWithLinen]);

  const importedRowsWithLinen = useMemo<ImportedInterventionWithLinen[]>(() => {
    return importedRows.map((row) => {
      const room = row.selectedRoomId !== unmatchedRoomValue ? roomById.get(row.selectedRoomId) : undefined;
      const draft = room ? effectiveDraftByRoomId.get(room.id) : undefined;
      const totals = computeLinenTotals(draft);

      return {
        ...row,
        room,
        totals,
        totalPieces: countPieces(totals),
        hasConfiguration: room && draft ? isConfigured(draft) : false,
      };
    });
  }, [effectiveDraftByRoomId, importedRows, roomById]);

  const importedMatchedCount = useMemo(
    () => importedRowsWithLinen.filter((row) => Boolean(row.room)).length,
    [importedRowsWithLinen],
  );

  const importedEnabledCount = useMemo(
    () => importedRowsWithLinen.filter((row) => row.enabled).length,
    [importedRowsWithLinen],
  );

  const importedRowsMissingConfiguration = useMemo(() => {
    const missingRooms = new Map<string, AdminUserRoom>();

    importedRowsWithLinen.forEach((row) => {
      if (row.enabled && row.room && !row.hasConfiguration) {
        missingRooms.set(row.room.id, row.room);
      }
    });

    return Array.from(missingRooms.values());
  }, [importedRowsWithLinen]);

  const unmatchedImportedRows = useMemo(
    () => importedRowsWithLinen.filter((row) => !row.room),
    [importedRowsWithLinen],
  );

  const importedAggregatedTotals = useMemo(() => {
    return importedRowsWithLinen.reduce<LinenTotals>((acc, row) => {
      if (!row.enabled || !row.room) return acc;

      acc.guest_capacity += row.totals.guest_capacity;
      acc.pillowcase_qty += row.totals.pillowcase_qty;
      acc.linen_large_sheet_qty += row.totals.linen_large_sheet_qty;
      acc.linen_large_duvet_cover_qty += row.totals.linen_large_duvet_cover_qty;
      acc.linen_small_sheet_qty += row.totals.linen_small_sheet_qty;
      acc.linen_small_duvet_cover_qty += row.totals.linen_small_duvet_cover_qty;
      acc.linen_bath_towel_qty += row.totals.linen_bath_towel_qty;
      acc.linen_hand_towel_qty += row.totals.linen_hand_towel_qty;
      acc.linen_bath_mat_qty += row.totals.linen_bath_mat_qty;
      acc.linen_kitchen_towel_qty += row.totals.linen_kitchen_towel_qty;
      return acc;
    }, emptyTotals());
  }, [importedRowsWithLinen]);

  const orderPreview = useMemo(() => {
    const lines = [
      'Commande blanchisserie - Réservations',
      `Période : du ${format(parseISO(startDate), 'dd/MM/yyyy')} au ${format(parseISO(endDate), 'dd/MM/yyyy')}`,
      `Réservations prises en compte : ${reservationsWithLinen.length}`,
      '',
      'Quantités à prévoir :',
      `- Taies : ${aggregatedTotals.pillowcase_qty}`,
      `- Grands draps : ${aggregatedTotals.linen_large_sheet_qty}`,
      `- Grandes housses : ${aggregatedTotals.linen_large_duvet_cover_qty}`,
      `- Petits draps : ${aggregatedTotals.linen_small_sheet_qty}`,
      `- Petites housses : ${aggregatedTotals.linen_small_duvet_cover_qty}`,
      `- Grandes serviettes : ${aggregatedTotals.linen_bath_towel_qty}`,
      `- Petites serviettes : ${aggregatedTotals.linen_hand_towel_qty}`,
      `- Tapis de bain : ${aggregatedTotals.linen_bath_mat_qty}`,
      `- Torchons : ${aggregatedTotals.linen_kitchen_towel_qty}`,
      '',
      'Détail par arrivée :',
    ];

    if (reservationsWithLinen.length === 0) {
      lines.push('- Aucune réservation sur cette période');
    } else {
      reservationsWithLinen.forEach((item) => {
        lines.push(
          `- ${format(parseISO(item.reservation.check_in_date), 'dd/MM/yyyy', { locale: fr })} • ${ownerName(item.room)} • ${item.reservation.property_name} • ${item.reservation.guest_name} • ${formatLinenDetails(item.totals)}`,
        );
      });
    }

    return lines.join('\n');
  }, [aggregatedTotals, endDate, reservationsWithLinen, startDate]);

  const importedOrderPreview = useMemo(() => {
    const lines = [
      'Commande blanchisserie - Interventions importées',
      `Fichier : ${importedFileName || 'Aucun fichier'}`,
      `Interventions cochées : ${importedEnabledCount}`,
      '',
      'Quantités à prévoir :',
      `- Taies : ${importedAggregatedTotals.pillowcase_qty}`,
      `- Grands draps : ${importedAggregatedTotals.linen_large_sheet_qty}`,
      `- Grandes housses : ${importedAggregatedTotals.linen_large_duvet_cover_qty}`,
      `- Petits draps : ${importedAggregatedTotals.linen_small_sheet_qty}`,
      `- Petites housses : ${importedAggregatedTotals.linen_small_duvet_cover_qty}`,
      `- Grandes serviettes : ${importedAggregatedTotals.linen_bath_towel_qty}`,
      `- Petites serviettes : ${importedAggregatedTotals.linen_hand_towel_qty}`,
      `- Tapis de bain : ${importedAggregatedTotals.linen_bath_mat_qty}`,
      `- Torchons : ${importedAggregatedTotals.linen_kitchen_towel_qty}`,
      '',
      'Détail des interventions :',
    ];

    if (importedRowsWithLinen.length === 0) {
      lines.push('- Aucune intervention importée');
    } else {
      importedRowsWithLinen.forEach((row) => {
        const stateLabel = row.enabled ? 'INTER=1' : 'INTER=0';
        const roomLabel = row.room ? row.room.room_name : `Non rapproché (${row.rawRoomName})`;
        lines.push(
          `- ${stateLabel} • ${roomLabel} • ${row.sheetName} L${row.rowNumber}${row.rawDate ? ` • ${row.rawDate}` : ''} • ${row.room ? formatLinenDetails(row.totals) : 'Aucun logement apparié'}`,
        );
      });
    }

    return lines.join('\n');
  }, [importedAggregatedTotals, importedEnabledCount, importedFileName, importedRowsWithLinen]);

  const handleDraftChange = (roomId: string, field: keyof LinenDraft, value: string) => {
    setRoomDrafts((prev) => ({
      ...prev,
      [roomId]: {
        ...(prev[roomId] || emptyDraft()),
        [field]: parseNumericInput(value),
      },
    }));
  };

  const handleSaveRoom = async (room: AdminUserRoom) => {
    const draft = roomDrafts[room.id] || emptyDraft();
    setSavingRoomId(room.id);

    try {
      const updatedRoom = await updateUserRoom(room.id, draft);
      setUserRooms((prev) =>
        prev.map((item) => (item.id === room.id ? { ...item, ...updatedRoom, profiles: item.profiles } : item)),
      );
      toast.success(`Configuration linge enregistrée pour ${room.room_name}.`);
    } catch (error: any) {
      toast.error(error.message || 'Impossible d’enregistrer la configuration.');
    } finally {
      setSavingRoomId(null);
    }
  };

  const handleCopyText = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error('Impossible de copier la commande.');
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (userRooms.length === 0) {
      toast.error('Chargez d’abord les logements de la blanchisserie.');
      return;
    }

    setImportingFile(true);

    try {
      const buffer = await file.arrayBuffer();
      const parsedRows = parseLaundryInterventionsWorkbook(
        buffer,
        userRooms.map((room) => ({ id: room.id, roomName: room.room_name })),
      );

      if (parsedRows.length === 0) {
        toast.error('Aucune intervention exploitable n’a été trouvée dans ce fichier.');
        setImportedRows([]);
        setImportedFileName(file.name);
        return;
      }

      setImportedRows(
        parsedRows.map((row) => ({
          ...row,
          selectedRoomId: row.matchedRoomId || unmatchedRoomValue,
        })),
      );
      setImportedFileName(file.name);
      toast.success(`${parsedRows.length} intervention(s) importée(s).`);
    } catch (error: any) {
      toast.error(error.message || 'Impossible de lire le fichier d’interventions.');
    } finally {

      setImportingFile(false);
      event.target.value = '';
    }
  };

  const handleImportedRowToggle = (rowId: string, checked: boolean) => {
    setImportedRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, enabled: checked } : row)));
  };

  const handleImportedRoomChange = (rowId: string, value: string) => {
    setImportedRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              selectedRoomId: value,
              matchedRoomId: value === unmatchedRoomValue ? null : value,
            }
          : row,
      ),
    );
  };

  const clearImportedRows = () => {
    setImportedRows([]);
    setImportedFileName('');
  };

  if (profile?.is_banned) {
    return (
      <Layout>
        <BannedUserMessage />
      </Layout>
    );
  }

  if (profile?.is_payment_suspended) {
    return (
      <Layout>
        <SuspendedAccountMessage />
      </Layout>
    );
  }

  if (profile?.role !== 'admin') {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Accès non autorisé</AlertTitle>
            <AlertDescription>
              Le module blanchisserie est réservé aux administrateurs.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto space-y-6 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Blanchisserie</h1>
            <p className="text-muted-foreground">
              Le tableau linge est maintenant directement dans l’app. Vous pouvez importer votre fichier quotidien d’interventions pour calculer automatiquement les quantités à commander.
            </p>
          </div>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Import quotidien des interventions ménage</CardTitle>
            <CardDescription>
              Importez un fichier Excel ou CSV contenant les noms des logements. Chaque ligne trouvée devient une intervention avec la colonne <span className="font-medium">INTER</span> cochée automatiquement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex-1 space-y-2">
                <Label htmlFor="laundry-interventions-file">Fichier interventions</Label>
                <Input
                  id="laundry-interventions-file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImportFile}
                  disabled={loading || importingFile}
                />
              </div>
              <div className="flex gap-2 md:self-end">
                <Button variant="outline" onClick={clearImportedRows} disabled={importedRows.length === 0}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Vider
                </Button>
                <Button
                  onClick={() => handleCopyText(importedOrderPreview, 'La commande issue des interventions a été copiée.')}
                  disabled={importedRows.length === 0}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copier la commande
                </Button>
              </div>
            </div>

            {importedFileName && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Fichier chargé :</span>
                <span>{importedFileName}</span>
              </div>
            )}

            {importingFile && (
              <div className="grid gap-4 md:grid-cols-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}

            {!importingFile && importedRows.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Lignes importées</CardDescription>
                    <CardTitle className="text-3xl">{importedRows.length}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Upload className="h-4 w-4" />
                    Interventions trouvées
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Logements reconnus</CardDescription>
                    <CardTitle className="text-3xl">{importedMatchedCount}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    Lignes rapprochées automatiquement
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>INTER cochées</CardDescription>
                    <CardTitle className="text-3xl">{importedEnabledCount}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShoppingCart className="h-4 w-4" />
                    Lignes comptées dans la commande
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Pièces à prévoir</CardDescription>
                    <CardTitle className="text-3xl">{countPieces(importedAggregatedTotals)}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Total généré par le fichier
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {unmatchedImportedRows.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Interventions à rapprocher</AlertTitle>
            <AlertDescription>
              Certaines lignes n’ont pas trouvé de logement automatiquement. Sélectionnez le bon logement dans le tableau d’import pour qu’elles entrent dans le calcul.
            </AlertDescription>
          </Alert>
        )}

        {importedRowsMissingConfiguration.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configurations linge manquantes sur les imports</AlertTitle>
            <AlertDescription>
              Complétez les logements suivants pour obtenir un calcul exact : {importedRowsMissingConfiguration.map((room) => room.room_name).join(', ')}.
            </AlertDescription>
          </Alert>
        )}

        {importedRows.length > 0 && (
          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <Card>
              <CardHeader>
                <CardTitle>Tableau des interventions importées</CardTitle>
                <CardDescription>
                  Le rapprochement se fait par nom de logement. La case INTER remplace votre saisie manuelle de 1 dans Excel.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>INTER</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Nom trouvé</TableHead>
                        <TableHead>Logement app</TableHead>
                        <TableHead>Quantités</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importedRowsWithLinen.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <Checkbox
                              checked={row.enabled}
                              onCheckedChange={(checked) => handleImportedRowToggle(row.id, Boolean(checked))}
                            />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            <div className="font-medium">{row.sheetName}</div>
                            <div className="text-muted-foreground">L{row.rowNumber}{row.rawDate ? ` • ${row.rawDate}` : ''}</div>
                          </TableCell>
                          <TableCell className="min-w-[180px]">{row.rawRoomName}</TableCell>
                          <TableCell className="min-w-[240px]">
                            <Select value={row.selectedRoomId} onValueChange={(value) => handleImportedRoomChange(row.id, value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Choisir un logement" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={unmatchedRoomValue}>Non rapproché</SelectItem>
                                {userRooms.map((room) => (
                                  <SelectItem key={room.id} value={room.id}>
                                    {room.room_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {row.room ? (
                              <div className="space-y-1">
                                <p className="text-sm">{formatLinenDetails(row.totals)}</p>
                                {!row.hasConfiguration && <Badge variant="outline">Configuration manquante</Badge>}
                              </div>
                            ) : (
                              <Badge variant="outline">Aucun logement associé</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">{row.room ? row.totalPieces : 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Commande issue des interventions</CardTitle>
                <CardDescription>
                  Copiez ce récapitulatif pour envoyer directement votre besoin du jour à la blanchisserie.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Taies</p>
                    <p className="text-2xl font-semibold">{importedAggregatedTotals.pillowcase_qty}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Grands draps</p>
                    <p className="text-2xl font-semibold">{importedAggregatedTotals.linen_large_sheet_qty}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Grandes housses</p>
                    <p className="text-2xl font-semibold">{importedAggregatedTotals.linen_large_duvet_cover_qty}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Petits draps</p>
                    <p className="text-2xl font-semibold">{importedAggregatedTotals.linen_small_sheet_qty}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Petites housses</p>
                    <p className="text-2xl font-semibold">{importedAggregatedTotals.linen_small_duvet_cover_qty}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Grandes serviettes</p>
                    <p className="text-2xl font-semibold">{importedAggregatedTotals.linen_bath_towel_qty}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Petites serviettes</p>
                    <p className="text-2xl font-semibold">{importedAggregatedTotals.linen_hand_towel_qty}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Tapis de bain</p>
                    <p className="text-2xl font-semibold">{importedAggregatedTotals.linen_bath_mat_qty}</p>
                  </div>
                  <div className="rounded-lg border p-3 md:col-span-2">
                    <p className="text-muted-foreground">Torchons</p>
                    <p className="text-2xl font-semibold">{importedAggregatedTotals.linen_kitchen_towel_qty}</p>
                  </div>
                </div>
                <Textarea value={importedOrderPreview} readOnly className="min-h-[320px] font-mono text-xs" />
                <Button className="w-full" onClick={() => handleCopyText(importedOrderPreview, 'La commande issue des interventions a été copiée.')}> 
                  <Copy className="mr-2 h-4 w-4" />
                  Copier la commande importée
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Filtrer les réservations Krossbooking</CardTitle>
            <CardDescription>
              Vous pouvez toujours calculer le linge à partir des arrivées actives sur une période.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="laundry-start-date">Début</Label>
              <Input id="laundry-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="laundry-end-date">Fin</Label>
              <Input id="laundry-end-date" type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Logement</Label>
              <Select value={filterRoomId} onValueChange={setFilterRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les logements" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les logements</SelectItem>
                  {userRooms.map((room) => (
                    <SelectItem key={room.id} value={room.room_id}>
                      {room.room_name} — {ownerName(room)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Logements visibles</CardDescription>
                <CardTitle className="text-3xl">{userRooms.length}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                Tous les logements admin
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Réservations chargées</CardDescription>
                <CardTitle className="text-3xl">{totalActiveReservations}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                Réservations actives récupérées
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Capacité cumulée</CardDescription>
                <CardTitle className="text-3xl">{aggregatedTotals.guest_capacity}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Base de calcul linge / personnes
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Arrivées dans la période</CardDescription>
                <CardTitle className="text-3xl">{reservationsWithLinen.length}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShoppingCart className="h-4 w-4" />
                Réservations utilisées pour la commande
              </CardContent>
            </Card>
          </div>
        )}

        {!loading && totalActiveReservations > 0 && reservationsWithLinen.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Réservations trouvées, mais hors période</AlertTitle>
            <AlertDescription>
              {totalActiveReservations} réservation(s) active(s) ont bien été chargées, mais aucune arrivée n&apos;est comprise entre le {format(parseISO(startDate), 'dd/MM/yyyy')} et le {format(parseISO(endDate), 'dd/MM/yyyy')}. Élargissez la période pour les afficher.
            </AlertDescription>
          </Alert>
        )}

        {!loading && totalActiveReservations === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Aucune réservation chargée</AlertTitle>
            <AlertDescription>
              Le module n&apos;a récupéré aucune réservation active depuis Krossbooking pour les logements visibles dans l&apos;admin.
            </AlertDescription>
          </Alert>
        )}

        {roomsMissingConfiguration.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configurations linge incomplètes</AlertTitle>
            <AlertDescription>
              Complétez les logements suivants pour obtenir une commande exacte : {roomsMissingConfiguration.map((room) => `${room.room_name} (${ownerName(room)})`).join(', ')}.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Détail des réservations prises en compte</CardTitle>
              <CardDescription>
                L&apos;admin voit ici l&apos;ensemble des logements et le détail de linge calculé réservation par réservation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : reservationsWithLinen.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  Aucune arrivée dans la période sélectionnée.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Arrivée</TableHead>
                        <TableHead>Propriétaire</TableHead>
                        <TableHead>Logement</TableHead>
                        <TableHead>Voyageur</TableHead>
                        <TableHead>Quantités</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reservationsWithLinen.map((item) => (
                        <TableRow key={item.reservation.id}>
                          <TableCell>{format(parseISO(item.reservation.check_in_date), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                          <TableCell>{ownerName(item.room)}</TableCell>
                          <TableCell>{item.reservation.property_name}</TableCell>
                          <TableCell>{item.reservation.guest_name}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm">{formatLinenDetails(item.totals)}</p>
                              {!item.hasConfiguration && <Badge variant="outline">Configuration manquante</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">{item.totalPieces}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Commande prête à envoyer</CardTitle>
              <CardDescription>
                Copiez ce récapitulatif pour l&apos;envoyer à votre blanchisserie.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Taies</p>
                  <p className="text-2xl font-semibold">{aggregatedTotals.pillowcase_qty}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Grands draps</p>
                  <p className="text-2xl font-semibold">{aggregatedTotals.linen_large_sheet_qty}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Grandes housses</p>
                  <p className="text-2xl font-semibold">{aggregatedTotals.linen_large_duvet_cover_qty}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Petits draps</p>
                  <p className="text-2xl font-semibold">{aggregatedTotals.linen_small_sheet_qty}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Petites housses</p>
                  <p className="text-2xl font-semibold">{aggregatedTotals.linen_small_duvet_cover_qty}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Grandes serviettes</p>
                  <p className="text-2xl font-semibold">{aggregatedTotals.linen_bath_towel_qty}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Petites serviettes</p>
                  <p className="text-2xl font-semibold">{aggregatedTotals.linen_hand_towel_qty}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Tapis de bain</p>
                  <p className="text-2xl font-semibold">{aggregatedTotals.linen_bath_mat_qty}</p>
                </div>
                <div className="rounded-lg border p-3 md:col-span-2">
                  <p className="text-muted-foreground">Torchons</p>
                  <p className="text-2xl font-semibold">{aggregatedTotals.linen_kitchen_towel_qty}</p>
                </div>
              </div>
              <Textarea value={orderPreview} readOnly className="min-h-[320px] font-mono text-xs" />
              <Button className="w-full" onClick={() => handleCopyText(orderPreview, 'La commande blanchisserie a été copiée.')}>
                <Copy className="mr-2 h-4 w-4" />
                Copier la commande réservations
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tableau linge par logement</CardTitle>
            <CardDescription>
              Ce tableau reprend votre logique Excel. La colonne <span className="font-medium">Taies</span> suit la capacité voyageurs, et le reste se configure logement par logement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : userRooms.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                Aucun logement configuré pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Logement</TableHead>
                      <TableHead>Capacité</TableHead>
                      <TableHead>Taies</TableHead>
                      <TableHead>Grand drap</TableHead>
                      <TableHead>Grande housse</TableHead>
                      <TableHead>Petit drap</TableHead>
                      <TableHead>Petite housse</TableHead>
                      <TableHead>Grande serviette</TableHead>
                      <TableHead>Petite serviette</TableHead>
                      <TableHead>Tapis bain</TableHead>
                      <TableHead>Torchon</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userRooms.map((room) => {
                      const draft = effectiveDraftByRoomId.get(room.id) || emptyDraft();
                      const totals = computeLinenTotals(draft);
                      const configured = isConfigured(draft);

                      return (
                        <TableRow key={room.id}>
                          <TableCell className="min-w-[220px]">
                            <div className="space-y-1">
                              <div className="font-medium">{room.room_name}</div>
                              <div className="text-xs text-muted-foreground">{ownerName(room)}</div>
                              <Badge variant={configured ? 'secondary' : 'outline'}>
                                {configured ? 'Configuré' : 'À compléter'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_guest_capacity}
                              onChange={(event) => handleDraftChange(room.id, 'linen_guest_capacity', event.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{totals.pillowcase_qty}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_large_sheet_qty}
                              onChange={(event) => handleDraftChange(room.id, 'linen_large_sheet_qty', event.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_large_duvet_cover_qty}
                              onChange={(event) => handleDraftChange(room.id, 'linen_large_duvet_cover_qty', event.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_small_sheet_qty}
                              onChange={(event) => handleDraftChange(room.id, 'linen_small_sheet_qty', event.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_small_duvet_cover_qty}
                              onChange={(event) => handleDraftChange(room.id, 'linen_small_duvet_cover_qty', event.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_bath_towel_qty}
                              onChange={(event) => handleDraftChange(room.id, 'linen_bath_towel_qty', event.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_hand_towel_qty}
                              onChange={(event) => handleDraftChange(room.id, 'linen_hand_towel_qty', event.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_bath_mat_qty}
                              onChange={(event) => handleDraftChange(room.id, 'linen_bath_mat_qty', event.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_kitchen_towel_qty}
                              onChange={(event) => handleDraftChange(room.id, 'linen_kitchen_towel_qty', event.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{countPieces(totals)}</TableCell>
                          <TableCell className="text-right">
                            <Button onClick={() => handleSaveRoom(room)} disabled={savingRoomId === room.id}>
                              <Save className="mr-2 h-4 w-4" />
                              {savingRoomId === room.id ? 'Enregistrement...' : 'Enregistrer'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default LaundryOrdersPage;

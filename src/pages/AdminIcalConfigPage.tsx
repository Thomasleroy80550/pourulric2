import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { read, utils, WorkBook } from 'xlsx';
import AdminLayout from '@/components/AdminLayout';
import { getAllUserRooms, AdminUserRoom } from '@/lib/admin-api';
import { updateUserRoom } from '@/lib/user-room-api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, FileSpreadsheet, Link2, RefreshCw, Save, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface ParsedImportRow {
  roomName: string;
  roomId: string;
  roomId2: string;
  icalUrl: string;
  matchedRoom: AdminUserRoom | null;
}

const normalizeText = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const isValidIcalUrl = (value?: string | null) => {
  if (!value?.trim()) {
    return false;
  }

  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const inferColumn = (headers: string[], keywords: string[]) => {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeText(header),
  }));

  for (const keyword of keywords) {
    const match = normalizedHeaders.find((header) => header.normalized.includes(keyword));
    if (match) {
      return match.original;
    }
  }

  return '';
};

const toStringValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const AdminIcalConfigPage: React.FC = () => {
  const { data: userRooms = [], isLoading, error, refetch } = useQuery<AdminUserRoom[]>({
    queryKey: ['adminUserRooms', 'ical-config'],
    queryFn: getAllUserRooms,
  });

  const [search, setSearch] = useState('');
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [savingRoomId, setSavingRoomId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [fileName, setFileName] = useState('');
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([]);
  const [roomNameColumn, setRoomNameColumn] = useState('');
  const [roomIdColumn, setRoomIdColumn] = useState('');
  const [roomId2Column, setRoomId2Column] = useState('');
  const [icalUrlColumn, setIcalUrlColumn] = useState('');

  useEffect(() => {
    setManualValues(
      Object.fromEntries(userRooms.map((room) => [room.id, room.ical_url || '']))
    );
  }, [userRooms]);

  const filteredRooms = useMemo(() => {
    const normalizedSearch = normalizeText(search);

    if (!normalizedSearch) {
      return userRooms;
    }

    return userRooms.filter((room) => {
      const ownerName = `${room.profiles?.first_name || ''} ${room.profiles?.last_name || ''}`;
      return [room.room_name, room.room_id, room.room_id_2, room.ical_url, ownerName]
        .some((value) => normalizeText(value).includes(normalizedSearch));
    });
  }, [search, userRooms]);

  const parsedImportRows = useMemo<ParsedImportRow[]>(() => {
    if (importRows.length === 0) {
      return [];
    }

    return importRows.map((row) => {
      const roomName = toStringValue(roomNameColumn ? row[roomNameColumn] : '');
      const roomId = toStringValue(roomIdColumn ? row[roomIdColumn] : '');
      const roomId2 = toStringValue(roomId2Column ? row[roomId2Column] : '');
      const icalUrl = toStringValue(icalUrlColumn ? row[icalUrlColumn] : '');

      const matchedRoom = userRooms.find((room) => {
        if (roomId && normalizeText(room.room_id) === normalizeText(roomId)) {
          return true;
        }

        if (roomId2 && normalizeText(room.room_id_2) === normalizeText(roomId2)) {
          return true;
        }

        if (roomName && normalizeText(room.room_name) === normalizeText(roomName)) {
          return true;
        }

        return false;
      }) || null;

      return {
        roomName,
        roomId,
        roomId2,
        icalUrl,
        matchedRoom,
      };
    });
  }, [icalUrlColumn, importRows, roomId2Column, roomIdColumn, roomNameColumn, userRooms]);

  const importSummary = useMemo(() => {
    const matched = parsedImportRows.filter((row) => row.matchedRoom).length;
    const valid = parsedImportRows.filter((row) => row.matchedRoom && isValidIcalUrl(row.icalUrl)).length;
    return {
      total: parsedImportRows.length,
      matched,
      valid,
    };
  }, [parsedImportRows]);

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const data = loadEvent.target?.result;
        const workbook: WorkBook = read(data, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

        setImportRows(rows);
        setImportHeaders(headers);
        setRoomNameColumn(inferColumn(headers, ['room_name', 'nom logement', 'nom du logement', 'logement', 'room', 'property']));
        setRoomIdColumn(inferColumn(headers, ['room_id', 'id chambre', 'id kross', 'krossbooking']));
        setRoomId2Column(inferColumn(headers, ['room_id_2', 'id 2', 'id secondaire', 'prix/restrictions']));
        setIcalUrlColumn(inferColumn(headers, ['ical_url', 'ical', 'ics', 'calendar', 'url']));
        toast.success(`Fichier ${file.name} chargé.`);
      } catch (importError: any) {
        toast.error(importError.message || 'Impossible de lire le fichier Excel.');
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleSaveRoom = async (room: AdminUserRoom) => {
    const nextValue = (manualValues[room.id] || '').trim();

    if (nextValue && !isValidIcalUrl(nextValue)) {
      toast.error('Veuillez saisir une URL iCal valide en http(s).');
      return;
    }

    setSavingRoomId(room.id);
    try {
      await updateUserRoom(room.id, { ical_url: nextValue || null });
      toast.success(`iCal mis à jour pour ${room.room_name}.`);
      await refetch();
    } catch (saveError: any) {
      toast.error(saveError.message || 'Impossible de sauvegarder ce logement.');
    } finally {
      setSavingRoomId(null);
    }
  };

  const handleApplyImport = async () => {
    const rowsToUpdate = parsedImportRows.filter((row) => row.matchedRoom && isValidIcalUrl(row.icalUrl));

    if (rowsToUpdate.length === 0) {
      toast.error('Aucune ligne exploitable à importer.');
      return;
    }

    setBulkSaving(true);

    let successCount = 0;
    let errorCount = 0;

    for (const row of rowsToUpdate) {
      try {
        await updateUserRoom(row.matchedRoom!.id, { ical_url: row.icalUrl.trim() });
        successCount += 1;
      } catch {
        errorCount += 1;
      }
    }

    await refetch();
    setBulkSaving(false);

    if (successCount > 0) {
      toast.success(`${successCount} logement(s) mis à jour depuis le fichier Excel.`);
    }

    if (errorCount > 0) {
      toast.error(`${errorCount} mise(s) à jour ont échoué.`);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Configuration iCal</h1>
              <p className="text-muted-foreground">Configurer les flux iCal logement par logement ou via import Excel.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>

        <Alert>
          <FileSpreadsheet className="h-4 w-4" />
          <AlertTitle>Import Excel</AlertTitle>
          <AlertDescription>
            Tu peux utiliser directement ton fichier `.xlsx` ici. Le système essaie de faire la correspondance par `room_id`, `room_id_2` ou nom du logement, puis applique les URLs iCal trouvées.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Importer un fichier Excel</CardTitle>
            <CardDescription>Charge ton export, choisis les colonnes si besoin, puis applique les iCal aux logements correspondants.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="file" accept=".xlsx,.xls" onChange={handleImportFile} />

            {fileName ? (
              <p className="text-sm text-muted-foreground">Fichier chargé : {fileName}</p>
            ) : null}

            {importHeaders.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Colonne nom logement</Label>
                  <Select value={roomNameColumn || '__none__'} onValueChange={(value) => setRoomNameColumn(value === '__none__' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Aucune</SelectItem>
                      {importHeaders.map((header) => <SelectItem key={header} value={header}>{header}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Colonne room_id</Label>
                  <Select value={roomIdColumn || '__none__'} onValueChange={(value) => setRoomIdColumn(value === '__none__' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Aucune</SelectItem>
                      {importHeaders.map((header) => <SelectItem key={header} value={header}>{header}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Colonne room_id_2</Label>
                  <Select value={roomId2Column || '__none__'} onValueChange={(value) => setRoomId2Column(value === '__none__' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Aucune</SelectItem>
                      {importHeaders.map((header) => <SelectItem key={header} value={header}>{header}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Colonne URL iCal</Label>
                  <Select value={icalUrlColumn || '__none__'} onValueChange={(value) => setIcalUrlColumn(value === '__none__' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Aucune</SelectItem>
                      {importHeaders.map((header) => <SelectItem key={header} value={header}>{header}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            {parsedImportRows.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Lignes : {importSummary.total}</Badge>
                  <Badge variant="outline">Correspondances : {importSummary.matched}</Badge>
                  <Badge variant="outline">URLs valides : {importSummary.valid}</Badge>
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom importé</TableHead>
                        <TableHead>room_id</TableHead>
                        <TableHead>room_id_2</TableHead>
                        <TableHead>URL iCal</TableHead>
                        <TableHead>Correspondance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedImportRows.slice(0, 20).map((row, index) => (
                        <TableRow key={`${row.roomName}-${row.roomId}-${index}`}>
                          <TableCell>{row.roomName || '—'}</TableCell>
                          <TableCell>{row.roomId || '—'}</TableCell>
                          <TableCell>{row.roomId2 || '—'}</TableCell>
                          <TableCell className="max-w-[320px] truncate">{row.icalUrl || '—'}</TableCell>
                          <TableCell>
                            {row.matchedRoom ? (
                              <Badge>{row.matchedRoom.room_name}</Badge>
                            ) : (
                              <Badge variant="outline">Non trouvé</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleApplyImport} disabled={bulkSaving || importSummary.valid === 0}>
                    <Upload className="mr-2 h-4 w-4" />
                    {bulkSaving ? 'Import en cours...' : 'Appliquer les iCal du fichier'}
                  </Button>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuration manuelle</CardTitle>
            <CardDescription>Modifier directement les URLs iCal enregistrées sur les logements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-md">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un logement, un propriétaire ou un ID..."
              />
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">Erreur lors du chargement des logements : {error.message}</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Logement</TableHead>
                      <TableHead>Propriétaire</TableHead>
                      <TableHead>room_id</TableHead>
                      <TableHead>room_id_2</TableHead>
                      <TableHead>URL iCal</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell>
                          <div className="font-medium">{room.room_name}</div>
                        </TableCell>
                        <TableCell>
                          {`${room.profiles?.first_name || ''} ${room.profiles?.last_name || ''}`.trim() || '—'}
                        </TableCell>
                        <TableCell>{room.room_id}</TableCell>
                        <TableCell>{room.room_id_2 || '—'}</TableCell>
                        <TableCell className="min-w-[320px]">
                          <div className="space-y-2">
                            <div className="relative">
                              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                value={manualValues[room.id] || ''}
                                onChange={(event) => setManualValues((current) => ({
                                  ...current,
                                  [room.id]: event.target.value,
                                }))}
                                className="pl-9"
                                placeholder="https://.../calendar.ics"
                              />
                            </div>
                            {room.ical_url ? <Badge variant="secondary">Configuré</Badge> : <Badge variant="outline">Non configuré</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button onClick={() => handleSaveRoom(room)} disabled={savingRoomId === room.id}>
                            <Save className="mr-2 h-4 w-4" />
                            {savingRoomId === room.id ? 'Enregistrement...' : 'Enregistrer'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminIcalConfigPage;

import React, { useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useQuery } from '@tanstack/react-query';
import { getAllUserRooms, AdminUserRoom, updateRoomGuestCapacity } from '@/lib/admin-api';
import {
  deleteMonthlyFeaturedRoom,
  formatMonthLabel,
  getCurrentMonthInputValue,
  getMonthlyFeaturedRooms,
  upsertMonthlyFeaturedRoom,
} from '@/lib/user-room-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PlugZap, Droplet, Building, Edit, History, Settings, MessageSquare, Star, Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import EditUserRoomDialog from '@/components/EditUserRoomDialog';
import AdminRoomManagementDialog from '@/components/AdminRoomManagementDialog';

const AdminUserRoomsPage: React.FC = () => {
  const { data: userRooms, isLoading, error, refetch } = useQuery<AdminUserRoom[]>({
    queryKey: ['adminUserRooms'],
    queryFn: getAllUserRooms,
  });

  const [editingRoom, setEditingRoom] = useState<AdminUserRoom | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageRoom, setManageRoom] = useState<AdminUserRoom | null>(null);
  const [messageRoom, setMessageRoom] = useState<AdminUserRoom | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [isSavingMessage, setIsSavingMessage] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthInputValue());

  // Édition inline de la capacité
  const [editingCapacityId, setEditingCapacityId] = useState<string | null>(null);
  const [capacityDraft, setCapacityDraft] = useState('');
  const [isSavingCapacity, setIsSavingCapacity] = useState(false);

  const startEditingCapacity = (room: AdminUserRoom) => {
    setEditingCapacityId(room.id);
    setCapacityDraft(
      typeof room.linen_guest_capacity === 'number' && room.linen_guest_capacity > 0
        ? String(room.linen_guest_capacity)
        : ''
    );
  };

  const cancelEditingCapacity = () => {
    setEditingCapacityId(null);
    setCapacityDraft('');
  };

  const handleSaveCapacity = async (room: AdminUserRoom) => {
    const trimmed = capacityDraft.trim();
    const parsed = trimmed === '' ? null : parseInt(trimmed, 10);

    if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
      toast.error('Veuillez saisir un nombre de voyageurs valide.');
      return;
    }

    setIsSavingCapacity(true);
    try {
      await updateRoomGuestCapacity(room.id, parsed);
      toast.success(`Capacité mise à jour pour ${room.room_name}.`);
      cancelEditingCapacity();
      await refetch();
    } catch (err: any) {
      toast.error(err.message || 'Impossible de mettre à jour la capacité.');
    } finally {
      setIsSavingCapacity(false);
    }
  };

  const {
    data: featuredRooms = [],
    isFetching: isFeaturedRoomsFetching,
    refetch: refetchFeaturedRooms,
  } = useQuery({
    queryKey: ['monthlyFeaturedRooms', selectedMonth],
    queryFn: () => getMonthlyFeaturedRooms(selectedMonth),
  });

  const featuredRoomById = useMemo(
    () => new Map(featuredRooms.map((room) => [room.user_room_id, room])),
    [featuredRooms]
  );

  const monthLabel = formatMonthLabel(selectedMonth);

  const openHistory = (room: AdminUserRoom) => {
    // Implement history opening logic if needed
  };

  const handleEdit = (room: AdminUserRoom) => {
    setEditingRoom(room);
    setDialogOpen(true);
  };

  const handleRoomSaved = () => {
    refetch();
    setDialogOpen(false);
    setEditingRoom(null);
  };

  const openManage = (room: AdminUserRoom) => {
    setManageRoom(room);
    setManageOpen(true);
  };

  const openMessageDialog = (room: AdminUserRoom) => {
    setMessageRoom(room);
    setMessageDraft(featuredRoomById.get(room.id)?.message || '');
  };

  const handleFeaturedToggle = async (room: AdminUserRoom, checked: boolean) => {
    try {
      if (checked) {
        await upsertMonthlyFeaturedRoom({
          userRoomId: room.id,
          featuredMonth: selectedMonth,
          message: featuredRoomById.get(room.id)?.message || '',
        });
        toast.success(`${room.room_name} a été ajouté aux meilleurs logements de ${monthLabel}.`);
      } else {
        await deleteMonthlyFeaturedRoom(room.id, selectedMonth);
        if (messageRoom?.id === room.id) {
          setMessageRoom(null);
          setMessageDraft('');
        }
        toast.success(`${room.room_name} a été retiré des meilleurs logements de ${monthLabel}.`);
      }

      await refetchFeaturedRooms();
    } catch (err: any) {
      toast.error(err.message || 'Impossible de mettre à jour la sélection du mois.');
    }
  };

  const handleSaveMessage = async () => {
    if (!messageRoom) {
      return;
    }

    setIsSavingMessage(true);
    try {
      await upsertMonthlyFeaturedRoom({
        userRoomId: messageRoom.id,
        featuredMonth: selectedMonth,
        message: messageDraft,
      });
      await refetchFeaturedRooms();
      toast.success(`Message enregistré pour ${messageRoom.room_name}.`);
      setMessageRoom(null);
      setMessageDraft('');
    } catch (err: any) {
      toast.error(err.message || "Impossible d'enregistrer le message.");
    } finally {

      setIsSavingMessage(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Building className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Logements Utilisateurs</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Liste des Logements</CardTitle>
            <CardDescription>Visualisez et gérez les informations de tous les logements enregistrés par les utilisateurs.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Star className="h-4 w-4 text-amber-500" />
                  Meilleurs logements du mois
                </div>
                <p className="text-sm text-muted-foreground">
                  Choisissez un mois, cochez les logements à mettre en avant, puis ajoutez un message pour le propriétaire.
                </p>
              </div>
              <div className="w-full md:w-56">
                <label className="mb-2 block text-sm font-medium">Mois sélectionné</label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                />
              </div>
            </div>

            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}
            {error && <p className="text-red-500">Erreur lors du chargement des logements : {error.message}</p>}
            {userRooms && userRooms.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom du Logement</TableHead>
                      <TableHead>Propriétaire</TableHead>
                      <TableHead>ID Chambre</TableHead>
                      <TableHead>Type de Propriété</TableHead>
                      <TableHead>Code Boîte à Clés</TableHead>
                      <TableHead>Code Wi-Fi</TableHead>
                      <TableHead>Capacité</TableHead>
                      <TableHead>Instructions Arrivée</TableHead>
                      <TableHead>Infos Parking</TableHead>
                      <TableHead>Règlement Intérieur</TableHead>
                      <TableHead>Statut Compteurs</TableHead>
                      <TableHead>Meilleur logement ({monthLabel})</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userRooms.map((room) => {
                      const clientName = `${room.profiles?.first_name || ''} ${room.profiles?.last_name || ''}`.trim() || '—';
                      const featuredRoom = featuredRoomById.get(room.id);
                      const isFeatured = Boolean(featuredRoom);
                      return (
                        <TableRow key={room.id}>
                          <TableCell className="font-medium">{room.room_name}</TableCell>
                          <TableCell>{clientName}</TableCell>
                          <TableCell className="text-muted-foreground">{room.room_id}</TableCell>
                          <TableCell>{room.property_type || '—'}</TableCell>
                          <TableCell>{room.keybox_code || '—'}</TableCell>
                          <TableCell>{room.wifi_code || '—'}</TableCell>
                          <TableCell>
                            {editingCapacityId === room.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min={0}
                                  autoFocus
                                  value={capacityDraft}
                                  onChange={(e) => setCapacityDraft(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveCapacity(room);
                                    if (e.key === 'Escape') cancelEditingCapacity();
                                  }}
                                  disabled={isSavingCapacity}
                                  className="h-8 w-20"
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-green-600"
                                  disabled={isSavingCapacity}
                                  onClick={() => handleSaveCapacity(room)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-muted-foreground"
                                  disabled={isSavingCapacity}
                                  onClick={cancelEditingCapacity}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEditingCapacity(room)}
                                className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-muted"
                                title="Cliquer pour modifier"
                              >
                                {typeof room.linen_guest_capacity === 'number' && room.linen_guest_capacity > 0
                                  ? `${room.linen_guest_capacity} pers.`
                                  : '—'}
                                <Edit className="h-3 w-3 text-muted-foreground" />
                              </button>
                            )}
                          </TableCell>
                          <TableCell>{room.arrival_instructions || '—'}</TableCell>
                          <TableCell>{room.parking_info || '—'}</TableCell>
                          <TableCell>{room.house_rules || '—'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {room.is_electricity_cut && (
                                <Badge variant="secondary" className="text-amber-700 border-amber-300">
                                  <PlugZap className="h-3 w-3 mr-1" /> Élec coupée
                                </Badge>
                              )}
                              {room.is_water_cut && (
                                <Badge variant="secondary" className="text-sky-700 border-sky-300">
                                  <Droplet className="h-3 w-3 mr-1" /> Eau coupée
                                </Badge>
                              )}
                              {!room.is_electricity_cut && !room.is_water_cut && (
                                <Badge variant="outline">Tous actifs</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={isFeatured}
                                  disabled={isFeaturedRoomsFetching}
                                  onCheckedChange={(checked) => handleFeaturedToggle(room, checked === true)}
                                />
                                <span className="text-sm">Sélectionné</span>
                                {isFeatured && (
                                  <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                                    <Star className="mr-1 h-3 w-3" /> Top du mois
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!isFeatured}
                                  onClick={() => openMessageDialog(room)}
                                >
                                  <MessageSquare className="mr-1 h-4 w-4" />
                                  Message
                                </Button>
                                <span className="line-clamp-2 text-xs text-muted-foreground">
                                  {featuredRoom?.message || (isFeatured ? 'Aucun message pour le moment.' : 'Non sélectionné.')}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEdit(room)}>
                                <Edit className="h-4 w-4 mr-1" /> Modifier
                              </Button>
                              <Button variant="secondary" size="sm" onClick={() => openManage(room)}>
                                <Settings className="h-4 w-4 mr-1" /> Gérer
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openHistory(room)}>
                                <History className="h-4 w-4 mr-1" /> Historique
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              !isLoading && <p className="text-center py-4">Aucun logement utilisateur trouvé.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {editingRoom && (
        <EditUserRoomDialog
          isOpen={dialogOpen}
          onOpenChange={setDialogOpen}
          userId={editingRoom.user_id}
          initialRoom={editingRoom}
          onRoomSaved={handleRoomSaved}
        />
      )}

      {manageRoom && (
        <AdminRoomManagementDialog
          room={manageRoom}
          isOpen={manageOpen}
          onOpenChange={setManageOpen}
        />
      )}

      <Dialog
        open={Boolean(messageRoom)}
        onOpenChange={(open) => {
          if (!open) {
            setMessageRoom(null);
            setMessageDraft('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Message du meilleur logement
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="font-medium">{messageRoom?.room_name}</div>
              <div className="text-muted-foreground">Mise en avant pour {monthLabel}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly-featured-message">Message à afficher au propriétaire</Label>
              <Textarea
                id="monthly-featured-message"
                value={messageDraft}
                onChange={(event) => setMessageDraft(event.target.value)}
                placeholder="Ex. Félicitations, votre logement fait partie des meilleurs logements du mois grâce à ses excellents résultats."
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMessageRoom(null);
                setMessageDraft('');
              }}
              disabled={isSavingMessage}
            >
              Annuler
            </Button>
            <Button onClick={handleSaveMessage} disabled={isSavingMessage || !messageRoom}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminUserRoomsPage;
import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, PlusCircle, Trash2, Home, User as UserIcon, Mail } from 'lucide-react'; // Renamed User to UserIcon to avoid conflict
import { addUserRoom, getUserRooms, deleteUserRoom, UserRoom } from '@/lib/user-room-api';
import { getProfile, updateProfile, UserProfile } from '@/lib/profile-api'; // Import profile API
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider'; // Import useSession
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

const ProfilePage: React.FC = () => {
  const { session } = useSession(); // Get session to access user email
  const [rooms, setRooms] = useState<UserRoom[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newRoomId, setNewRoomId] = useState<string>('');
  const [newRoomName, setNewRoomName] = useState<string>('');

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [pennylaneCustomerId, setPennylaneCustomerId] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');

  const fetchProfileAndRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedProfile = await getProfile();
      setProfile(fetchedProfile);
      if (fetchedProfile) {
        setFirstName(fetchedProfile.first_name || '');
        setLastName(fetchedProfile.last_name || '');
        setPennylaneCustomerId(fetchedProfile.pennylane_customer_id || '');
        setPhoneNumber(fetchedProfile.phone_number || '');
      }

      const fetchedRooms = await getUserRooms();
      setRooms(fetchedRooms);
    } catch (err: any) {
      setError(`Erreur lors du chargement des données : ${err.message}`);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndRooms();
  }, []);

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        pennylane_customer_id: pennylaneCustomerId,
        phone_number: phoneNumber,
      });
      toast.success("Profil mis à jour avec succès !");
      await fetchProfileAndRooms(); // Re-fetch to ensure state is consistent
    } catch (err: any) {
      setError(`Erreur lors de la mise à jour du profil : ${err.message}`);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async () => {
    if (!newRoomId.trim() || !newRoomName.trim()) {
      toast.error("Veuillez remplir l'ID et le nom de la chambre.");
      return;
    }
    setLoading(true);
    try {
      await addUserRoom(newRoomId.trim(), newRoomName.trim());
      toast.success("Chambre ajoutée avec succès !");
      setNewRoomId('');
      setNewRoomName('');
      await fetchProfileAndRooms(); // Refresh the list
    } catch (err: any) {
      setError(`Erreur lors de l'ajout de la chambre : ${err.message}`);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette chambre de votre liste ?")) {
      return;
    }
    setLoading(true);
    try {
      await deleteUserRoom(id);
      toast.success("Chambre supprimée avec succès !");
      await fetchProfileAndRooms(); // Refresh the list
    } catch (err: any) {
      setError(`Erreur lors de la suppression de la chambre : ${err.message}`);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Mon Profil & Mes Chambres</h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* User Profile Section */}
        <Card className="shadow-md mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Informations du Profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-48" />
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Votre prénom"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Votre nom"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={session?.user?.email || ''}
                    disabled // Email is read-only from Supabase Auth
                    className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Numéro de téléphone</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="Votre numéro de téléphone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-sm text-gray-500">Utilisé pour la connexion par SMS. Doit être unique.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pennylaneCustomerId">ID Client Pennylane</Label>
                  <Input
                    id="pennylaneCustomerId"
                    type="text"
                    placeholder="Ex: cus_..."
                    value={pennylaneCustomerId}
                    onChange={(e) => setPennylaneCustomerId(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-sm text-gray-500">Cet ID est utilisé pour récupérer vos factures depuis Pennylane.</p>
                </div>
                <Button onClick={handleUpdateProfile} disabled={loading}>
                  {loading ? 'Sauvegarde en cours...' : 'Mettre à jour le Profil'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Add New Room Section */}
        <Card className="shadow-md mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Ajouter une Nouvelle Chambre</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
                <Skeleton className="h-10 w-48" />
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newRoomId">ID de la Chambre (Krossbooking)</Label>
                    <Input
                      id="newRoomId"
                      type="text"
                      placeholder="Ex: 36"
                      value={newRoomId}
                      onChange={(e) => setNewRoomId(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newRoomName">Nom de la Chambre (pour affichage)</Label>
                    <Input
                      id="newRoomName"
                      type="text"
                      placeholder="Ex: Appartement Paris 1"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
                <Button onClick={handleAddRoom} disabled={loading}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {loading ? 'Ajout en cours...' : 'Ajouter la Chambre'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Configured Rooms Section */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Mes Chambres Configurées</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : rooms.length === 0 ? (
              <p className="text-gray-500">Vous n'avez pas encore configuré de chambres. Ajoutez-en une ci-dessus !</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom de la Chambre</TableHead>
                      <TableHead>ID Krossbooking</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-medium flex items-center">
                          <Home className="h-4 w-4 mr-2 text-gray-500" />
                          {room.room_name}
                        </TableCell>
                        <TableCell>{room.room_id}</TableCell>
                        <TableCell>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteRoom(room.id)} disabled={loading}>
                            <Trash2 className="h-4 w-4" />
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
    </MainLayout>
  );
};

export default ProfilePage;
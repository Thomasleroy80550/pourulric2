import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, PlusCircle, Trash2, Home } from 'lucide-react';
import { addUserRoom, getUserRooms, deleteUserRoom, UserRoom } from '@/lib/user-room-api';
import { getProfile, updateProfile, UserProfile } from '@/lib/profile-api';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PhoneVerificationDialog from '@/components/PhoneVerificationDialog';

const countryCodes = [
  { code: '33', name: 'FR (+33)' },
  { code: '32', name: 'BE (+32)' },
  { code: '41', name: 'CH (+41)' },
  { code: '352', name: 'LU (+352)' },
  { code: '1', name: 'US (+1)' },
];

const ProfilePage: React.FC = () => {
  const { session } = useSession();
  const [rooms, setRooms] = useState<UserRoom[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newRoomId, setNewRoomId] = useState<string>('');
  const [newRoomName, setNewRoomName] = useState<string>('');

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [pennylaneCustomerId, setPennylaneCustomerId] = useState<string>('');
  
  const [phoneCountryCode, setPhoneCountryCode] = useState('33');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);

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
        
        if (fetchedProfile.phone_number) {
          const matchedCountry = countryCodes.find(c => fetchedProfile.phone_number!.startsWith(c.code));
          if (matchedCountry) {
            setPhoneCountryCode(matchedCountry.code);
            setPhoneNumber(fetchedProfile.phone_number!.substring(matchedCountry.code.length));
          } else {
            setPhoneCountryCode('33'); // Fallback
            setPhoneNumber(fetchedProfile.phone_number || '');
          }
        }
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
      });
      toast.success("Profil mis à jour avec succès !");
      await fetchProfileAndRooms();
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
      await fetchProfileAndRooms();
    } catch (err: any) {
      setError(`Erreur lors de l'ajout de la chambre : ${err.message}`);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette chambre de votre liste ?")) return;
    setLoading(true);
    try {
      await deleteUserRoom(id);
      toast.success("Chambre supprimée avec succès !");
      await fetchProfileAndRooms();
    } catch (err: any) {
      setError(`Erreur lors de la suppression de la chambre : ${err.message}`);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fullPhoneNumber = `${phoneCountryCode}${phoneNumber.replace(/\s+|-/g, '')}`;
  const originalFullPhoneNumber = profile?.phone_number || '';
  const isPhoneChanged = fullPhoneNumber !== originalFullPhoneNumber;

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

        <Card className="shadow-md mb-6">
          <CardHeader><CardTitle>Informations du Profil</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loading} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={session?.user?.email || ''} disabled className="bg-gray-100 dark:bg-gray-700" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Numéro de téléphone</Label>
                  <div className="flex items-center gap-2">
                    <Select value={phoneCountryCode} onValueChange={setPhoneCountryCode} disabled={loading}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {countryCodes.map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input id="phoneNumber" type="tel" placeholder="6 12 34 56 78" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} disabled={loading} />
                    <Button onClick={() => setIsVerificationDialogOpen(true)} disabled={loading || !isPhoneChanged || !phoneNumber}>
                      Vérifier
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">Utilisé pour la connexion par SMS. Doit être unique et vérifié.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pennylaneCustomerId">ID Client Pennylane</Label>
                  <Input id="pennylaneCustomerId" value={pennylaneCustomerId} onChange={(e) => setPennylaneCustomerId(e.target.value)} disabled={loading} />
                  <p className="text-sm text-gray-500">Utilisé pour récupérer vos factures depuis Pennylane.</p>
                </div>
                <Button onClick={handleUpdateProfile} disabled={loading}>
                  {loading ? 'Sauvegarde...' : 'Mettre à jour le Profil'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md mb-6">
          <CardHeader><CardTitle>Ajouter une Nouvelle Chambre</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {loading ? <Skeleton className="h-24 w-full" /> : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newRoomId">ID Chambre (Krossbooking)</Label>
                    <Input id="newRoomId" value={newRoomId} onChange={(e) => setNewRoomId(e.target.value)} disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newRoomName">Nom de la Chambre</Label>
                    <Input id="newRoomName" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} disabled={loading} />
                  </div>
                </div>
                <Button onClick={handleAddRoom} disabled={loading}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {loading ? 'Ajout...' : 'Ajouter la Chambre'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader><CardTitle>Mes Chambres Configurées</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-24 w-full" /> : rooms.length === 0 ? (
              <p className="text-gray-500">Vous n'avez pas encore configuré de chambres.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>ID Krossbooking</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium flex items-center"><Home className="h-4 w-4 mr-2 text-gray-500" />{room.room_name}</TableCell>
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
            )}
          </CardContent>
        </Card>
      </div>
      <PhoneVerificationDialog
        open={isVerificationDialogOpen}
        onOpenChange={setIsVerificationDialogOpen}
        phoneNumber={fullPhoneNumber}
        onVerified={() => {
          fetchProfileAndRooms();
        }}
      />
    </MainLayout>
  );
};

export default ProfilePage;
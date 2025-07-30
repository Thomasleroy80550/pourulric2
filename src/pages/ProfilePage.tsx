import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, User, Banknote, Bell, Briefcase, Download, AlertTriangle, Home } from 'lucide-react';
import { getUserRooms } from '@/lib/user-room-api';
import { getProfile, updateProfile, UserProfile } from '@/lib/profile-api';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { differenceInDays, format, parseISO, isValid } from 'date-fns';
import { CURRENT_CGUV_VERSION } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import KycForm from '@/components/KycForm';
import ManageRooms from '@/components/ManageRooms';

const ProfilePage: React.FC = () => {
  const { session, profile: userProfile } = useSession();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [managedPropertiesCount, setManagedPropertiesCount] = useState(0);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyCity, setPropertyCity] = useState('');
  const [propertyZipCode, setPropertyZipCode] = useState('');
  const [ibanAirbnbBooking, setIbanAirbnbBooking] = useState('');
  const [bicAirbnbBooking, setBicAirbnbBooking] = useState('');
  const [syncWithHellokeys, setSyncWithHellokeys] = useState(false);
  const [ibanAbritelHellokeys, setIbanAbritelHellokeys] = useState('');
  const [bicAbritelHellokeys, setBicAbritelHellokeys] = useState('');
  const [linenType, setLinenType] = useState('');
  const [agency, setAgency] = useState('');
  const [notifyNewBookingEmail, setNotifyNewBookingEmail] = useState(true);
  const [notifyCancellationEmail, setNotifyCancellationEmail] = useState(true);
  const [notifyNewBookingSms, setNotifyNewBookingSms] = useState(false);
  const [notifyCancellationSms, setNotifyCancellationSms] = useState(false);

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedProfile, fetchedRooms] = await Promise.all([
        getProfile(),
        getUserRooms()
      ]);
      
      setProfile(fetchedProfile);
      setManagedPropertiesCount(fetchedRooms.length);

      if (fetchedProfile) {
        setFirstName(fetchedProfile.first_name || '');
        setLastName(fetchedProfile.last_name || '');
        setPropertyAddress(fetchedProfile.property_address || '');
        setPropertyCity(fetchedProfile.property_city || '');
        setPropertyZipCode(fetchedProfile.property_zip_code || '');
        setIbanAirbnbBooking(fetchedProfile.iban_airbnb_booking || '');
        setBicAirbnbBooking(fetchedProfile.bic_airbnb_booking || '');
        setSyncWithHellokeys(fetchedProfile.sync_with_hellokeys || false);
        setIbanAbritelHellokeys(fetchedProfile.iban_abritel_hellokeys || '');
        setBicAbritelHellokeys(fetchedProfile.bic_abritel_hellokeys || '');
        setLinenType(fetchedProfile.linen_type || 'Hello Wash');
        setAgency(fetchedProfile.agency || '');
        setNotifyNewBookingEmail(fetchedProfile.notify_new_booking_email ?? true);
        setNotifyCancellationEmail(fetchedProfile.notify_cancellation_email ?? true);
        setNotifyNewBookingSms(fetchedProfile.notify_new_booking_sms ?? false);
        setNotifyCancellationSms(fetchedProfile.notify_cancellation_sms ?? false);
      }
    } catch (err: any) {
      const errorMessage = `Erreur lors du chargement des données : ${err.message}`;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const updates: Partial<UserProfile> = {
        first_name: firstName,
        last_name: lastName,
        property_address: propertyAddress,
        property_city: propertyCity,
        property_zip_code: propertyZipCode,
        iban_airbnb_booking: ibanAirbnbBooking,
        bic_airbnb_booking: bicAirbnbBooking,
        sync_with_hellokeys: syncWithHellokeys,
        iban_abritel_hellokeys: syncWithHellokeys ? ibanAbritelHellokeys : '',
        bic_abritel_hellokeys: syncWithHellokeys ? bicAbritelHellokeys : '',
        linen_type: linenType,
        agency: agency,
        notify_new_booking_email: notifyNewBookingEmail,
        notify_cancellation_email: notifyCancellationEmail,
        notify_new_booking_sms: notifyNewBookingSms,
        notify_cancellation_sms: notifyCancellationSms,
      };
      await updateProfile(updates);
      toast.success("Profil mis à jour avec succès !");
      await fetchProfileData(); // Re-fetch to confirm changes
    } catch (err: any) {
      const errorMessage = `Erreur lors de la mise à jour du profil : ${err.message}`;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getClientSinceDays = () => {
    if (profile?.contract_start_date) {
      const date = parseISO(profile.contract_start_date);
      if (isValid(date)) {
        return differenceInDays(new Date(), date);
      }
    }
    return 0;
  };

  const renderSkeleton = () => (
    <div className="space-y-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-2/3 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <h1 className="text-3xl font-bold mb-6">Mon Profil</h1>
          {renderSkeleton()}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Mon Profil</h1>

        {userProfile?.is_banned && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Compte Suspendu</AlertTitle>
            <AlertDescription>
              Votre accès est restreint. Vous pouvez consulter vos informations mais pas les modifier. Veuillez contacter le support.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="personal-data" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-6">
            <TabsTrigger value="personal-data">Données personnelles</TabsTrigger>
            <TabsTrigger value="my-properties">Mes logements</TabsTrigger>
            <TabsTrigger value="payment-preferences">Préférences de paiement</TabsTrigger>
            <TabsTrigger value="my-offer">Mon offre</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="kyc">KYC / Vérification</TabsTrigger>
          </TabsList>

          <TabsContent value="personal-data">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User /> Données personnelles</CardTitle>
                <CardDescription>Les informations fournies ci-dessous figureront sur vos factures.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={userProfile?.is_banned} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={userProfile?.is_banned} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={session?.user?.email || ''} disabled />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Adresse du logement</Label>
                  <Input id="address" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} disabled={userProfile?.is_banned} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ville</Label>
                  <Input id="city" value={propertyCity} onChange={(e) => setPropertyCity(e.target.value)} disabled={userProfile?.is_banned} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Code postal</Label>
                  <Input id="zipCode" value={propertyZipCode} onChange={(e) => setPropertyZipCode(e.target.value)} disabled={userProfile?.is_banned} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-properties">
            <ManageRooms onRoomsUpdate={fetchProfileData} />
          </TabsContent>

          <TabsContent value="payment-preferences">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Banknote /> Paiement Airbnb/Booking.com</CardTitle>
                <CardDescription>Les renseignements fournis ci-dessous seront utilisés afin de vous envoyer les fonds pour vos réservations via Airbnb et Booking.com.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="ibanAirbnb">IBAN</Label>
                  <Input id="ibanAirbnb" value={ibanAirbnbBooking} onChange={(e) => setIbanAirbnbBooking(e.target.value)} disabled={userProfile?.is_banned} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bicAirbnb">BIC</Label>
                  <Input id="bicAirbnb" value={bicAirbnbBooking} onChange={(e) => setBicAirbnbBooking(e.target.value)} disabled={userProfile?.is_banned} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Banknote /> Paiement Abritel/Hello Keys</CardTitle>
                <CardDescription>Les renseignements fournis ci-dessous seront utilisés afin de vous envoyer les fonds pour vos réservations via Abritel et notre site.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Switch id="syncHellokeys" checked={syncWithHellokeys} onCheckedChange={setSyncWithHellokeys} disabled={userProfile?.is_banned} />
                  <Label htmlFor="syncHellokeys">Je synchronise mon compte avec Hello Keys</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="ibanAbritel">IBAN</Label>
                    <Input id="ibanAbritel" value={ibanAbritelHellokeys} onChange={(e) => setIbanAbritelHellokeys(e.target.value)} disabled={!syncWithHellokeys || userProfile?.is_banned} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bicAbritel">BIC</Label>
                    <Input id="bicAbritel" value={bicAbritelHellokeys} onChange={(e) => setBicAbritelHellokeys(e.target.value)} disabled={!syncWithHellokeys || userProfile?.is_banned} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-offer">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Briefcase /> Mon offre</CardTitle>
                <CardDescription>Les informations fournies ci-dessous constituent les détails de votre offre.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Mon forfait</Label>
                  <Input value={`${(profile?.commission_rate || 0) * 100}%`} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Nombre de logement en gestion</Label>
                  <Input value={managedPropertiesCount} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linenType">Type de linge</Label>
                  <Input id="linenType" value={linenType} onChange={(e) => setLinenType(e.target.value)} disabled={userProfile?.is_banned} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agency">Mon agence</Label>
                  <Select value={agency} onValueChange={setAgency} disabled={userProfile?.is_banned}>
                    <SelectTrigger id="agency">
                      <SelectValue placeholder="Sélectionner une agence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Côte d'opal">Côte d'opal</SelectItem>
                      <SelectItem value="Baie de somme">Baie de somme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date de début de votre contrat</Label>
                  <Input value={profile?.contract_start_date && isValid(parseISO(profile.contract_start_date)) ? format(parseISO(profile.contract_start_date), 'dd/MM/yyyy') : 'N/A'} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Client depuis</Label>
                  <Input value={`${getClientSinceDays()} jours`} disabled />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Dernière signature CGUV</Label>
                  <Input value={profile?.cguv_accepted_at && isValid(parseISO(profile.cguv_accepted_at)) ? `${format(parseISO(profile.cguv_accepted_at), 'dd/MM/yyyy')} (v${profile.cguv_version || CURRENT_CGUV_VERSION})` : 'Non signé'} disabled />
                </div>
                <div className="flex items-center gap-4 md:col-span-2">
                  <Button variant="outline">Voir nos CGUV</Button>
                  <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Télécharger une attestation</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell /> Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notif-new-booking-email">Recevoir les nouvelles réservations par email</Label>
                  <Switch id="notif-new-booking-email" checked={notifyNewBookingEmail} onCheckedChange={setNotifyNewBookingEmail} disabled={userProfile?.is_banned} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notif-cancel-email">Recevoir les annulations par email</Label>
                  <Switch id="notif-cancel-email" checked={notifyCancellationEmail} onCheckedChange={setNotifyCancellationEmail} disabled={userProfile?.is_banned} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notif-new-booking-sms">Recevoir les nouvelles réservations par SMS</Label>
                  <Switch id="notif-new-booking-sms" checked={notifyNewBookingSms} onCheckedChange={setNotifyNewBookingSms} disabled={userProfile?.is_banned} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notif-cancel-sms">Recevoir les annulations par SMS</Label>
                  <Switch id="notif-cancel-sms" checked={notifyCancellationSms} onCheckedChange={setNotifyCancellationSms} disabled={userProfile?.is_banned} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kyc">
            {profile && <KycForm profile={profile} onUpdate={fetchProfileData} />}
          </TabsContent>

          <div className="flex justify-end">
            <Button onClick={handleUpdateProfile} disabled={loading || userProfile?.is_banned}>
              {loading ? 'Sauvegarde...' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
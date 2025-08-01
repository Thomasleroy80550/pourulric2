import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from 'next-themes';
import { getProfile, updateProfile, UserProfile } from '@/lib/profile-api';
import { toast } from 'sonner';

const SettingsPage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [expensesModuleEnabled, setExpensesModuleEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const userProfile = await getProfile();
        setProfile(userProfile);
        if (userProfile) {
          setExpensesModuleEnabled(userProfile.expenses_module_enabled || false);
        }
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSaveSettings = async () => {
    if (!profile) return;
    try {
      await updateProfile({
        expenses_module_enabled: expensesModuleEnabled,
      });
      toast.success("Paramètres sauvegardés avec succès !");
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Paramètres</h1>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Gérez les paramètres de votre compte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
                <Skeleton className="h-24 w-full" />
                <div className="flex items-center justify-between space-x-2">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="h-10 w-48" />
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nom Complet</Label>
                    <Input id="fullName" type="text" placeholder="Votre nom complet" defaultValue={profile?.first_name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="Votre adresse email" defaultValue={profile?.last_name} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Textarea id="address" placeholder="Votre adresse postale" defaultValue="123 Rue de la Paix, 75001 Paris" />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="notifications">Activer les notifications</Label>
                  <Switch
                    id="notifications"
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="darkMode">Mode Sombre</Label>
                  <Switch
                    id="darkMode"
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2 p-3 border rounded-md">
                  <div>
                    <Label htmlFor="expensesModule">Activer le module de dépenses</Label>
                    <p className="text-sm text-gray-500">Permet de suivre vos dépenses et de les déduire de votre bilan.</p>
                  </div>
                  <Switch
                    id="expensesModule"
                    checked={expensesModuleEnabled}
                    onCheckedChange={setExpensesModuleEnabled}
                  />
                </div>

                <Button onClick={handleSaveSettings}>Sauvegarder les paramètres</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;
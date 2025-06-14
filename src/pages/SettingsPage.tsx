import React from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const SettingsPage: React.FC = () => {
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);

  const handleSaveSettings = () => {
    console.log("Paramètres sauvegardés:", {
      notificationsEnabled,
      darkModeEnabled,
      // ... autres champs
    });
    // Ici, vous intégreriez la logique de sauvegarde réelle (API, etc.)
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nom Complet</Label>
                <Input id="fullName" type="text" placeholder="Votre nom complet" defaultValue="Thomas" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Votre adresse email" defaultValue="m@example.com" />
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
                checked={darkModeEnabled}
                onCheckedChange={setDarkModeEnabled}
              />
            </div>

            <Button onClick={handleSaveSettings}>Sauvegarder les paramètres</Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;
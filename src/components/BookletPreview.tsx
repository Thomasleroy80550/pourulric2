import { TBookletSchema } from './DigitalBookletForm';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Wifi, Shield, Home, Phone, LogOut, Info, Sparkles } from 'lucide-react';
import * as LucideIcons from 'lucide-react'; // Importe toutes les icônes Lucide

interface BookletPreviewProps {
  data: TBookletSchema | null;
}

const defaultData: TBookletSchema = {
  welcomeMessage: "Votre message de bienvenue apparaîtra ici.",
  wifiSsid: "Non spécifié",
  wifiPassword: "Non spécifié",
  emergencyContactName: "Non spécifié",
  emergencyContactPhone: "Non spécifié",
  customSections: [],
};

// Fonction utilitaire pour obtenir le composant d'icône à partir de son nom
const getIconComponent = (iconName: string) => {
  const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons];
  return IconComponent || Sparkles; // Retourne l'icône par défaut si non trouvée
};

export default function BookletPreview({ data }: BookletPreviewProps) {
  const displayData = data || defaultData;

  return (
    <div className="sticky top-24">
      <h3 className="text-lg font-semibold mb-4 text-center">Prévisualisation du Livret</h3>
      <div className="relative mx-auto border-gray-800 dark:border-gray-700 bg-gray-800 border-[12px] rounded-[2.5rem] h-[700px] w-[350px] shadow-xl">
        <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute z-10"></div>
        <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[15px] top-[124px] rounded-l-lg"></div>
        <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[15px] top-[178px] rounded-l-lg"></div>
        <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[15px] top-[142px] rounded-r-lg"></div>
        <div className="rounded-[2rem] overflow-y-auto w-full h-full bg-background">
          <div className="p-5 space-y-4 text-sm">
            
            <div className="text-center pt-6 pb-4">
              <h1 className="text-2xl font-bold text-foreground">Bienvenue !</h1>
              <p className="text-muted-foreground mt-2 whitespace-pre-wrap">{displayData.welcomeMessage}</p>
            </div>

            <Card>
              <CardHeader className="flex-row items-center space-x-3 p-3">
                <Wifi className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Accès Wi-Fi</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 text-xs">
                <p><strong>Réseau :</strong> {displayData.wifiSsid}</p>
                <p><strong>Mot de passe :</strong> {displayData.wifiPassword}</p>
              </CardContent>
            </Card>

            {displayData.houseRules && (
              <Card>
                <CardHeader className="flex-row items-center space-x-3 p-3">
                  <Home className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base">Règlement Intérieur</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 text-xs whitespace-pre-wrap">
                  {displayData.houseRules}
                </CardContent>
              </Card>
            )}

            {displayData.customSections?.map((section, index) => {
              const IconComponent = getIconComponent(section.icon || ''); // Utilise l'icône spécifiée ou Sparkles par défaut
              return (
                <Card key={index}>
                  <CardHeader className="flex-row items-center space-x-3 p-3">
                    <IconComponent className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">{section.title || "Titre de la section"}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 text-xs whitespace-pre-wrap">
                    {section.description || "Description de la section"}
                  </CardContent>
                </Card>
              );
            })}

            {displayData.checkOutInstructions && (
              <Card>
                <CardHeader className="flex-row items-center space-x-3 p-3">
                  <LogOut className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base">Instructions de Départ</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 text-xs whitespace-pre-wrap">
                  {displayData.checkOutInstructions}
                </CardContent>
              </Card>
            )}

            <Card className="bg-destructive/10 border-destructive/30">
              <CardHeader className="flex-row items-center space-x-3 p-3">
                <Shield className="w-5 h-5 text-destructive" />
                <CardTitle className="text-base text-destructive">Contact d'Urgence</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 text-xs">
                <p><strong>Nom :</strong> {displayData.emergencyContactName}</p>
                <p><strong>Téléphone :</strong> {displayData.emergencyContactPhone}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
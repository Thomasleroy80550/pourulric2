import React, { useState } from 'react';
import { ServiceProvider } from '@/lib/marketplace-api';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Globe, MapPin, Building, ExternalLink, Star, Award, Crown } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProviderCardProps {
  provider: ServiceProvider;
}

const ProviderCard: React.FC<ProviderCardProps> = ({ provider }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Tronquer le texte si trop long
  const truncatedDescription = provider.description && provider.description.length > 80
    ? provider.description.substring(0, 80) + '...'
    : provider.description;

  // Fonction pour obtenir l'icône et la couleur du badge de certification
  const getCertificationBadge = (level: string) => {
    switch (level) {
      case 'premium':
        return {
          icon: <Star className="h-4 w-4" />,
          color: 'bg-yellow-500 text-white border-yellow-500 shadow-md',
          label: 'Expert',
          description: 'Prestataire expert avec services premium'
        };
      case 'exclusive':
        return {
          icon: <Crown className="h-4 w-4" />,
          color: 'bg-purple-600 text-white border-purple-600 shadow-md',
          label: 'Premium',
          description: 'Partenaire premium avec services exclusifs'
        };
      default:
        return {
          icon: <Award className="h-4 w-4" />,
          color: 'bg-blue-600 text-white border-blue-600 shadow-md',
          label: 'Partenaire',
          description: 'Prestataire vérifié et partenaire de confiance'
        };
    }
  };

  const certificationBadge = provider.certification_level ? getCertificationBadge(provider.certification_level) : null;

  return (
    <>
      <Card 
        className="group flex flex-col h-full cursor-pointer hover:shadow-xl transition-all duration-300 border hover:border-primary/20 relative overflow-hidden"
        onClick={() => setIsDialogOpen(true)}
      >
        {/* Effet de brillance au survol */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <CardHeader className="relative z-10">
          <div className="w-full mb-4 relative overflow-hidden rounded-lg">
            <AspectRatio ratio={16 / 9}>
              <img
                src={provider.image_url || '/placeholder.svg'}
                alt={provider.name}
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
              />
            </AspectRatio>
            {/* Badges en overlay avec meilleur contraste */}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              <Badge variant="secondary" className="capitalize text-xs bg-gray-900/90 text-white backdrop-blur-sm border-gray-700 shadow-lg">
                {provider.category}
              </Badge>
              {certificationBadge && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className={`text-xs ${certificationBadge.color} backdrop-blur-sm border`}>
                        {certificationBadge.icon}
                        <span className="ml-1">{certificationBadge.label}</span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{certificationBadge.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors duration-200">
            {provider.name}
          </CardTitle>
          {/* Badge de gestion complète */}
          {provider.has_full_management && (
            <div className="mt-2">
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                <Building className="h-3 w-3 mr-1" />
                Gérance complète {provider.management_area && `• ${provider.management_area}`}
              </Badge>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="flex-grow relative z-10">
          <p className="text-sm text-muted-foreground line-clamp-3">{truncatedDescription}</p>
          
          {/* Informations rapides */}
          <div className="mt-4 space-y-2">
            {provider.phone && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">{provider.phone}</span>
              </div>
            )}
            {provider.location && (
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">{provider.location}</span>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="relative z-10">
          <div className="w-full flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Cliquez pour plus d'infos</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="w-full mb-4 relative overflow-hidden rounded-lg">
              <AspectRatio ratio={16 / 9}>
                <img
                  src={provider.image_url || '/placeholder.svg'}
                  alt={provider.name}
                  className="rounded-md object-cover w-full h-full"
                />
              </AspectRatio>
              <div className="absolute top-4 right-4">
                <Badge variant="secondary" className="capitalize bg-gray-900/90 text-white backdrop-blur-sm border-gray-700">
                  {provider.category}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DialogTitle className="text-2xl font-bold">{provider.name}</DialogTitle>
              {certificationBadge && (
                <Badge className={`${certificationBadge.color} border`}>
                  {certificationBadge.icon}
                  <span className="ml-1">{certificationBadge.label}</span>
                </Badge>
              )}
            </div>
            <DialogDescription className="text-base">{provider.description}</DialogDescription>
            {/* Badge de gestion complète */}
            {provider.has_full_management && (
              <div className="mt-4">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Building className="h-3 w-3 mr-1" />
                  Gérance complète {provider.management_area && `• ${provider.management_area}`}
                </Badge>
              </div>
            )}
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {provider.phone && (
              <div className="flex items-center p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors">
                <Phone className="h-5 w-5 mr-4 text-primary flex-shrink-0" />
                <a href={`tel:${provider.phone}`} className="text-sm font-medium hover:underline">
                  {provider.phone}
                </a>
              </div>
            )}
            {provider.email && (
              <div className="flex items-center p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors">
                <Mail className="h-5 w-5 mr-4 text-primary flex-shrink-0" />
                <a href={`mailto:${provider.email}`} className="text-sm font-medium hover:underline">
                  {provider.email}
                </a>
              </div>
            )}
            {provider.website && (
              <div className="flex items-center p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors">
                <Globe className="h-5 w-5 mr-4 text-primary flex-shrink-0" />
                <a href={provider.website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline">
                  {provider.website}
                </a>
              </div>
            )}
            {provider.location && (
              <div className="flex items-center p-3 rounded-lg bg-secondary/50">
                <MapPin className="h-5 w-5 mr-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">{provider.location}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProviderCard;
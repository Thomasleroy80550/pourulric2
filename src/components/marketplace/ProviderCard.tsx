import React, { useState } from 'react';
import { ServiceProvider } from '@/lib/marketplace-api';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Globe, MapPin } from 'lucide-react';
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

interface ProviderCardProps {
  provider: ServiceProvider;
}

const ProviderCard: React.FC<ProviderCardProps> = ({ provider }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Tronquer le texte si trop long
  const truncatedDescription = provider.description && provider.description.length > 80
    ? provider.description.substring(0, 80) + '...'
    : provider.description;

  return (
    <>
      <Card 
        className="flex flex-col h-full cursor-pointer hover:shadow-lg transition-shadow duration-200"
        onClick={() => setIsDialogOpen(true)}
      >
        <CardHeader>
          <div className="w-full mb-4">
            <AspectRatio ratio={16 / 9}>
              <img
                src={provider.image_url || '/placeholder.svg'}
                alt={provider.name}
                className="rounded-md object-cover w-full h-full"
              />
            </AspectRatio>
          </div>
          <CardTitle className="text-lg">{provider.name}</CardTitle>
          <CardDescription className="capitalize">{provider.category}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground">{truncatedDescription}</p>
          {provider.phone && (
            <div className="flex items-center mt-3 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 mr-2" />
              <span>{provider.phone}</span>
            </div>
          )}
          {provider.location && (
            <div className="flex items-center mt-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mr-2" />
              <span>{provider.location}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="w-full mb-4">
              <AspectRatio ratio={16 / 9}>
                <img
                  src={provider.image_url || '/placeholder.svg'}
                  alt={provider.name}
                  className="rounded-md object-cover w-full h-full"
                />
              </AspectRatio>
            </div>
            <DialogTitle>{provider.name}</DialogTitle>
            <Badge variant="secondary" className="w-fit capitalize">{provider.category}</Badge>
            <DialogDescription>{provider.description}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {provider.phone && (
              <div className="flex items-center">
                <Phone className="h-5 w-5 mr-3 text-muted-foreground" />
                <a href={`tel:${provider.phone}`} className="text-sm hover:underline">
                  {provider.phone}
                </a>
              </div>
            )}
            {provider.email && (
              <div className="flex items-center">
                <Mail className="h-5 w-5 mr-3 text-muted-foreground" />
                <a href={`mailto:${provider.email}`} className="text-sm hover:underline">
                  {provider.email}
                </a>
              </div>
            )}
            {provider.website && (
              <div className="flex items-center">
                <Globe className="h-5 w-5 mr-3 text-muted-foreground" />
                <a href={provider.website} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">
                  {provider.website}
                </a>
              </div>
            )}
            {provider.location && (
              <div className="flex items-center">
                <MapPin className="h-5 w-5 mr-3 text-muted-foreground" />
                <span className="text-sm">{provider.location}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Fermer
            </Button>
            {provider.phone && (
              <Button asChild>
                <a href={`tel:${provider.phone}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  Appeler
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProviderCard;
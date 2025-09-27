import React from 'react';
import { ServiceProvider } from '@/lib/marketplace-api';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Globe } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface ProviderCardProps {
  provider: ServiceProvider;
}

const ProviderCard: React.FC<ProviderCardProps> = ({ provider }) => {
  return (
    <Card className="flex flex-col h-full">
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
        <CardTitle>{provider.name}</CardTitle>
        <CardDescription className="capitalize">{provider.category}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">{provider.description}</p>
        {provider.location && (
          <p className="text-sm mt-2">
            <strong>Localisation :</strong> {provider.location}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        {provider.phone && (
          <Button asChild variant="outline" size="icon">
            <a href={`tel:${provider.phone}`}><Phone className="h-4 w-4" /></a>
          </Button>
        )}
        {provider.email && (
          <Button asChild variant="outline" size="icon">
            <a href={`mailto:${provider.email}`}><Mail className="h-4 w-4" /></a>
          </Button>
        )}
        {provider.website && (
          <Button asChild variant="outline" size="icon">
            <a href={provider.website} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4" /></a>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ProviderCard;
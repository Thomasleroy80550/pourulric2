import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/MainLayout';
import { getServiceProviders } from '@/lib/marketplace-api';
import ProviderCard from '@/components/marketplace/ProviderCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const MarketplacePage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: providers, isLoading, isError, error } = useQuery({
    queryKey: ['serviceProviders'],
    queryFn: getServiceProviders,
  });

  const categories = useMemo(() => {
    if (!providers) return [];
    const allCategories = providers.map(p => p.category);
    return ['all', ...Array.from(new Set(allCategories))];
  }, [providers]);

  const filteredProviders = useMemo(() => {
    if (!providers) return [];
    return providers.filter(provider => {
      const matchesCategory = selectedCategory === 'all' || provider.category === selectedCategory;
      const matchesSearch = searchTerm === '' ||
        provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [providers, searchTerm, selectedCategory]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Marketplace des Partenaires</h1>
          <p className="text-muted-foreground">Trouvez des prestataires de confiance pour l'entretien de vos biens.</p>
        </header>

        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Rechercher un service ou un prestataire..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow"
          />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filtrer par catégorie" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category} className="capitalize">
                  {category === 'all' ? 'Toutes les catégories' : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>
              Impossible de charger les prestataires. Veuillez réessayer plus tard.
              <br />
              <span className="text-xs">{(error as Error).message}</span>
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !isError && (
          <>
            {filteredProviders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProviders.map(provider => (
                  <ProviderCard key={provider.id} provider={provider} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <h3 className="text-xl font-semibold">Aucun prestataire trouvé</h3>
                <p className="text-muted-foreground">Essayez d'ajuster vos filtres ou votre recherche.</p>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default MarketplacePage;
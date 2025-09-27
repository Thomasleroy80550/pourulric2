import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/MainLayout';
import { getServiceProviders } from '@/lib/marketplace-api';
import ProviderCard from '@/components/marketplace/ProviderCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Search, Building } from 'lucide-react';

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
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative rounded-lg bg-secondary p-8 md:p-16 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-primary">Marketplace des Partenaires</h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Trouvez des prestataires de confiance, recommandés par nos équipes, pour l'entretien de vos biens.
            </p>
            
            <div className="mt-8 max-w-2xl mx-auto flex flex-col md:flex-row items-center gap-2 bg-background p-2 rounded-full shadow-lg border">
              <div className="relative flex-grow w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un service, un métier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 h-12 text-base border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent rounded-full"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-[240px] h-12 text-base border-0 md:border-l rounded-full md:rounded-l-none focus:ring-0 focus:ring-offset-0">
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

            {/* Phrase d'accroche Hello Keys */}
            <div className="mt-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Building className="h-4 w-4" />
                <p>
                  <span className="font-medium text-foreground">Conseil pro :</span> Présentez-vous comme venant de la part de Hello Keys pour bénéficier de tarifs préférentiels et d'un service prioritaire.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="px-4 md:px-0">
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-4 p-4 border rounded-lg">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProviders.map(provider => (
                    <ProviderCard key={provider.id} provider={provider} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-secondary rounded-lg">
                  <h3 className="text-2xl font-semibold">Aucun prestataire trouvé</h3>
                  <p className="text-muted-foreground mt-2">Essayez d'ajuster vos filtres ou votre recherche.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default MarketplacePage;
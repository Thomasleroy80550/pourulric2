import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Award, Shield, Crown, Building, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import MainLayout from '@/components/MainLayout';
import ProviderCard from '@/components/marketplace/ProviderCard';
import { getServiceProviders, ServiceProvider } from '@/lib/marketplace-api';

const MarketplacePage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCertification, setSelectedCertification] = useState('all');

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['serviceProviders'],
    queryFn: getServiceProviders,
  });

  const approvedProviders = providers.filter(p => p.is_approved);

  const categories = Array.from(new Set(approvedProviders.map(p => p.category))).filter(Boolean);
  
  const filteredProviders = approvedProviders.filter(provider => {
    const matchesSearch = provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         provider.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || provider.category === selectedCategory;
    const matchesCertification = selectedCertification === 'all' || provider.certification_level === selectedCertification;
    
    return matchesSearch && matchesCategory && matchesCertification;
  });

  const groupedProviders = categories.reduce((acc, category) => {
    acc[category] = filteredProviders.filter(p => p.category === category);
    return acc;
  }, {} as Record<string, ServiceProvider[]>);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Marketplace</h1>
          <p className="text-muted-foreground">Trouvez les meilleurs prestataires pour votre location saisonnière</p>
        </div>

        {/* Filtres */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Filtres</CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Info className="h-4 w-4 mr-2" />
                    Légende des badges
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Système de certification</h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                          <Award className="h-3 w-3" />
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">Partenaire</p>
                          <p className="text-xs text-muted-foreground">Prestataire vérifié et partenaire de confiance</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                          <Star className="h-3 w-3" />
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">Expert</p>
                          <p className="text-xs text-muted-foreground">Prestataire expert avec services premium</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                          <Crown className="h-3 w-3" />
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">Premium</p>
                          <p className="text-xs text-muted-foreground">Partenaire premium avec services exclusifs</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Building className="h-3 w-3" />
                        </Badge>
                        <span className="text-xs">Gérance complète du parc (100%)</span>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Recherche</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Rechercher un prestataire..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Catégorie</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les catégories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les catégories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Certification</label>
                <Select value={selectedCertification} onValueChange={setSelectedCertification}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous niveaux" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous niveaux</SelectItem>
                    <SelectItem value="standard">Partenaire</SelectItem>
                    <SelectItem value="premium">Expert</SelectItem>
                    <SelectItem value="exclusive">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Résultats */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6">
              <TabsTrigger value="all">Tous ({filteredProviders.length})</TabsTrigger>
              {categories.map(category => (
                <TabsTrigger key={category} value={category}>
                  {category} ({groupedProviders[category]?.length || 0})
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value="all">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProviders.map(provider => (
                  <ProviderCard key={provider.id} provider={provider} />
                ))}
              </div>
            </TabsContent>
            
            {categories.map(category => (
              <TabsContent key={category} value={category}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedProviders[category]?.map(provider => (
                    <ProviderCard key={provider.id} provider={provider} />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
};

export default MarketplacePage;
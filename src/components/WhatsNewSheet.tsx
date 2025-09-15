import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { getPublicChangelog, ChangelogEntry } from '@/lib/changelog-api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WhatsNewSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const getCategoryBadgeVariant = (category?: string): BadgeProps['variant'] => {
  switch (category?.toLowerCase()) {
    case 'nouveauté':
      return 'default';
    case 'amélioration':
      return 'secondary';
    case 'correction':
      return 'destructive';
    default:
      return 'outline';
  }
};

const WhatsNewSheet: React.FC<WhatsNewSheetProps> = ({ isOpen, onOpenChange }) => {
  const { data: entries, isLoading, error } = useQuery<ChangelogEntry[]>({
    queryKey: ['publicChangelog'],
    queryFn: getPublicChangelog,
    enabled: isOpen, // Only fetch when the sheet is open
  });

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Quoi de neuf ?</SheetTitle>
          <SheetDescription>
            Voici les dernières mises à jour et améliorations que nous avons apportées à la plateforme.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-4 pr-6">
          <div className="space-y-6">
            {isLoading && <p>Chargement des nouveautés...</p>}
            {error && <p className="text-red-500">Erreur: {error.message}</p>}
            {entries?.map((entry) => (
              <div key={entry.id} className="relative pl-6 pb-6 border-b border-dashed last:border-b-0 last:pb-0">
                <div className="absolute left-0 top-1 h-3 w-3 rounded-full bg-primary"></div>
                <div className="absolute left-[5px] top-4 h-full w-px bg-border"></div>
                <p className="text-xs text-muted-foreground mb-1">
                  {format(new Date(entry.created_at), 'd MMMM yyyy', { locale: fr })}
                </p>
                <h3 className="font-semibold text-lg">
                  {entry.title}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={getCategoryBadgeVariant(entry.category)}>{entry.category || 'Info'}</Badge>
                  <Badge variant="outline">{entry.version}</Badge>
                </div>
                {entry.description && (
                  <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{entry.description}</p>
                )}
              </div>
            ))}
            {entries?.length === 0 && !isLoading && (
              <p className="text-center text-muted-foreground py-8">Aucune nouveauté pour le moment.</p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default WhatsNewSheet;
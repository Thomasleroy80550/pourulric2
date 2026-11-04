import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import type { AdminPageUsage } from '@/hooks/useAdminPageUsage';

type NavigationItem = {
  name: string;
  href: string;
  icon: React.ElementType;
};

type NavigationCategory = {
  categoryName: string;
  items: NavigationItem[];
};

interface AdminNavigationProps {
  categories: NavigationCategory[];
  simplified: boolean;
  onModeChange: (simplified: boolean) => void;
  isActive: (href: string) => boolean;
  usage: AdminPageUsage[];
  onNavigate?: () => void;
}

const quickLinks = ['/admin', '/admin/users', '/admin/user-rooms', '/admin/statements'];

export default function AdminNavigation({ categories, simplified, onModeChange, isActive, usage, onNavigate }: AdminNavigationProps) {
  const items = categories.flatMap((category) => category.items);
  const counts = new Map(usage.map((entry) => [entry.page_path, entry.visit_count]));
  const rankedItems = items.filter((item) => (counts.get(item.href) ?? 0) > 0)
    .sort((a, b) => (counts.get(b.href) ?? 0) - (counts.get(a.href) ?? 0) || a.name.localeCompare(b.name, 'fr'));
  const fallbackItems = quickLinks.map((href) => items.find((item) => item.href === href))
    .filter((item): item is NavigationItem => Boolean(item))
    .filter((item) => !rankedItems.some((ranked) => ranked.href === item.href));
  const pinnedItem = items.find((item) => item.href === '/admin/invoice-generation');
  const priorityItems = [
    ...(pinnedItem ? [pinnedItem] : []),
    ...[...rankedItems, ...fallbackItems].filter((item) => item.href !== pinnedItem?.href).slice(0, 4),
  ];
  const renderLink = (item: NavigationItem) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={onNavigate}
        aria-current={isActive(item.href) ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
          isActive(item.href)
            ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-200'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.name}</span>
      </Link>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Version du menu">
        <Button size="sm" variant={simplified ? 'secondary' : 'ghost'} aria-pressed={simplified} onClick={() => onModeChange(true)}>
          Simplifié
        </Button>
        <Button size="sm" variant={!simplified ? 'secondary' : 'ghost'} aria-pressed={!simplified} onClick={() => onModeChange(false)}>
          Complet
        </Button>
      </div>
      <nav aria-label="Navigation administration" className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {simplified ? (
          <>
            <div className="space-y-1">
              <div className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {rankedItems.length > 0 ? 'Les plus consultées' : 'Accès rapides'}
              </div>
              {priorityItems.map(renderLink)}
              {rankedItems.length > 0 && <p className="px-3 pt-1 text-xs text-muted-foreground">Selon les visites de tous les admins</p>}
            </div>
            <div>
              <div className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Toutes les rubriques</div>
              <Accordion type="single" collapsible>
                {categories.map((category) => (
                  <AccordionItem key={category.categoryName} value={category.categoryName}>
                    <AccordionTrigger className={cn('px-3 py-3 text-sm hover:no-underline', category.items.some((item) => isActive(item.href)) && 'text-orange-600')}>
                      {category.categoryName}
                    </AccordionTrigger>
                    <AccordionContent className="space-y-1 pb-2">
                      {category.items.map(renderLink)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </>
        ) : categories.map((category) => (
          <div key={category.categoryName} className="space-y-1">
            <div className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category.categoryName}</div>
            <div className="space-y-1">{category.items.map(renderLink)}</div>
          </div>
        ))}
      </nav>
    </div>
  );
}

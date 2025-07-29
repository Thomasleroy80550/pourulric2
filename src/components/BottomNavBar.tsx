import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, CalendarDays, Bookmark, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

const mainNavItems = [
  { name: 'Aperçu', href: '/', icon: Home },
  { name: 'Calendrier', href: '/calendar', icon: CalendarDays },
  { name: 'Réservations', href: '/bookings', icon: Bookmark },
  { name: 'Rapports', href: '/reports', icon: Wrench },
];

const BottomNavBar = () => {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border h-16 md:hidden z-50">
      <nav className="grid h-full grid-cols-4">
        {mainNavItems.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              'flex flex-col items-center justify-center text-xs font-medium transition-colors',
              location.pathname === item.href
                ? 'text-primary'
                : 'text-muted-foreground hover:text-primary'
            )}
          >
            <item.icon className="h-5 w-5 mb-1" />
            <span className="text-center">{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default BottomNavBar;
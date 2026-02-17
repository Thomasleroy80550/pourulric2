import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, CalendarDays, Bookmark, Wrench, Banknote, User, TrendingUp, Star, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from './SessionContextProvider';

interface BottomNavBarProps {
  isPaymentSuspended: boolean;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ isPaymentSuspended }) => {
  const location = useLocation();
  const { profile } = useSession();

  const navLinks = [
    { name: 'Aperçu', href: '/', icon: Home },
    { name: 'Calendrier', href: '/calendar', icon: CalendarDays, disabled: isPaymentSuspended },
    { name: 'Réservations', href: '/bookings', icon: Bookmark, disabled: isPaymentSuspended },
    { name: 'Notifs', href: '/notifications', icon: Bell },
    { name: 'Finances', href: '/finances', icon: Banknote, disabled: isPaymentSuspended },
    { name: 'Stats', href: '/performance', icon: TrendingUp },
    { name: 'Avis', href: '/reviews', icon: Star },
    { name: 'Profil', href: '/profile', icon: User },
    { name: 'Incidents', href: '/reports', icon: Wrench },
  ];

  // Filter navLinks based on profile role (similar to MainLayout)
  const filteredNavLinks = navLinks.filter(link => {
    if (profile?.role === 'accountant') {
      return ['Stats', 'Finances', 'Taxe de Séjour'].includes(link.name);
    }
    return true;
  });

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <div
      className={cn(
        "fixed left-0 right-0 bottom-0 md:hidden z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70",
        "pb-[env(safe-area-inset-bottom)]"
      )}
    >
      <nav className="grid h-16 grid-cols-5">
        {filteredNavLinks.slice(0, 5).map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              'flex flex-col items-center justify-center text-[11px] font-medium transition-colors',
              isActive(item.href) ? 'text-primary' : 'text-muted-foreground hover:text-primary',
              item.disabled && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
            onClick={item.disabled ? (e) => e.preventDefault() : undefined}
            aria-current={isActive(item.href) ? 'page' : undefined}
          >
            <item.icon className={cn("h-5 w-5 mb-1", isActive(item.href) && "text-primary")} />
            <span className="text-center leading-none">{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default BottomNavBar;
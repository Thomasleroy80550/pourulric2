import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, CalendarDays, Bookmark, Wrench, Banknote, Building, User, LayoutDashboard, TrendingUp, Star } from 'lucide-react';
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
    { name: 'Finances', href: '/finances', icon: Banknote, disabled: isPaymentSuspended },
    { name: 'Performances', href: '/performance', icon: TrendingUp },
    { name: 'Mes Avis', href: '/reviews', icon: Star },
    { name: 'Mon Profil', href: '/profile', icon: User },
    { name: 'Incidents', href: '/reports', icon: Wrench },
  ];

  // Filter navLinks based on profile role (similar to MainLayout)
  const filteredNavLinks = navLinks.filter(link => {
    if (profile?.role === 'accountant') {
      return ['Performances', 'Finances', 'Taxe de Séjour'].includes(link.name);
    }
    return true;
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border h-16 md:hidden z-50">
      <nav className="grid h-full grid-cols-5">
        {filteredNavLinks.slice(0, 5).map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              'flex flex-col items-center justify-center text-xs font-medium transition-colors',
              location.pathname === item.href
                ? 'text-primary'
                : 'text-muted-foreground hover:text-primary',
              item.disabled && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
            onClick={item.disabled ? (e) => e.preventDefault() : undefined}
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
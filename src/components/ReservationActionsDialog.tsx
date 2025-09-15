import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, DollarSign, User, Home, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { KrossbookingReservation } from '@/lib/krossbooking';

interface ReservationActionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  booking: KrossbookingReservation | null;
  onEdit: (booking: KrossbookingReservation) => void;
  onDelete: (booking: KrossbookingReservation) => void; // Change from bookingId to full booking
}

const getStatusVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'confirmed':
    case 'confirmée':
    case 'propri': // For owner reservations that are active
      return 'default';
    case 'pending':
    case 'en attente':
      return 'secondary';
    case 'cancelled':
    case 'annulée':
    case 'canc': // For cancelled owner reservations
      return 'destructive';
    case 'prop0': // Owner reservation without cleaning
      return 'outline';
    default:
      return 'outline';
  }
};

const ReservationActionsDialog: React.FC<ReservationActionsDialogProps> = ({
  isOpen,
  onOpenChange,
  booking,
  onEdit,
  onDelete,
}) => {
  if (!booking) {
    return null; // Don't render if no booking is provided
  }

  const checkIn = isValid(parseISO(booking.check_in_date)) ? parseISO(booking.check_in_date) : null;
  const checkOut = isValid(parseISO(booking.check_out_date)) ? parseISO(booking.check_out_date) : null;
  const numberOfNights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;

  const isOwnerReservation = booking.status.toLowerCase() === 'propri' || booking.status.toLowerCase() === 'prop0';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Actions pour la Réservation</DialogTitle>
          <DialogDescription>
            Gérez la réservation de {booking.guest_name || 'N/A'} pour {booking.property_name}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center">
            <Tag className="h-4 w-4 mr-2 text-gray-500" />
            <span className="font-medium">ID Réservation:</span> {booking.id}
          </div>
          <div className="flex items-center">
            <User className="h-4 w-4 mr-2 text-gray-500" />
            <span className="font-medium">Client:</span> {booking.guest_name || 'N/A'}
          </div>
          <div className="flex items-center">
            <Home className="h-4 w-4 mr-2 text-gray-500" />
            <span className="font-medium">Propriété:</span> {booking.property_name}
          </div>
          <div className="flex items-center">
            <CalendarDays className="h-4 w-4 mr-2 text-gray-500" />
            <span className="font-medium">Dates:</span>{' '}
            {checkIn ? format(checkIn, 'dd/MM/yyyy', { locale: fr }) : 'N/A'} -{' '}
            {checkOut ? format(checkOut, 'dd/MM/yyyy', { locale: fr }) : 'N/A'} ({numberOfNights} nuit(s))
          </div>
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
            <span className="font-medium">Montant:</span> {booking.amount}
          </div>
          <div className="flex items-center">
            <span className="font-medium">Statut:</span>{' '}
            <Badge variant={getStatusVariant(booking.status)} className="ml-2">
              {booking.status}
            </Badge>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          {isOwnerReservation && (
            <>
              <Button variant="secondary" onClick={() => onEdit(booking)}>
                Modifier
              </Button>
              <Button variant="destructive" onClick={() => onDelete(booking)}> {/* Pass full booking */}
                Supprimer
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReservationActionsDialog;
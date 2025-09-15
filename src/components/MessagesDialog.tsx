import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageSquare, User, Clock } from 'lucide-react';
import { fetchKrossbookingMessageThreads, KrossbookingMessageThread, KrossbookingMessage } from '@/lib/krossbooking';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface BookingData {
  id: string;
  guest_name: string;
  property_name: string;
}

interface MessagesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingData | null;
}

const MessagesDialog: React.FC<MessagesDialogProps> = ({ isOpen, onOpenChange, booking }) => {
  const [messageThreads, setMessageThreads] = useState<KrossbookingMessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && booking) {
      setLoading(true);
      setError(null);
      setMessageThreads([]); // Clear previous messages
      const loadMessages = async () => {
        try {
          const threads = await fetchKrossbookingMessageThreads(booking.id);
          setMessageThreads(threads);
        } catch (err: any) {
          setError(`Erreur lors du chargement des messages : ${err.message}`);
          toast.error(`Erreur: ${err.message}`);
        } finally {
          setLoading(false);
        }
      };
      loadMessages();
    }
  }, [isOpen, booking]);

  if (!booking) {
    return null; // Don't render if no booking is provided
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Messages pour {booking.guest_name}
          </DialogTitle>
          <DialogDescription>
            Conversation(s) liée(s) à la réservation #{booking.id} pour {booking.property_name}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow p-4 border rounded-md bg-gray-50 dark:bg-gray-800 text-sm leading-relaxed">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : messageThreads.length === 0 ? (
            <div className="text-gray-500 text-center py-4">Aucun message trouvé pour cette réservation.</div>
          ) : (
            <div className="space-y-6">
              {messageThreads.map((thread) => (
                <div key={thread.id_thread} className="border-b pb-4 last:border-b-0 last:pb-0">
                  <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Fil de discussion ({thread.cod_channel})
                  </div>
                  <div className="space-y-3">
                    {thread.messages.map((message) => {
                      const isUser = message.sender === 'host'; // Assuming 'host' is our user
                      const messageDate = isValid(parseISO(message.date)) ? parseISO(message.date) : null;
                      return (
                        <div
                          key={message.id_message}
                          className={cn(
                            "flex",
                            isUser ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[80%] p-3 rounded-lg shadow-sm",
                              isUser
                                ? "bg-blue-500 text-white rounded-br-none"
                                : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-tl-none"
                            )}
                          >
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold">
                                {isUser ? 'Vous' : (message.sender === 'guest' ? booking.guest_name : 'Système')}
                              </span>
                              {messageDate && (
                                <span className="text-gray-300 dark:text-gray-400 ml-2">
                                  {format(messageDate, 'dd/MM/yyyy HH:mm', { locale: fr })}
                                </span>
                              )}
                            </div>
                            <p className="text-sm">{message.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <DialogFooter className="mt-4">
          <Button onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MessagesDialog;
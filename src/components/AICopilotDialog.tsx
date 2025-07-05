import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles, Loader2, CalendarDays, MessageSquare, Home } from 'lucide-react';
import { toast } from 'sonner';
import { format, parse, isValid, isWithinInterval, parseISO, isSameDay, addDays, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getUserRooms, UserRoom } from '@/lib/user-room-api';
import { fetchKrossbookingReservations, KrossbookingReservation } from '@/lib/krossbooking';
import { NavigateFunction } from 'react-router-dom'; // Import NavigateFunction

interface AICopilotDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  navigate: NavigateFunction; // Add navigate prop
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  parsedData?: any;
}

const AICopilotDialog: React.FC<AICopilotDialogProps> = ({ isOpen, onOpenChange, navigate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [conversationMode, setConversationMode] = useState<'initial' | 'chat' | 'block_room_awaiting_room_selection' | 'block_room_awaiting_dates'>('initial');
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
  const [allReservations, setAllReservations] = useState<KrossbookingReservation[]>([]);
  const [selectedRoomForBlocking, setSelectedRoomForBlocking] = useState<UserRoom | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMessages([{ id: 'ai-welcome', sender: 'ai', text: "Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider aujourd'hui ?" }]);
      setInput('');
      setConversationMode('initial');
      setUserRooms([]);
      setAllReservations([]);
      setSelectedRoomForBlocking(null);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchInitialData = useCallback(async () => {
    setIsThinking(true);
    try {
      const fetchedUserRooms = await getUserRooms();
      setUserRooms(fetchedUserRooms);
      const fetchedReservations = await fetchKrossbookingReservations(fetchedUserRooms);
      setAllReservations(fetchedReservations);
      return { fetchedUserRooms, fetchedReservations };
    } catch (error: any) {
      toast.error(`Erreur lors du chargement des données : ${error.message}`);
      console.error("Error fetching initial data for AI Copilot:", error);
      return { fetchedUserRooms: [], fetchedReservations: [] };
    } finally {
      setIsThinking(false);
    }
  }, []);

  const checkAvailability = (room: UserRoom, startDate: Date, endDate: Date, currentBookingId?: string) => {
    const conflicts: KrossbookingReservation[] = [];
    const requestedInterval = { start: subDays(startDate, 0), end: addDays(endDate, 0) }; // Include check-in and check-out days

    for (const res of allReservations) {
      // Skip the current booking if we are editing it
      if (currentBookingId && res.id === currentBookingId) {
        continue;
      }

      const resCheckIn = isValid(parseISO(res.check_in_date)) ? parseISO(res.check_in_date) : null;
      const resCheckOut = isValid(parseISO(res.check_out_date)) ? parseISO(res.check_out_date) : null;

      if (!resCheckIn || !resCheckOut) continue;

      // Check if the reservation is for the selected room and is not cancelled
      if (res.krossbooking_room_id === room.room_id && res.status !== 'CANC') {
        // A conflict exists if the requested interval overlaps with an existing reservation's interval
        // The existing reservation's interval is from check-in to the day *before* check-out for multi-night stays.
        // For single-night stays (check-in == check-out), the interval is just that single day.
        const existingIntervalEnd = isSameDay(resCheckIn, resCheckOut) ? resCheckIn : subDays(resCheckOut, 1);
        const existingInterval = { start: resCheckIn, end: existingIntervalEnd };

        // Check for overlap:
        // 1. Requested start is within existing interval
        // 2. Requested end is within existing interval
        // 3. Existing start is within requested interval
        if (
          (isWithinInterval(requestedInterval.start, existingInterval) ||
          isWithinInterval(requestedInterval.end, existingInterval) ||
          isWithinInterval(existingInterval.start, requestedInterval))
        ) {
          conflicts.push(res);
        }
      }
    }
    return conflicts;
  };

  const parseUserCommand = async (command: string) => {
    const lowerCommand = command.toLowerCase();
    let responseText = "Désolé, je n'ai pas compris votre demande. Pouvez-vous reformuler ?";
    let parsedData = null;

    if (conversationMode === 'block_room_awaiting_room_selection') {
      const matchedRoom = userRooms.find(room => lowerCommand.includes(room.room_name.toLowerCase()));
      if (matchedRoom) {
        setSelectedRoomForBlocking(matchedRoom);
        setConversationMode('block_room_awaiting_dates');
        responseText = `D'accord, pour la chambre "${matchedRoom.room_name}". Maintenant, veuillez me donner les dates d'arrivée et de départ, et si vous souhaitez prévoir le ménage. Par exemple : 'du 01/01/2025 au 05/01/2025 avec ménage'.`;
      } else {
        responseText = `Je n'ai pas trouvé de chambre correspondant à "${command}". Veuillez choisir parmi vos chambres configurées : ${userRooms.map(r => r.room_name).join(', ')}.`;
      }
    } else if (conversationMode === 'block_room_awaiting_dates') {
      const blockRoomRegex = /du (\d{2}\/\d{2}\/\d{4}) au (\d{2}\/\d{2}\/\d{4})( avec ménage| sans ménage)?/;
      const match = lowerCommand.match(blockRoomRegex);

      if (match && selectedRoomForBlocking) {
        const startDateStr = match[1];
        const endDateStr = match[2];
        const cleaningPreference = match[3] ? match[3].trim() : '';

        const startDate = parse(startDateStr, 'dd/MM/yyyy', new Date());
        const endDate = parse(endDateStr, 'dd/MM/yyyy', new Date());

        if (isValid(startDate) && isValid(endDate)) {
          const conflicts = checkAvailability(selectedRoomForBlocking, startDate, endDate);

          const formattedStartDate = format(startDate, 'dd MMMM yyyy', { locale: fr });
          const formattedEndDate = format(endDate, 'dd MMMM yyyy', { locale: fr });
          const cleaningText = cleaningPreference === 'avec ménage' ? 'avec ménage' : 'sans ménage';

          if (conflicts.length === 0) {
            responseText = `Les dates du ${formattedStartDate} au ${formattedEndDate} pour la chambre "${selectedRoomForBlocking.room_name}" sont disponibles !`;
            responseText += `\n\nPour finaliser le blocage, veuillez vous rendre sur la page "Calendrier" et utiliser le bouton "Réservation Propriétaire".`;
            parsedData = {
              action: 'block_room',
              roomId: selectedRoomForBlocking.room_id,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              cleaning: cleaningPreference === 'avec ménage',
            };
          } else {
            responseText = `Attention : Les dates du ${formattedStartDate} au ${formattedEndDate} pour la chambre "${selectedRoomForBlocking.room_name}" ne sont PAS entièrement disponibles.`;
            responseText += `\n\nConflits trouvés :`;
            conflicts.forEach(c => {
              responseText += `\n- Réservation #${c.id} (${c.guest_name}) du ${format(parseISO(c.check_in_date), 'dd/MM/yyyy')} au ${format(parseISO(c.check_out_date), 'dd/MM/yyyy')}`;
            });
            responseText += `\n\nVeuillez vérifier le calendrier sur la page "Calendrier" pour plus de détails et pour ajuster votre demande.`;
          }
          setConversationMode('initial'); // Reset mode after processing dates
        } else {
          responseText = "Les dates fournies ne sont pas valides. Veuillez utiliser le format JJ/MM/AAAA.";
        }
      } else {
        responseText = "Veuillez me donner les dates au format 'du JJ/MM/AAAA au JJ/MM/AAAA avec ménage' ou 'sans ménage'.";
      }
    } else if (lowerCommand.includes("bonjour") || lowerCommand.includes("salut")) {
      responseText = "Bonjour ! Comment puis-je vous assister ?";
      setConversationMode('initial');
    } else if (lowerCommand.includes("aide") || lowerCommand.includes("help")) {
      responseText = "Je peux vous aider à bloquer des dates pour votre logement. Essayez une phrase comme : 'Bloquer mon logement du 01/01/2025 au 05/01/2025 avec ménage'.";
      setConversationMode('initial');
    } else {
      responseText = "Désolé, je n'ai pas compris votre demande. Pouvez-vous reformuler ?";
      setConversationMode('initial');
    }

    return { text: responseText, data: parsedData };
  };

  const handleSendMessage = async () => {
    if (input.trim() === '') return;

    const newUserMessage: ChatMessage = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages((prev) => [...prev, newUserMessage]);
    setInput('');
    setIsThinking(true);

    const aiResponse = await parseUserCommand(newUserMessage.text);
    const newAiMessage: ChatMessage = { id: Date.now().toString() + '-ai', sender: 'ai', text: aiResponse.text, parsedData: aiResponse.data };
    setMessages((prev) => [...prev, newAiMessage]);
    setIsThinking(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isThinking) {
      handleSendMessage();
    }
  };

  const handleInitialAction = async (actionType: 'block_room' | 'general_question') => {
    setIsThinking(true);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay for button click

    if (actionType === 'block_room') {
      const { fetchedUserRooms } = await fetchInitialData();
      if (fetchedUserRooms.length === 0) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString() + '-ai-no-rooms', sender: 'ai', text: "Vous n'avez pas encore configuré de chambres. Veuillez en ajouter via la page 'Mon Profil' pour pouvoir bloquer des dates." }
        ]);
        setConversationMode('initial');
      } else {
        let roomListText = '';
        if (fetchedUserRooms.length === 1) {
          roomListText = `votre chambre "${fetchedUserRooms[0].room_name}"`;
          setSelectedRoomForBlocking(fetchedUserRooms[0]);
          setConversationMode('block_room_awaiting_dates');
        } else {
          roomListText = `vos chambres : ${fetchedUserRooms.map(r => r.room_name).join(', ')}`;
          setConversationMode('block_room_awaiting_room_selection');
        }
        
        setMessages((prev) => [
          ...prev,
          { 
            id: Date.now().toString() + '-ai-block-prompt', 
            sender: 'ai', 
            text: `D'accord. Pour bloquer un logement, je peux vous aider à vérifier les disponibilités pour ${roomListText}. Vous pouvez me donner les dates directement (ex: 'du 01/01/2025 au 05/01/2025 avec ménage'), ou bien cliquer sur le bouton ci-dessous pour ouvrir le calendrier et gérer vos réservations.` 
          },
          {
            id: Date.now().toString() + '-ai-button',
            sender: 'ai',
            text: '', // Empty text, as it's a button message
            parsedData: { action: 'open_calendar_dialog' }
          }
        ]);
      }
    } else if (actionType === 'general_question') {
      setConversationMode('chat');
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + '-ai-prompt', sender: 'ai', text: "Je suis prêt à répondre à vos questions. Que souhaitez-vous savoir ?" }
      ]);
    }
    setIsThinking(false);
  };

  const renderMessageContent = (message: ChatMessage) => {
    if (message.sender === 'ai' && message.parsedData?.action === 'open_calendar_dialog') {
      return (
        <Button 
          onClick={() => {
            onOpenChange(false); // Close AI dialog
            navigate('/calendar', { state: { openOwnerReservationDialog: true } });
          }}
          className="w-full mt-2"
        >
          <CalendarDays className="h-4 w-4 mr-2" />
          Ouvrir le calendrier
        </Button>
      );
    }
    return message.text;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[60vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
            Assistant IA
          </DialogTitle>
          <DialogDescription>
            Posez-moi des questions sur la gestion de votre logement ou initiez une action.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow p-4 border rounded-md bg-gray-50 dark:bg-gray-800 text-sm leading-relaxed h-[calc(100%-120px)]">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={cn(
                    'max-w-[80%] p-3 rounded-lg',
                    msg.sender === 'user'
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-tl-none'
                  )}
                >
                  {renderMessageContent(msg)}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  L'IA réfléchit...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <DialogFooter className="flex-row items-center gap-2 pt-4">
          {conversationMode === 'initial' ? (
            <div className="flex flex-col w-full space-y-2">
              <Button onClick={() => handleInitialAction('block_room')} disabled={isThinking} className="w-full">
                <CalendarDays className="h-4 w-4 mr-2" />
                Bloquer mon logement
              </Button>
              <Button onClick={() => handleInitialAction('general_question')} disabled={isThinking} variant="outline" className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Poser une question générale
              </Button>
            </div>
          ) : (
            <>
              <Input
                placeholder="Tapez votre message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isThinking}
                className="flex-grow"
              />
              <Button onClick={handleSendMessage} disabled={isThinking || input.trim() === ''}>
                <Send className="h-4 w-4" />
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AICopilotDialog;
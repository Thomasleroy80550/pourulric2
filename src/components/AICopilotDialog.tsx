import React, { useState, useRef, useEffect } from 'react';
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
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parse, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils'; // Importation ajoutée

interface AICopilotDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  parsedData?: any; // To store structured data if AI parses it
}

const AICopilotDialog: React.FC<AICopilotDialogProps> = ({ isOpen, onOpenChange }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMessages([{ id: 'ai-welcome', sender: 'ai', text: "Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider aujourd'hui ?" }]);
      setInput('');
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const parseUserCommand = (command: string) => {
    const lowerCommand = command.toLowerCase();
    let responseText = "Désolé, je n'ai pas compris votre demande. Pouvez-vous reformuler ?";
    let parsedData = null;

    // Regex for "bloquer mon logement du DD/MM/YYYY au DD/MM/YYYY avec/sans ménage"
    const blockRoomRegex = /bloquer mon logement du (\d{2}\/\d{2}\/\d{4}) au (\d{2}\/\d{2}\/\d{4})( avec ménage| sans ménage)?/;
    const match = lowerCommand.match(blockRoomRegex);

    if (match) {
      const startDateStr = match[1];
      const endDateStr = match[2];
      const cleaningPreference = match[3] ? match[3].trim() : '';

      const startDate = parse(startDateStr, 'dd/MM/yyyy', new Date());
      const endDate = parse(endDateStr, 'dd/MM/yyyy', new Date());

      if (isValid(startDate) && isValid(endDate)) {
        const formattedStartDate = format(startDate, 'dd MMMM yyyy', { locale: fr });
        const formattedEndDate = format(endDate, 'dd MMMM yyyy', { locale: fr });
        const cleaningText = cleaningPreference === 'avec ménage' ? 'avec ménage' : 'sans ménage';

        responseText = `J'ai compris que vous souhaitez bloquer votre logement du ${formattedStartDate} au ${formattedEndDate} ${cleaningText}.`;
        responseText += `\n\nPour effectuer cette action, veuillez vous rendre sur la page "Calendrier" et utiliser le bouton "Réservation Propriétaire".`;
        
        parsedData = {
          action: 'block_room',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          cleaning: cleaningPreference === 'avec ménage',
        };
      } else {
        responseText = "Les dates fournies ne sont pas valides. Veuillez utiliser le format JJ/MM/AAAA.";
      }
    } else if (lowerCommand.includes("bonjour") || lowerCommand.includes("salut")) {
      responseText = "Bonjour ! Comment puis-je vous assister ?";
    } else if (lowerCommand.includes("aide") || lowerCommand.includes("help")) {
      responseText = "Je peux vous aider à bloquer des dates pour votre logement. Essayez une phrase comme : 'Bloquer mon logement du 01/01/2025 au 05/01/2025 avec ménage'.";
    }

    return { text: responseText, data: parsedData };
  };

  const handleSendMessage = async () => {
    if (input.trim() === '') return;

    const newUserMessage: ChatMessage = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages((prev) => [...prev, newUserMessage]);
    setInput('');
    setIsThinking(true);

    // Simulate AI processing time
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const aiResponse = parseUserCommand(newUserMessage.text);
    const newAiMessage: ChatMessage = { id: Date.now().toString() + '-ai', sender: 'ai', text: aiResponse.text, parsedData: aiResponse.data };
    setMessages((prev) => [...prev, newAiMessage]);
    setIsThinking(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isThinking) {
      handleSendMessage();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] flex flex-col h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
            Assistant IA
          </DialogTitle>
          <DialogDescription>
            Posez-moi des questions sur la gestion de votre logement.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow p-4 border rounded-md bg-gray-50 dark:bg-gray-800 text-sm leading-relaxed">
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
                  {msg.text}
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportProblemDialog;
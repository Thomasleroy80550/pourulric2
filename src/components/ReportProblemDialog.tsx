import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client

// Define the shape of the booking data that will be passed to the dialog
interface BookingData {
  id: string;
  guest_name: string;
  property_name: string;
  email?: string;
  phone?: string;
}

interface ReportProblemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingData | null; // The booking for which the problem is reported
  onReportSubmitted: () => void; // Callback after successful submission
}

const problemTypes = [
  { value: 'damage', label: 'Dégâts matériels' },
  { value: 'guest_behavior', label: 'Comportement du client' },
  { value: 'payment_issue', label: 'Problème de paiement' },
  { value: 'cleaning_issue', label: 'Problème de ménage' },
  { value: 'other', label: 'Autre' },
];

const formSchema = z.object({
  problemType: z.string().min(1, { message: 'Veuillez sélectionner un type de problème.' }),
  description: z.string().min(10, { message: 'Veuillez décrire le problème (minimum 10 caractères).' }).max(500, { message: 'La description est trop longue (maximum 500 caractères).' }),
  contactEmail: z.string().email({ message: 'Email invalide.' }).min(1, { message: 'Veuillez fournir une adresse email.' }), // Email is now required
});

const REPORT_PROBLEM_PROXY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/report-problem-proxy";
const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/f04cgbxaplh9biuskxcj13vppe32ca5a"; // <-- URL du webhook Make.com

const ReportProblemDialog: React.FC<ReportProblemDialogProps> = ({
  isOpen,
  onOpenChange,
  booking,
  onReportSubmitted,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      problemType: '',
      description: '',
      contactEmail: booking?.email || '', // Pre-fill with booking email if available
    },
  });

  // Reset form when dialog opens or booking changes
  React.useEffect(() => {
    if (isOpen && booking) {
      form.reset({
        problemType: '',
        description: '',
        contactEmail: booking.email || '',
      });
    }
  }, [isOpen, booking, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!booking) {
      toast.error("Aucune réservation sélectionnée pour le signalement.");
      return;
    }

    try {
      // Step 1: Submit report to Supabase Edge Function (for database storage)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("Vous devez être connecté pour signaler un problème.");
      }

      const supabasePayload = {
        user_id: session.user.id, // Ensure user_id is passed
        reservation_id: booking.id,
        problem_type: values.problemType,
        description: values.description,
        contact_email: values.contactEmail,
        contact_phone: booking.phone || null, // Keep phone for DB if it exists on booking, but not in form
      };

      const supabaseResponse = await fetch(REPORT_PROBLEM_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(supabasePayload),
      });

      const supabaseData = await supabaseResponse.json();

      if (!supabaseResponse.ok) {
        throw new Error(supabaseData.error || "Erreur inconnue lors de l'enregistrement du signalement.");
      }

      // Step 2: Send data to Make.com webhook for email
      const makePayload = {
        reservation_id: booking.id,
        problem_type: values.problemType,
        description: values.description,
        contact_email: values.contactEmail,
        contact_phone: booking.phone || '', // Pass phone from booking if available
        guest_name: booking.guest_name,
        property_name: booking.property_name,
        user_email: session.user.email, // User's email from session
      };

      const makeResponse = await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makePayload),
      });

      if (!makeResponse.ok) {
        const errorText = await makeResponse.text();
        console.error("Error sending data to Make.com webhook:", makeResponse.status, errorText);
        toast.warning("Signalement enregistré, mais l'e-mail de notification n'a pas pu être envoyé via Make.com.");
      } else {
        toast.success("Signalement envoyé avec succès !");
      }
      
      onReportSubmitted(); // Trigger callback to refresh/close
      onOpenChange(false); // Close dialog
    } catch (error: any) {
      toast.error(`Erreur lors de l'envoi du signalement : ${error.message}`);
      console.error("Error submitting report:", error);
    }
  };

  if (!booking) {
    return null; // Don't render if no booking is provided
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Signaler un problème pour la réservation</DialogTitle>
          <DialogDescription>
            Veuillez décrire le problème rencontré avec la réservation de <span className="font-semibold">{booking.guest_name}</span> pour <span className="font-semibold">{booking.property_name}</span> (ID: {booking.id}).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="problemType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de problème</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type de problème" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {problemTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description du problème</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez le problème en détail..."
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email de contact</FormLabel> {/* Label changed */}
                  <FormControl>
                    <Input type="email" placeholder="votre.email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Removed Phone Field */}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  'Envoyer le signalement'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportProblemDialog;
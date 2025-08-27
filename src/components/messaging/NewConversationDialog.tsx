import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createConversation } from "@/lib/messaging-api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const formSchema = z.object({
  subject: z.string().min(5, { message: "Le sujet doit contenir au moins 5 caractères." }),
  content: z.string().min(10, { message: "Le message doit contenir au moins 10 caractères." }),
});

interface NewConversationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const NewConversationDialog = ({ isOpen, onOpenChange }: NewConversationDialogProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => createConversation(values.subject, values.content),
    onSuccess: (data) => {
      toast.success("Conversation créée avec succès !");
      queryClient.invalidateQueries({ queryKey: ['myConversations'] });
      onOpenChange(false);
      navigate(`/messages/${data.id}`);
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Démarrer une nouvelle conversation</DialogTitle>
          <DialogDescription>
            Posez votre question à notre équipe. Nous vous répondrons dès que possible.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="subject">Sujet</Label>
            <Input id="subject" {...register("subject")} />
            {errors.subject && <p className="text-red-500 text-sm">{errors.subject.message}</p>}
          </div>
          <div>
            <Label htmlFor="content">Message</Label>
            <Textarea id="content" {...register("content")} rows={5} />
            {errors.content && <p className="text-red-500 text-sm">{errors.content.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Envoi..." : "Envoyer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewConversationDialog;
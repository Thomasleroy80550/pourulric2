import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Review } from "@/lib/revyoos-api";
import { submitReviewReply, ReviewReply } from "@/lib/review-replies-api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const replySchema = z.object({
  reply_content: z.string().min(10, "La réponse doit contenir au moins 10 caractères.").max(1000, "La réponse ne peut pas dépasser 1000 caractères."),
});

interface ReplyReviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  review: Review | null;
  existingReply?: ReviewReply;
  onSuccess: () => void;
}

export function ReplyReviewDialog({ isOpen, onOpenChange, review, existingReply, onSuccess }: ReplyReviewDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const form = useForm<z.infer<typeof replySchema>>({
    resolver: zodResolver(replySchema),
    defaultValues: {
      reply_content: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        reply_content: existingReply?.reply_content || "",
      });
    }
  }, [isOpen, existingReply, form]);

  const onSubmit = async (values: z.infer<typeof replySchema>) => {
    if (!review) return;
    setIsSubmitting(true);
    try {
      await submitReviewReply(review.id, values.reply_content);
      toast.success("Votre réponse a été soumise pour approbation.");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!review) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Répondre à l'avis de {review.author}</DialogTitle>
          <DialogDescription>
            Votre réponse sera examinée par un administrateur avant d'être publiée.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="p-3 border rounded-md bg-muted/50 max-h-24 overflow-y-auto">
              <p className="text-sm font-medium">Avis original :</p>
              <blockquote className="text-sm text-muted-foreground italic" dangerouslySetInnerHTML={{ __html: `"${review.comment}"` }} />
            </div>
            <FormField
              control={form.control}
              name="reply_content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Votre réponse</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Rédigez votre réponse ici..."
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Annuler
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Envoi..." : "Soumettre la réponse"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
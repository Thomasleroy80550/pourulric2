import { useState } from 'react';
import { Code2, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/components/SessionContextProvider';

export default function ReviewsEmbedPanel() {
  const { profile } = useSession();
  const [open, setOpen] = useState(false);
  const url = `${window.location.origin}/embed/avis`;
  const code = `<iframe src="${url}" title="Avis clients Hello Keys" width="100%" height="560" style="border:0;border-radius:24px;" loading="lazy"></iframe>`;

  if (profile?.role !== 'admin') return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code d’intégration copié !');
    } catch {
      toast.error('Copie impossible. Sélectionnez le code ci-dessous pour le copier.');
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><Code2 className="h-5 w-5" /> Avis sur votre site vitrine</CardTitle>
          <CardDescription className="mt-1">Tous les avis du service : total, moyenne et sélection favorable, sans dates.</CardDescription>
        </div>
        <Button variant="outline" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? 'Masquer le code' : 'Obtenir le code embed'}
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Collez ce code dans un bloc HTML de votre site. La moyenne utilise tous les avis ; seuls les commentaires notés au moins 4/5 défilent. Utilisez l’adresse de votre application publiée, et non celle de l’aperçu de développement.</p>
          <Textarea aria-label="Code HTML à intégrer" readOnly value={code} onFocus={(event) => event.target.select()} className="min-h-24 font-mono text-xs" />
          <div className="flex flex-wrap gap-2">
            <Button onClick={copy}><Copy className="mr-2 h-4 w-4" /> Copier le code</Button>
            <Button asChild variant="outline"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> Voir le widget</a></Button>
          </div>
          <iframe src={url} title="Aperçu du widget d’avis clients" className="h-[560px] w-full rounded-3xl border" loading="lazy" />
        </CardContent>
      )}
    </Card>
  );
}

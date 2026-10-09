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
  const code = `<iframe src="${url}" title="Avis clients Hello Keys" width="360" height="104" style="border:0;width:100%;max-width:360px;height:104px;background:transparent;" loading="eager"></iframe>`;

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
          <CardTitle className="flex items-center gap-2 text-base"><Code2 className="h-5 w-5" /> Badge d’avis pour le hero</CardTitle>
          <CardDescription className="mt-1">Un badge minimal : note globale sur 10 et total d’avis clients.</CardDescription>
        </div>
        <Button variant="outline" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? 'Masquer le code' : 'Obtenir le code embed'}
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Placez ce badge près de votre bouton « Contactez-nous » dans le hero. Format compact de 360 × 104 px, adapté au mobile. La note globale inclut toutes les notes valides et le total inclut tous les avis, avec actualisation toutes les 30 secondes depuis les données enregistrées. Copiez le code depuis votre application publiée.</p>
          <Textarea aria-label="Code HTML à intégrer" readOnly value={code} onFocus={(event) => event.target.select()} className="min-h-24 font-mono text-xs" />
          <div className="flex flex-wrap gap-2">
            <Button onClick={copy}><Copy className="mr-2 h-4 w-4" /> Copier le code</Button>
            <Button asChild variant="outline"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> Voir le badge</a></Button>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-teal-900 p-4 sm:p-6">
            <p className="mb-3 text-xs text-white/60">Aperçu sur un fond de hero</p>
            <iframe src={url} title="Aperçu du badge d’avis clients" className="h-[104px] w-full max-w-[360px] border-0 bg-transparent" loading="lazy" />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

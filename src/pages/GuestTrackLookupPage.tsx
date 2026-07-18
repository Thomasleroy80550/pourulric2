import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ClipboardList } from 'lucide-react';

type Lang = 'fr' | 'en';

const t = {
  fr: {
    title: 'Suivre un signalement',
    desc: 'Saisissez la référence reçue lors de votre signalement.',
    label: 'Référence',
    placeholder: 'Ex. A1B2C3D4',
    submit: 'Consulter',
    error: 'Veuillez saisir une référence valide (au moins 6 caractères).',
  },
  en: {
    title: 'Track a report',
    desc: 'Enter the reference you received when you submitted your report.',
    label: 'Reference',
    placeholder: 'e.g. A1B2C3D4',
    submit: 'View status',
    error: 'Please enter a valid reference (at least 6 characters).',
  },
};

const GuestTrackLookupPage = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>(
    typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('fr')
      ? 'fr'
      : 'en',
  );
  const [ref, setRef] = useState('');
  const [error, setError] = useState(false);

  const tr = t[lang];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = ref.trim().replace(/[^a-zA-Z0-9-]/g, '');
    if (clean.replace(/-/g, '').length < 6) {
      setError(true);
      return;
    }
    navigate(`/signalement/${clean}`);
  };

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-10 flex justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
          <div className="flex overflow-hidden rounded-lg border text-sm">
            <button
              type="button"
              onClick={() => setLang('fr')}
              className={`px-3 py-1.5 font-medium transition-colors ${
                lang === 'fr' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 font-medium transition-colors ${
                lang === 'en' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {tr.title}
            </CardTitle>
            <CardDescription>{tr.desc}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{tr.label}</label>
                <Input
                  value={ref}
                  onChange={(e) => {
                    setRef(e.target.value);
                    setError(false);
                  }}
                  placeholder={tr.placeholder}
                  className="font-mono uppercase tracking-wider"
                />
                {error && <p className="text-sm text-destructive">{tr.error}</p>}
              </div>
              <Button type="submit" className="w-full">
                <Search className="mr-2 h-4 w-4" />
                {tr.submit}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GuestTrackLookupPage;

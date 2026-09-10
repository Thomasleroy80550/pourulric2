import React, { useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';
import { updateProfile } from '@/lib/profile-api';
import {
  FileCheck2,
  CalendarDays,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  IdCard,
  FileText,
  Landmark,
  Globe,
  Send,
  ShieldCheck,
} from 'lucide-react';

const HousingRegistrationPage: React.FC = () => {
  const { profile } = useSession();
  const [regNumber, setRegNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedNumber, setSavedNumber] = useState<string | null>(profile?.housing_registration_number ?? null);

  const trimmed = regNumber.trim().toUpperCase();
  const isValid = trimmed.length === 13;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    try {
      await updateProfile({ housing_registration_number: trimmed });
      setSavedNumber(trimmed);
      setRegNumber('');
      toast.success('Merci ! Votre numéro d\'enregistrement a bien été transmis. 🎉');
    } catch (err: any) {
      toast.error(err?.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6 max-w-4xl space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-sky-700 to-blue-900 text-white p-8 shadow-xl">
          <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-white/10 blur-xl" />
          <div className="relative flex items-start gap-5">
            <div className="hidden sm:flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/30 shadow-lg">
              <FileCheck2 className="h-8 w-8" />
            </div>
            <div>
              <Badge className="bg-white/15 text-white ring-1 ring-white/30 mb-2" variant="secondary">
                Nouvelle réglementation
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Numéro d'enregistrement national
              </h1>
              <p className="mt-2 text-white/85 text-sm sm:text-base leading-relaxed">
                Meublés de tourisme — une démarche personnelle et obligatoire pour chaque propriétaire.
              </p>
            </div>
          </div>
        </div>

        {/* Dates clés */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-sky-600">
            <CardContent className="pt-6 flex items-center gap-4">
              <CalendarDays className="h-9 w-9 text-sky-600 shrink-0" />
              <div>
                <p className="text-lg font-bold">3 novembre 2026</p>
                <p className="text-sm text-muted-foreground">Début de la procédure d'enregistrement national</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-6 flex items-center gap-4">
              <Clock className="h-9 w-9 text-amber-500 shrink-0" />
              <div>
                <p className="text-lg font-bold">8 mois</p>
                <p className="text-sm text-muted-foreground">Délai pour réaliser la démarche</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Explication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-sky-600" />
              En quoi consiste cette démarche ?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              À compter du <strong className="text-foreground">3 novembre 2026</strong>, chaque propriétaire devra
              effectuer <strong className="text-foreground">personnellement</strong> les démarches nécessaires afin
              d'obtenir le <strong className="text-foreground">numéro d'enregistrement national</strong> de son meublé
              de tourisme.
            </p>
            <p>
              Vous disposerez d'un délai de <strong className="text-foreground">8 mois</strong> pour réaliser cette
              procédure.
            </p>

            <div>
              <p className="font-semibold text-foreground mb-3">À préparer avant votre demande :</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-2 rounded-xl border bg-muted/40 p-4 text-center">
                  <IdCard className="h-6 w-6 text-sky-600" />
                  <p className="text-xs font-medium text-foreground">Pièce d'identité</p>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-xl border bg-muted/40 p-4 text-center">
                  <FileText className="h-6 w-6 text-sky-600" />
                  <p className="text-xs font-medium text-foreground">Votre déclaration</p>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-xl border bg-muted/40 p-4 text-center">
                  <Landmark className="h-6 w-6 text-sky-600" />
                  <p className="text-xs font-medium text-foreground">Identifiants fiscaux</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 p-3 text-sm text-sky-800 dark:text-sky-200">
              <Globe className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Une démarche sera également à effectuer sur le site{' '}
                <strong>« Gérer mon meublé »</strong>.
              </p>
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Cette procédure est à réaliser <strong>directement par le propriétaire</strong> et ne pourra pas être
                effectuée par la conciergerie.
              </AlertDescription>
            </Alert>

            <p>
              Une fois votre numéro d'enregistrement obtenu, merci de nous le transmettre ci-dessous afin que nous
              puissions mettre à jour les informations de votre logement sur nos différents outils et plateformes de
              réservation.
            </p>
            <p className="italic">— L'équipe de la conciergerie</p>
          </CardContent>
        </Card>

        {/* Transmission du numéro */}
        <Card className={savedNumber ? 'border-green-300 dark:border-green-800' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-sky-600" />
              Transmettre mon numéro d'enregistrement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {savedNumber ? (
              <div className="flex items-center gap-3 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 p-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-200">Numéro transmis ✅</p>
                  <p className="font-mono text-lg tracking-widest text-green-700 dark:text-green-300">{savedNumber}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Besoin de le corriger ? Contactez-nous via vos tickets.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <Input
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                    maxLength={13}
                    placeholder="Votre numéro (13 caractères)"
                    disabled={saving}
                    className={`h-14 text-center font-mono text-lg tracking-[0.35em] pr-10 rounded-xl border-2 transition-colors ${
                      isValid
                        ? 'border-green-500 focus-visible:ring-green-500/30'
                        : 'focus-visible:ring-sky-500/30 focus-visible:border-sky-600'
                    }`}
                  />
                  {isValid && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isValid ? 'bg-green-500' : 'bg-gradient-to-r from-sky-500 to-blue-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.round((trimmed.length / 13) * 100))}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium tabular-nums ${isValid ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {trimmed.length}/13
                  </span>
                </div>
                <Button
                  type="submit"
                  disabled={!isValid || saving}
                  className="w-full h-11 rounded-xl font-semibold bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 shadow-lg shadow-blue-500/25"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Transmettre mon numéro
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default HousingRegistrationPage;

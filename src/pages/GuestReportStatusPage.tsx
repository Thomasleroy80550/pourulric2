import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  Inbox,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

const GUEST_PORTAL_URL =
  'https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/guest-logement-portal';
const SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRramFlanp3bW13d3pob2twYmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MTQwMjAsImV4cCI6MjA2NDk5MDAyMH0.aTOtiL49-BYCyO4K3Bek37i5XQD3fWzim59j9fEMtJs';

type Lang = 'fr' | 'en';

interface ReportStatus {
  id: string;
  title: string;
  status: string;
  created_at: string;
  property_name: string;
  owner_response: string | null;
  resolved_at: string | null;
}

const t = {
  fr: {
    title: 'Suivi de votre signalement',
    reference: 'Référence',
    property: 'Logement',
    createdAt: 'Envoyé le',
    ownerResponse: 'Réponse de votre hôte',
    refresh: 'Actualiser',
    back: 'Retour',
    notFoundTitle: 'Signalement introuvable',
    notFoundDesc: "Cette référence n'existe pas ou n'est plus valide.",
    statuses: {
      pending_owner_action: 'Reçu, en attente de traitement',
      admin_will_manage: 'Pris en charge',
      owner_will_manage: 'Pris en charge par votre hôte',
      resolved: 'Résolu',
      archived: 'Clôturé',
    } as Record<string, string>,
  },
  en: {
    title: 'Track your report',
    reference: 'Reference',
    property: 'Property',
    createdAt: 'Sent on',
    ownerResponse: 'Reply from your host',
    refresh: 'Refresh',
    back: 'Back',
    notFoundTitle: 'Report not found',
    notFoundDesc: 'This reference does not exist or is no longer valid.',
    statuses: {
      pending_owner_action: 'Received, awaiting handling',
      admin_will_manage: 'Being handled',
      owner_will_manage: 'Being handled by your host',
      resolved: 'Resolved',
      archived: 'Closed',
    } as Record<string, string>,
  },
};

const STEP_ORDER = ['pending_owner_action', 'admin_will_manage', 'resolved'];

async function callPortal(payload: Record<string, unknown>) {
  const response = await fetch(GUEST_PORTAL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({ error: 'Server error.' }));
  if (!response.ok) {
    throw new Error(data.error || 'An error occurred.');
  }
  return data;
}

const GuestReportStatusPage = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [lang, setLang] = useState<Lang>(
    typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('fr')
      ? 'fr'
      : 'en',
  );
  const [report, setReport] = useState<ReportStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const tr = t[lang];

  const load = async () => {
    if (!reportId) {
      setError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await callPortal({ action: 'status', report_id: reportId });
      setReport(data.report);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const isResolved = report?.status === 'resolved' || report?.status === 'archived';
  const currentStepIndex = report
    ? report.status === 'resolved' || report.status === 'archived'
      ? 2
      : report.status === 'pending_owner_action'
        ? 0
        : 1
    : 0;

  const shortRef = (report?.id || reportId || '').replace(/-/g, '').slice(0, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-10 flex justify-center">
      <div className="w-full max-w-lg space-y-6">
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

        {loading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ) : error || !report ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {tr.notFoundTitle}
              </CardTitle>
              <CardDescription>{tr.notFoundDesc}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{tr.title}</CardTitle>
              <CardDescription>{report.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">{tr.reference}</p>
                  <p className="font-mono text-lg font-bold">#{shortRef}</p>
                </div>
                <div
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    isResolved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {tr.statuses[report.status] || report.status}
                </div>
              </div>

              {/* Timeline style Uber */}
              <div className="space-y-0">
                {STEP_ORDER.map((step, index) => {
                  const done = index <= currentStepIndex;
                  const isLast = index === STEP_ORDER.length - 1;
                  const Icon = index === 0 ? Inbox : index === 1 ? Wrench : CheckCircle2;
                  return (
                    <div key={step} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                            done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        {!isLast && (
                          <div
                            className={`h-8 w-0.5 ${index < currentStepIndex ? 'bg-primary' : 'bg-muted'}`}
                          />
                        )}
                      </div>
                      <div className={`pb-6 pt-1.5 ${done ? '' : 'opacity-50'}`}>
                        <p className="text-sm font-medium">{tr.statuses[step]}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {report.owner_response && (
                <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
                  <p className="mb-1 text-sm font-semibold text-sky-900">{tr.ownerResponse}</p>
                  <p className="text-sm text-sky-950">{report.owner_response}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{tr.property}</p>
                  <p className="font-medium">{report.property_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{tr.createdAt}</p>
                  <p className="font-medium">
                    {new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(report.created_at))}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={load}>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  {tr.refresh}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <Button variant="link" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {tr.back}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GuestReportStatusPage;

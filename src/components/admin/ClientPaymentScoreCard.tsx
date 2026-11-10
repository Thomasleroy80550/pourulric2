import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchClientPaymentScore, type PaymentScore } from '@/lib/payment-score-api';

function dateLabel(value: string | null) {
  return value ? new Date(`${value}T00:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : '—';
}

export default function ClientPaymentScoreCard({ userId }: { userId: string }) {
  const [result, setResult] = useState<{ userId: string; data: PaymentScore } | null>(null);
  const [failure, setFailure] = useState<{ userId: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setResult(null);
    setFailure(null);
    fetchClientPaymentScore(userId).then(data => {
      if (active) setResult({ userId, data });
    }).catch(error => {
      if (active) setFailure({ userId, message: error instanceof Error ? error.message : 'Chargement impossible.' });
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, refresh]);

  const data = result?.userId === userId ? result.data : null;
  const error = failure?.userId === userId ? failure.message : null;
  const waiting = loading || (!data && !error);
  const color = data?.score === null || !data ? 'text-muted-foreground'
    : data.score >= 80 ? 'text-emerald-600' : data.score >= 60 ? 'text-amber-600' : 'text-rose-600';

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Ponctualité de paiement</CardTitle>
          <p className="text-sm text-muted-foreground">Pennylane · 12 mois glissants · Réservé aux administrateurs</p>
        </div>
        <Button variant="outline" size="sm" disabled={waiting} onClick={() => setRefresh(value => value + 1)}>
          <RefreshCw className="mr-2 h-4 w-4" />Actualiser
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {waiting && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Lecture des factures et des règlements rapprochés…</p>}
        {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Score indisponible</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        {data && <>
          <p className="text-sm text-muted-foreground">{data.customerName} · {data.agency} · Échéances du {dateLabel(data.periodStart)} au {dateLabel(data.today)}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Score de ponctualité</p>
              <p className={`mt-1 text-3xl font-bold ${color}`}>{data.score === null ? 'Non calculable' : `${data.score} / 100`}</p>
              {data.score !== null && <Badge className="mt-2" variant="outline">{data.provisional ? 'Provisoire' : 'Historique exploitable'}</Badge>}
            </div>
            <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Sans retard</p><p className="mt-1 text-2xl font-semibold">{data.onTimeRate === null ? '—' : `${data.onTimeRate} %`}</p><p className="text-xs text-muted-foreground">{data.eligibleCount} factures prises en compte</p></div>
            <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Retard moyen des factures en retard</p><p className="mt-1 text-2xl font-semibold">{data.averageLateDays} jours</p><p className="text-xs text-muted-foreground">Maximum : {data.maxLateDays} jours</p></div>
            <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Encore échues et non soldées</p><p className="mt-1 text-2xl font-semibold text-rose-600">{data.overdueCount}</p><p className="text-xs text-muted-foreground">{data.lateCount} factures en retard au total</p></div>
          </div>
          {(data.provisional || data.score === null) && <Alert><AlertCircle className="h-4 w-4" /><AlertTitle>{data.score === null ? 'Historique insuffisant' : 'Score à interpréter avec prudence'}</AlertTitle><AlertDescription>{data.eligibleCount < 3 && 'Moins de 3 factures exploitables. '}{data.excludedCount > 0 && `${data.excludedCount} facture(s) exclue(s) faute de données fiables ou nécessitant une validation. `}Une donnée manquante n’est jamais considérée comme un paiement à temps.</AlertDescription></Alert>}
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer text-sm font-medium">Méthode et détail des factures ({data.rows.length})</summary>
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">Score = 60 × proportion de factures sans retard + 40 × (1 − moyenne des retards plafonnés à 60 jours / 60). Chaque facture a le même poids. Les paiements à l’échéance ou anticipés ont 0 jour de retard.</p>
              {data.score !== null && <p className="text-sm">Ponctualité : {data.punctualityPoints} / 60 · Durée : {data.durationPoints} / 40 · Total arrondi : {data.score} / 100.</p>}
              <p className="text-sm text-muted-foreground">Pour une facture soldée, la date retenue est celle de la dernière transaction bancaire rapprochée dans Pennylane (un virement groupé couvrant plusieurs factures est accepté). Les factures soldées sans transaction rapprochée, associées à un avoir ou partiellement annulées sont exclues. Les anciens impayés encore échus restent pris en compte, même si leur échéance dépasse 12 mois. Les factures non échues et les documents annulés, brouillons ou avoirs ne sont pas notés.</p>
              {data.rows.length === 0 ? <p className="text-sm text-muted-foreground">Aucune facture éligible sur cette période.</p> : <Table>
                <TableHeader><TableRow><TableHead>Facture</TableHead><TableHead>Montant TTC (€)</TableHead><TableHead>Échéance</TableHead><TableHead>Dernier règlement rapproché</TableHead><TableHead>Retard</TableHead><TableHead>Prise en compte</TableHead></TableRow></TableHeader>
                <TableBody>{data.rows.map(row => <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.number || `#${row.id}`}</TableCell>
                  <TableCell>{Number(row.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>{dateLabel(row.deadline)}</TableCell>
                  <TableCell>{dateLabel(row.paymentDate)}</TableCell>
                  <TableCell>{row.delayDays === null ? '—' : `${row.delayDays} j`}</TableCell>
                  <TableCell>{row.state === 'excluded' ? <span className="text-xs text-muted-foreground">Exclue : {row.reason}</span> : <Badge variant={row.delayDays! > 0 ? 'destructive' : 'secondary'}>{row.state === 'overdue' ? 'Non soldée' : row.delayDays! > 0 ? 'Payée en retard' : 'Payée à temps'}</Badge>}</TableCell>
                </TableRow>)}</TableBody>
              </Table>}
            </div>
          </details>
          <p className="text-xs text-muted-foreground">Calculé le {new Date(data.calculatedAt).toLocaleString('fr-FR')} · Indicateur de suivi uniquement, sans suspension automatique.</p>
        </>}
      </CardContent>
    </Card>
  );
}

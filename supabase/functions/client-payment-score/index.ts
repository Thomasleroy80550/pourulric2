import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { calculatePaymentScore, makeScoreRow, scorePeriodStart, validDate, type ScoreInvoice, type ScoreRow } from '../_shared/payment-score.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const API = 'https://app.pennylane.com/api/external/v2';

interface Invoice extends ScoreInvoice {
  customer: { id: number } | null;
  credited_invoice: { id: number } | null;
}
interface Customer { id: number; external_reference: string; name: string }
interface Transaction {
  id: number;
  date: string;
  archived_at: string | null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Authentification requise.' }, 401);
    const auth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await auth.auth.getUser(authHeader.slice(7));
    if (authError || !user) return json({ error: 'Session invalide.' }, 401);
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: isAdmin, error: roleError } = await admin.rpc('is_admin', { user_id: user.id });
    if (roleError) throw new Error('Impossible de vérifier les droits administrateur.');
    if (isAdmin !== true) return json({ error: 'Accès réservé aux administrateurs.' }, 403);

    const body = await req.json().catch(() => null);
    if (typeof body?.userId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.userId)) {
      return json({ error: 'Identifiant client invalide.' }, 400);
    }
    const { data: profile, error: profileError } = await admin.from('profiles')
      .select('agency,pennylane_customer_id').eq('id', body.userId).single();
    if (profileError || !profile) return json({ error: 'Client introuvable.' }, 404);
    const reference = profile.pennylane_customer_id?.trim();
    if (!reference) return json({ error: 'Identifiant client Pennylane absent du profil.' }, 422);
    const secretName = profile.agency === 'Baie de somme' ? 'PENNYLANE_SCORE_API_KEY_BAIE'
      : profile.agency === "Côte d'opal" ? 'PENNYLANE_SCORE_API_KEY_BERCK' : null;
    if (!secretName) return json({ error: 'Agence du client non configurée : choisissez Baie de somme ou Côte d’opal dans son profil.' }, 422);
    const key = Deno.env.get(secretName)?.trim();
    if (!key) return json({ error: `Connexion à configurer : ajoutez le secret ${secretName} avec un jeton entreprise Pennylane API v2, permissions customers:readonly et customer_invoices:readonly.` }, 422);

    const contextResponse = await fetch(`${API}/me`, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!contextResponse.ok) throw new Error(`Vérifiez le jeton entreprise API v2 ${secretName}.`);
    const context = await contextResponse.json();
    const companyName = typeof context.company?.name === 'string' ? context.company.name : '';
    const normalizedName = companyName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const expectedName = profile.agency === 'Baie de somme' ? 'HELLOKEYS' : 'HELLOKEYSCOTEDOPALE';
    if (normalizedName !== expectedName) {
      return json({ error: `Le jeton ${secretName} ne correspond pas à la société attendue pour cette agence. Utilisez un jeton entreprise HELLO KEYS ou HELLO KEYS CÔTE D’OPALE selon l’agence.` }, 422);
    }

    async function listAll<T>(path: string, filter?: unknown[]): Promise<T[]> {
      const items: T[] = [];
      const seenCursors = new Set<string>();
      let cursor: string | null = null;
      do {
        const params = new URLSearchParams({ limit: '100' });
        if (filter) params.set('filter', JSON.stringify(filter));
        if (cursor) params.set('cursor', cursor);
        const response = await fetch(`${API}/${path}?${params}`, {
          headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) {
          console.warn('[client-payment-score] Pennylane request rejected', { status: response.status, path });
          if (response.status === 401 || response.status === 403) throw new Error(`Vérifiez le jeton ${secretName} et ses permissions de lecture API v2.`);
          if (response.status === 429) throw new Error('Limite Pennylane atteinte. Réessayez dans quelques instants.');
          throw new Error(`Pennylane indisponible (HTTP ${response.status}). Aucun score calculé.`);
        }
        const page = await response.json();
        if (!Array.isArray(page.items) || typeof page.has_more !== 'boolean') throw new Error('Réponse Pennylane inattendue. Aucun score calculé.');
        items.push(...page.items);
        if (!page.has_more) break;
        if (typeof page.next_cursor !== 'string' || !page.next_cursor || seenCursors.has(page.next_cursor) || items.length > 10000) {
          throw new Error('Historique Pennylane incomplet ou trop volumineux. Aucun score calculé.');
        }
        cursor = page.next_cursor;
        seenCursors.add(cursor);
      } while (cursor);
      return items;
    }

    // Le profil existant contient le source_id v1, devenu external_reference en v2.
    // Ne pas l'utiliser comme un ID interne v2 : cela pourrait sélectionner un autre client.
    const customers = await listAll<Customer>('customers', [{ field: 'external_reference', operator: 'eq', value: reference }]);
    if (customers.length !== 1 || !Number.isSafeInteger(customers[0].id)) {
      return json({ error: 'Correspondance client Pennylane introuvable ou ambiguë. Vérifiez que l’identifiant du profil est la référence externe (source_id v1), et que le jeton appartient à la bonne société.' }, 422);
    }
    const customer = customers[0];
    const invoices = await listAll<Invoice>('customer_invoices', [{ field: 'customer_id', operator: 'eq', value: customer.id }]);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const creditedIds = new Set(invoices.flatMap(invoice => invoice.credited_invoice ? [invoice.credited_invoice.id] : []));
    const rows: ScoreRow[] = [];
    for (const invoice of invoices) {
      if (invoice.customer?.id !== customer.id || !Number.isSafeInteger(invoice.id) || typeof invoice.paid !== 'boolean'
        || typeof invoice.amount !== 'string' || !Number.isFinite(Number(invoice.amount))
        || typeof invoice.status !== 'string' || typeof invoice.draft !== 'boolean') {
        throw new Error('Données de facture incohérentes. Aucun score calculé.');
      }
      const candidate = makeScoreRow(invoice, null, today);
      if (!candidate) continue;
      if (creditedIds.has(invoice.id)) {
        rows.push({ ...candidate, state: 'excluded', delayDays: null, reason: 'Facture associée à un avoir : validation nécessaire' });
        continue;
      }
      if (!invoice.paid || candidate.reason !== 'Aucune transaction bancaire rapprochée') {
        rows.push(candidate);
        continue;
      }
      const transactions = await listAll<Transaction>(`customer_invoices/${invoice.id}/matched_transactions`);
      // Un virement groupé peut couvrir plusieurs factures : on retient la date de la
      // dernière transaction bancaire active, Pennylane ayant déjà confirmé le solde (paid).
      const dates = transactions
        .filter(tx => !tx.archived_at && validDate(tx.date) && tx.date <= today)
        .map(tx => tx.date)
        .sort();
      rows.push(makeScoreRow(invoice, dates.at(-1) ?? null, today)!);
    }
    const reasons: Record<string, number> = {};
    for (const row of rows) if (row.reason) reasons[row.reason] = (reasons[row.reason] ?? 0) + 1;
    rows.sort((a, b) => (b.deadline || '').localeCompare(a.deadline || ''));
    const summary = calculatePaymentScore(rows);
    console.info('[client-payment-score] score calculated', { userId: body.userId, agency: profile.agency, invoiceCount: invoices.length, eligibleCount: summary.eligibleCount, excludedCount: summary.excludedCount, reasons });
    return json({ ...summary, rows, today, periodStart: scorePeriodStart(today), agency: profile.agency, customerName: customer.name, calculatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[client-payment-score] calculation failed', { message: error instanceof Error ? error.message : 'Unknown error' });
    return json({ error: error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'Connexion Pennylane interrompue. Réessayez.' }, 502);
  }
});

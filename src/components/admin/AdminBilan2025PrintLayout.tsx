import React from 'react';

function formatCurrencyEUR(value: number) {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

function formatNumber(value: number) {
  return value.toLocaleString('fr-FR');
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

const AdminBilan2025PrintLayout = ({
  clientName,
  year,
  yearlyTotals,
  monthly,
}: {
  clientName: string;
  year: number;
  yearlyTotals: {
    totalCA: number;
    totalMontantVerse: number;
    totalFacture: number;
    net: number;
    adr: number;
    revpar: number;
    yearlyOccupation: number;
    totalNuits: number;
    totalReservations: number;
    totalVoyageurs: number;
  };
  monthly: Array<{
    month: string;
    totalCA: number;
    occupation: number;
  }>;
}) => {
  const generatedAt = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div id="admin-bilan-2025-to-print" className="w-[960px] bg-white text-slate-950">
      <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ecfdf5_45%,#dcfce7_100%)] px-10 py-10">
        <div className="mb-8 flex items-start justify-between gap-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-lg font-bold text-white shadow-sm">
              HK
            </div>
            <div>
              <div className="mb-2 inline-flex items-center rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">
                Rapport annuel propriétaire
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Bilan {year}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Préparé pour <span className="font-semibold text-slate-900">{clientName}</span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/75 px-5 py-4 text-right shadow-sm backdrop-blur">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Édité le</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{generatedAt}</div>
            <div className="mt-3 text-xs text-slate-500">Hello Keys — Synthèse annuelle</div>
          </div>
        </div>

        <div className="grid grid-cols-[1.4fr_1fr] gap-6">
          <div className="rounded-[28px] bg-slate-950 px-7 py-7 text-white shadow-lg">
            <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">Résultat annuel</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight">
              {formatCurrencyEUR(yearlyTotals.net)}
            </div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Une vue consolidée de votre activité sur l&apos;année, avec les principaux indicateurs de performance et la tendance mensuelle de votre chiffre d&apos;affaires.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">CA total</div>
                <div className="mt-2 text-lg font-semibold">{formatCurrencyEUR(yearlyTotals.totalCA)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Total versé</div>
                <div className="mt-2 text-lg font-semibold">{formatCurrencyEUR(yearlyTotals.totalMontantVerse)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Frais Hello Keys</div>
                <div className="mt-2 text-lg font-semibold">{formatCurrencyEUR(yearlyTotals.totalFacture)}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="ADR" value={formatCurrencyEUR(yearlyTotals.adr)} subtle="Prix moyen / nuit" />
            <MetricCard label="RevPAR" value={formatCurrencyEUR(yearlyTotals.revpar)} subtle="Revenu par nuit disponible" />
            <MetricCard label="Occupation" value={formatPercent(yearlyTotals.yearlyOccupation)} subtle="Taux annuel" />
            <MetricCard label="Réservations" value={formatNumber(yearlyTotals.totalReservations)} subtle="Volume total" />
          </div>
        </div>
      </div>

      <div className="px-10 py-8">
        <SectionTitle
          eyebrow="Indicateurs clés"
          title="Vue d'ensemble de la performance"
          description="Les principaux repères financiers et opérationnels de votre activité sur l'année."
        />

        <div className="mt-5 grid grid-cols-3 gap-4">
          <InfoCard title="Nuits vendues" value={formatNumber(yearlyTotals.totalNuits)} />
          <InfoCard title="Voyageurs accueillis" value={formatNumber(yearlyTotals.totalVoyageurs)} />
          <InfoCard title="Bénéfice net" value={formatCurrencyEUR(yearlyTotals.net)} highlight />
        </div>
      </div>

      <div className="px-10 pb-8">
        <div className="grid grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
            <SectionTitle
              eyebrow="Lecture financière"
              title="Repères annuels"
              description="Une présentation claire des montants structurants du bilan."
            />

            <div className="mt-5 space-y-3">
              <KeyValueRow label="Chiffre d'affaires total" value={formatCurrencyEUR(yearlyTotals.totalCA)} />
              <KeyValueRow label="Montant total versé" value={formatCurrencyEUR(yearlyTotals.totalMontantVerse)} />
              <KeyValueRow label="Frais Hello Keys" value={formatCurrencyEUR(yearlyTotals.totalFacture)} />
              <KeyValueRow label="ADR" value={formatCurrencyEUR(yearlyTotals.adr)} />
              <KeyValueRow label="RevPAR" value={formatCurrencyEUR(yearlyTotals.revpar)} />
              <KeyValueRow label="Occupation annuelle" value={formatPercent(yearlyTotals.yearlyOccupation)} />
            </div>
          </div>

          <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/60 p-6 shadow-[0_8px_30px_rgba(16,185,129,0.10)]">
            <SectionTitle
              eyebrow="Volumes annuels"
              title="Activité consolidée"
              description="Le niveau d'activité observé sur l'ensemble de l'année."
            />

            <div className="mt-5 grid grid-cols-1 gap-3">
              <VolumeCard label="Réservations" value={formatNumber(yearlyTotals.totalReservations)} />
              <VolumeCard label="Nuits vendues" value={formatNumber(yearlyTotals.totalNuits)} />
              <VolumeCard label="Voyageurs" value={formatNumber(yearlyTotals.totalVoyageurs)} />
            </div>
          </div>
        </div>
      </div>

      <div className="px-10 pb-10">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
          <SectionTitle
            eyebrow="Tendance mensuelle"
            title="Chiffre d'affaires & occupation"
            description="Une lecture mois par mois de l'évolution de votre activité sur l'année."
          />

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-950 text-white">
                  <th className="px-4 py-3 text-left font-medium">Mois</th>
                  <th className="px-4 py-3 text-right font-medium">CA</th>
                  <th className="px-4 py-3 text-right font-medium">Occupation</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((monthRow, index) => (
                  <tr
                    key={`${monthRow.month}-${index}`}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                  >
                    <td className="border-t border-slate-200 px-4 py-3 font-medium text-slate-900">
                      {monthRow.month}
                    </td>
                    <td className="border-t border-slate-200 px-4 py-3 text-right text-slate-700">
                      {formatCurrencyEUR(monthRow.totalCA)}
                    </td>
                    <td className="border-t border-slate-200 px-4 py-3 text-right">
                      <span className="inline-flex min-w-[88px] justify-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                        {formatPercent(monthRow.occupation)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 px-10 py-5 text-xs text-slate-500">
        Document de synthèse généré par Hello Keys — données annuelles {year}.
      </div>
    </div>
  );
};

const SectionTitle = ({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) => (
  <div>
    <div className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</div>
    <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
    <p className="mt-1 text-sm text-slate-600">{description}</p>
  </div>
);

const MetricCard = ({
  label,
  value,
  subtle,
}: {
  label: string;
  value: string;
  subtle: string;
}) => (
  <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm">
    <div className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</div>
    <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
    <div className="mt-1 text-xs text-slate-500">{subtle}</div>
  </div>
);

const InfoCard = ({
  title,
  value,
  highlight = false,
}: {
  title: string;
  value: string;
  highlight?: boolean;
}) => (
  <div
    className={highlight
      ? 'rounded-2xl border border-emerald-200 bg-emerald-50 p-5'
      : 'rounded-2xl border border-slate-200 bg-slate-50 p-5'}
  >
    <div className="text-sm text-slate-600">{title}</div>
    <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
  </div>
);

const KeyValueRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
    <span className="text-sm text-slate-600">{label}</span>
    <span className="text-sm font-semibold text-slate-950">{value}</span>
  </div>
);

const VolumeCard = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="rounded-2xl border border-emerald-100 bg-white/80 px-4 py-4">
    <div className="text-sm text-slate-600">{label}</div>
    <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
  </div>
);

export default AdminBilan2025PrintLayout;

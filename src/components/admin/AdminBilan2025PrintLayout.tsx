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
    <div id="admin-bilan-2025-to-print" className="w-[980px] overflow-hidden bg-white text-slate-950">
      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.22),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(255,255,255,0.14),_transparent_20%),linear-gradient(135deg,#020617_0%,#0f172a_52%,#052e2b_100%)] px-12 pb-12 pt-12 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-[-8%] top-10 h-64 w-64 rounded-full border border-white/20" />
          <div className="absolute right-[-4%] top-[-2%] h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute bottom-[-18%] left-[38%] h-72 w-72 rounded-full border border-white/10" />
        </div>

        <div className="relative z-10 flex min-h-[420px] flex-col justify-between">
          <div className="flex items-start justify-between gap-8">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/15 bg-white/10 text-xl font-semibold tracking-[0.18em] text-white backdrop-blur-sm">
                HK
              </div>
              <div>
                <div className="inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-emerald-200">
                  Annual Owner Report
                </div>
                <p className="mt-4 text-sm uppercase tracking-[0.28em] text-slate-300">Hello Keys</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-right shadow-2xl backdrop-blur-sm">
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-300">Édition</div>
              <div className="mt-2 text-sm font-medium text-white">{generatedAt}</div>
              <div className="mt-3 h-px bg-white/10" />
              <div className="mt-3 text-[11px] uppercase tracking-[0.2em] text-slate-400">Rapport patrimonial</div>
            </div>
          </div>

          <div className="mt-14 grid grid-cols-[1.5fr_0.9fr] gap-10">
            <div>
              <div className="text-[12px] uppercase tracking-[0.34em] text-emerald-200">Bilan annuel</div>
              <h1 className="mt-5 max-w-2xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-white">
                Rapport luxe
                <br />
                de performance {year}
              </h1>
              <p className="mt-6 max-w-2xl text-[15px] leading-7 text-slate-300">
                Une synthèse haut de gamme de votre activité locative, conçue pour offrir une lecture claire,
                structurée et valorisante de vos performances annuelles.
              </p>

              <div className="mt-10 flex items-center gap-5">
                <div className="h-px w-16 bg-emerald-300/50" />
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Propriétaire</div>
                  <div className="mt-1 text-xl font-medium text-white">{clientName}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <div className="rounded-[30px] border border-white/10 bg-white/6 p-7 shadow-2xl backdrop-blur-sm">
                <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-200">Résultat net</div>
                <div className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white">
                  {formatCurrencyEUR(yearlyTotals.net)}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Montant net annuel consolidé après prise en compte des montants versés et des frais Hello Keys.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <DarkStat label="CA total" value={formatCurrencyEUR(yearlyTotals.totalCA)} />
                  <DarkStat label="Occupation" value={formatPercent(yearlyTotals.yearlyOccupation)} />
                  <DarkStat label="ADR" value={formatCurrencyEUR(yearlyTotals.adr)} />
                  <DarkStat label="RevPAR" value={formatCurrencyEUR(yearlyTotals.revpar)} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white px-12 py-10">
        <div className="grid grid-cols-[1.05fr_0.95fr] gap-6">
          <LuxuryPanel>
            <SectionEyebrow>Lecture exécutive</SectionEyebrow>
            <PanelTitle>Les grands marqueurs de l'année</PanelTitle>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Ce document présente une lecture claire de la performance annuelle de votre bien : revenus,
              rentabilité, intensité d&apos;occupation et volumes d&apos;activité. L&apos;objectif est d&apos;offrir un rapport à la fois
              élégant, lisible et directement exploitable.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <SoftMetricCard label="Montant versé" value={formatCurrencyEUR(yearlyTotals.totalMontantVerse)} />
              <SoftMetricCard label="Frais Hello Keys" value={formatCurrencyEUR(yearlyTotals.totalFacture)} />
              <SoftMetricCard label="Réservations" value={formatNumber(yearlyTotals.totalReservations)} />
            </div>
          </LuxuryPanel>

          <LuxuryPanel accent>
            <SectionEyebrow>Signature annuelle</SectionEyebrow>
            <PanelTitle>Bénéfice & volumes consolidés</PanelTitle>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <VolumeRow label="Bénéfice net annuel" value={formatCurrencyEUR(yearlyTotals.net)} highlight />
              <VolumeRow label="Nuits vendues" value={formatNumber(yearlyTotals.totalNuits)} />
              <VolumeRow label="Voyageurs accueillis" value={formatNumber(yearlyTotals.totalVoyageurs)} />
            </div>
          </LuxuryPanel>
        </div>
      </div>

      <div className="px-12 pb-10">
        <div className="grid grid-cols-[1.15fr_0.85fr] gap-6">
          <LuxuryPanel>
            <SectionEyebrow>Repères financiers</SectionEyebrow>
            <PanelTitle>Structure de la performance</PanelTitle>

            <div className="mt-6 space-y-3">
              <KeyValueRow label="Chiffre d'affaires total" value={formatCurrencyEUR(yearlyTotals.totalCA)} />
              <KeyValueRow label="Montant total versé" value={formatCurrencyEUR(yearlyTotals.totalMontantVerse)} />
              <KeyValueRow label="Frais Hello Keys" value={formatCurrencyEUR(yearlyTotals.totalFacture)} />
              <KeyValueRow label="Bénéfice net" value={formatCurrencyEUR(yearlyTotals.net)} strong />
            </div>
          </LuxuryPanel>

          <LuxuryPanel>
            <SectionEyebrow>Performance commerciale</SectionEyebrow>
            <PanelTitle>Indicateurs premium</PanelTitle>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <PremiumKpi title="ADR" value={formatCurrencyEUR(yearlyTotals.adr)} note="Tarif moyen / nuit vendue" />
              <PremiumKpi title="RevPAR" value={formatCurrencyEUR(yearlyTotals.revpar)} note="Revenu / nuit disponible" />
              <PremiumKpi title="Occupation" value={formatPercent(yearlyTotals.yearlyOccupation)} note="Taux d'occupation annuel" />
              <PremiumKpi title="Réservations" value={formatNumber(yearlyTotals.totalReservations)} note="Nombre de séjours" />
            </div>
          </LuxuryPanel>
        </div>
      </div>

      <div className="px-12 pb-12">
        <LuxuryPanel>
          <div className="flex items-end justify-between gap-6">
            <div>
              <SectionEyebrow>Tendance mensuelle</SectionEyebrow>
              <PanelTitle>Évolution du chiffre d'affaires et de l'occupation</PanelTitle>
              <p className="mt-2 text-sm text-slate-600">
                Une lecture mois par mois pour apprécier la saisonnalité de l'activité et son intensité sur l'ensemble de l'année.
              </p>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">
              Synthèse {year}
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[linear-gradient(90deg,#0f172a_0%,#111827_55%,#064e3b_100%)] text-white">
                  <th className="px-5 py-4 text-left text-[12px] font-medium uppercase tracking-[0.16em]">Mois</th>
                  <th className="px-5 py-4 text-right text-[12px] font-medium uppercase tracking-[0.16em]">Chiffre d'affaires</th>
                  <th className="px-5 py-4 text-right text-[12px] font-medium uppercase tracking-[0.16em]">Occupation</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((monthRow, index) => (
                  <tr key={`${monthRow.month}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border-t border-slate-200 px-5 py-4 font-medium text-slate-900">{monthRow.month}</td>
                    <td className="border-t border-slate-200 px-5 py-4 text-right text-slate-700">
                      {formatCurrencyEUR(monthRow.totalCA)}
                    </td>
                    <td className="border-t border-slate-200 px-5 py-4 text-right">
                      <span className="inline-flex min-w-[96px] items-center justify-center rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                        {formatPercent(monthRow.occupation)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LuxuryPanel>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-12 py-6">
        <div className="flex items-center justify-between gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Hello Keys</div>
            <div className="mt-1 text-sm text-slate-600">Rapport annuel propriétaire — édition {year}</div>
          </div>
          <div className="text-right text-xs leading-6 text-slate-500">
            Document de synthèse haut de gamme généré à partir des données annuelles disponibles.
          </div>
        </div>
      </div>
    </div>
  );
};

const LuxuryPanel = ({
  children,
  accent = false,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) => (
  <div
    className={accent
      ? 'rounded-[30px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f0fdf4_100%)] p-7 shadow-[0_18px_50px_rgba(16,185,129,0.10)]'
      : 'rounded-[30px] border border-slate-200 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.07)]'}
  >
    {children}
  </div>
);

const SectionEyebrow = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-emerald-700">{children}</div>
);

const PanelTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.03em] text-slate-950">{children}</h2>
);

const DarkStat = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
    <div className="mt-2 text-base font-semibold text-white">{value}</div>
  </div>
);

const SoftMetricCard = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-5">
    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
    <div className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{value}</div>
  </div>
);

const VolumeRow = ({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <div
    className={highlight
      ? 'flex items-center justify-between rounded-[24px] border border-emerald-200 bg-white px-5 py-4 shadow-sm'
      : 'flex items-center justify-between rounded-[24px] border border-white/60 bg-white/70 px-5 py-4'}
  >
    <span className="text-sm text-slate-600">{label}</span>
    <span className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{value}</span>
  </div>
);

const KeyValueRow = ({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) => (
  <div
    className={strong
      ? 'flex items-center justify-between rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4'
      : 'flex items-center justify-between rounded-[24px] bg-slate-50 px-5 py-4'}
  >
    <span className="text-sm text-slate-600">{label}</span>
    <span className="text-base font-semibold text-slate-950">{value}</span>
  </div>
);

const PremiumKpi = ({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) => (
  <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5">
    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{title}</div>
    <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{value}</div>
    <div className="mt-2 text-xs leading-5 text-slate-500">{note}</div>
  </div>
);

export default AdminBilan2025PrintLayout;

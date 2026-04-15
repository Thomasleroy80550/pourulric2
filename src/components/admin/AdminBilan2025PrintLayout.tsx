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
    <div id="admin-bilan-2025-to-print" className="w-[980px] overflow-hidden bg-white text-slate-900">
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,#0A2540_0%,#163A5C_55%,#255F85_100%)] px-12 pb-12 pt-12 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-[-8%] top-8 h-64 w-64 rounded-full border border-white/20" />
          <div className="absolute right-[-6%] top-[-8%] h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute bottom-[-20%] left-[42%] h-72 w-72 rounded-full border border-white/10" />
        </div>

        <div className="relative z-10 flex min-h-[360px] flex-col justify-between gap-10">
          <div className="flex items-start justify-between gap-8">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.24em] text-white/90">
                Bilan annuel propriétaire
              </div>
              <div className="mt-6 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-white/10 p-2 backdrop-blur-sm">
                  <img src="/logo.png" alt="Hello Keys" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm uppercase tracking-[0.22em] text-white/70">Hello Keys</p>
                  <h1 className="mt-2 break-words text-4xl font-semibold leading-tight tracking-[-0.03em] text-white">
                    Bilan de performance {year}
                  </h1>
                </div>
              </div>
            </div>

            <div className="w-[240px] shrink-0 rounded-[24px] border border-white/15 bg-white/10 px-5 py-4 text-right shadow-xl backdrop-blur-sm">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/70">Édition</div>
              <div className="mt-2 break-words text-sm font-medium text-white">{generatedAt}</div>
              <div className="mt-4 border-t border-white/10 pt-4 text-[11px] uppercase tracking-[0.16em] text-white/65">
                Synthèse annuelle
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1.45fr_0.95fr] gap-8">
            <div className="min-w-0">
              <p className="max-w-2xl text-[15px] leading-7 text-white/80">
                Ce bilan annuel présente de manière synthétique les principaux indicateurs financiers et
                opérationnels de votre activité sur l'année {year}.
              </p>

              <div className="mt-8 flex items-center gap-5">
                <div className="h-px w-16 shrink-0 bg-white/35" />
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">Propriétaire</div>
                  <div className="mt-1 break-words text-xl font-medium text-white">{clientName}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/70">Résultat net</div>
              <div className="mt-3 break-words text-4xl font-semibold leading-tight tracking-[-0.04em] text-white">
                {formatCurrencyEUR(yearlyTotals.net)}
              </div>
              <p className="mt-3 text-sm leading-6 text-white/75">
                Montant net annuel après versements et frais de gestion Hello Keys.
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

      <div className="bg-white px-12 py-10">
        <div className="grid grid-cols-[1.05fr_0.95fr] gap-6">
          <Panel>
            <SectionEyebrow>Vue d'ensemble</SectionEyebrow>
            <PanelTitle>Les indicateurs clés de l'année</PanelTitle>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Ce document regroupe les principaux indicateurs financiers et opérationnels de votre activité,
              avec une présentation cohérente avec votre espace client Hello Keys.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <SoftMetricCard label="Montant versé" value={formatCurrencyEUR(yearlyTotals.totalMontantVerse)} />
              <SoftMetricCard label="Frais Hello Keys" value={formatCurrencyEUR(yearlyTotals.totalFacture)} />
              <SoftMetricCard label="Réservations" value={formatNumber(yearlyTotals.totalReservations)} />
            </div>
          </Panel>

          <Panel accent>
            <SectionEyebrow>Volumes annuels</SectionEyebrow>
            <PanelTitle>Activité consolidée</PanelTitle>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <VolumeRow label="Bénéfice net annuel" value={formatCurrencyEUR(yearlyTotals.net)} highlight />
              <VolumeRow label="Nuits vendues" value={formatNumber(yearlyTotals.totalNuits)} />
              <VolumeRow label="Voyageurs accueillis" value={formatNumber(yearlyTotals.totalVoyageurs)} />
            </div>
          </Panel>
        </div>
      </div>

      <div className="px-12 pb-10">
        <div className="grid grid-cols-[1.15fr_0.85fr] gap-6">
          <Panel>
            <SectionEyebrow>Repères financiers</SectionEyebrow>
            <PanelTitle>Structure de la performance</PanelTitle>

            <div className="mt-6 space-y-3">
              <KeyValueRow label="Chiffre d'affaires total" value={formatCurrencyEUR(yearlyTotals.totalCA)} />
              <KeyValueRow label="Montant total versé" value={formatCurrencyEUR(yearlyTotals.totalMontantVerse)} />
              <KeyValueRow label="Frais Hello Keys" value={formatCurrencyEUR(yearlyTotals.totalFacture)} />
              <KeyValueRow label="Bénéfice net" value={formatCurrencyEUR(yearlyTotals.net)} strong />
            </div>
          </Panel>

          <Panel>
            <SectionEyebrow>Performance commerciale</SectionEyebrow>
            <PanelTitle>Indicateurs de pilotage</PanelTitle>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <PremiumKpi title="ADR" value={formatCurrencyEUR(yearlyTotals.adr)} note="Tarif moyen par nuit vendue" />
              <PremiumKpi title="RevPAR" value={formatCurrencyEUR(yearlyTotals.revpar)} note="Revenu par nuit disponible" />
              <PremiumKpi title="Occupation" value={formatPercent(yearlyTotals.yearlyOccupation)} note="Taux d'occupation annuel" />
              <PremiumKpi title="Réservations" value={formatNumber(yearlyTotals.totalReservations)} note="Nombre total de séjours" />
            </div>
          </Panel>
        </div>
      </div>

      <div className="px-12 pb-12">
        <Panel>
          <div className="flex items-end justify-between gap-6">
            <div className="min-w-0">
              <SectionEyebrow>Tendance mensuelle</SectionEyebrow>
              <PanelTitle>Évolution du chiffre d'affaires et de l'occupation</PanelTitle>
              <p className="mt-2 text-sm text-slate-600">
                Une lecture mois par mois pour visualiser la saisonnalité de l'activité.
              </p>
            </div>
            <div className="shrink-0 rounded-full border border-[#255F85]/15 bg-[#255F85]/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#255F85]">
              Synthèse {year}
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[linear-gradient(90deg,#0A2540_0%,#163A5C_55%,#255F85_100%)] text-white">
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
                      <span className="inline-flex min-w-[96px] items-center justify-center rounded-full bg-[#255F85]/10 px-3 py-1.5 text-xs font-semibold text-[#255F85]">
                        {formatPercent(monthRow.occupation)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-12 py-6">
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Hello Keys</div>
            <div className="mt-1 text-sm text-slate-600">Bilan annuel propriétaire — édition {year}</div>
          </div>
          <div className="max-w-[340px] text-right text-xs leading-6 text-slate-500">
            Document de synthèse généré à partir des données annuelles disponibles dans votre espace Hello Keys.
          </div>
        </div>
      </div>
    </div>
  );
};

const Panel = ({
  children,
  accent = false,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) => (
  <div
    className={accent
      ? 'rounded-[30px] border border-[#255F85]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8fb_100%)] p-7 shadow-[0_18px_50px_rgba(37,95,133,0.08)]'
      : 'rounded-[30px] border border-slate-200 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.07)]'}
  >
    {children}
  </div>
);

const SectionEyebrow = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#255F85]">{children}</div>
);

const PanelTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mt-3 break-words text-[28px] font-semibold tracking-[-0.03em] text-slate-950">{children}</h2>
);

const DarkStat = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
    <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">{label}</div>
    <div className="mt-2 break-words text-base font-semibold leading-tight text-white">{value}</div>
  </div>
);

const SoftMetricCard = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="min-w-0 rounded-[24px] border border-slate-200 bg-slate-50 px-3 py-4">
    <div className="text-[10px] uppercase tracking-[0.1em] text-slate-500">{label}</div>
    <div className="mt-2 whitespace-nowrap text-[16px] font-semibold leading-tight tracking-normal text-slate-950">{value}</div>
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
      ? 'flex items-start justify-between gap-4 rounded-[24px] border border-[#255F85]/15 bg-white px-5 py-4 shadow-sm'
      : 'flex items-start justify-between gap-4 rounded-[24px] border border-slate-200 bg-white/80 px-5 py-4'}
  >
    <span className="min-w-0 flex-1 text-sm leading-6 text-slate-600">{label}</span>
    <span className="max-w-[50%] break-words text-right text-lg font-semibold leading-tight tracking-[-0.02em] text-slate-950">{value}</span>
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
      ? 'flex items-start justify-between gap-4 rounded-[24px] border border-[#255F85]/15 bg-[#255F85]/5 px-5 py-4'
      : 'flex items-start justify-between gap-4 rounded-[24px] bg-slate-50 px-5 py-4'}
  >
    <span className="min-w-0 flex-1 text-sm leading-6 text-slate-600">{label}</span>
    <span className="max-w-[50%] break-words text-right text-base font-semibold leading-tight text-slate-950">{value}</span>
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
  <div className="min-w-0 rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5">
    <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{title}</div>
    <div className="mt-2 break-words text-[22px] font-semibold leading-snug tracking-[-0.02em] text-slate-950">{value}</div>
    <div className="mt-2 text-[10px] leading-4 text-slate-500">{note}</div>
  </div>
);

export default AdminBilan2025PrintLayout;
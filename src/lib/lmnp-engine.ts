import { parse, isValid, differenceInCalendarDays, endOfYear, startOfYear, parseISO, addYears } from "date-fns";
import { fr } from "date-fns/locale";
import { SavedInvoice } from "./admin-api";
import { Expense } from "./expenses-api";
import { LmnpFixedAsset, LmnpSettings } from "./lmnp-api";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface LiasseLine {
  code: string;
  label: string;
  amount: number;
  note?: string;
}

export interface LiasseForm {
  id: string; // ex: "2031"
  title: string;
  sections: { title: string; lines: LiasseLine[] }[];
}

export interface AmortizationRow {
  assetId: string;
  label: string;
  category: string;
  acquisitionDate: string;
  base: number;
  durationYears: number;
  rate: number; // %
  priorAmortization: number; // cumul au 1er janvier
  dotation: number; // dotation théorique de l'exercice
  cumulEnd: number; // cumul au 31 décembre
  netValue: number; // VNC au 31 décembre
}

export interface RevenueDetail {
  period: string;
  gross: number;
  hkFees: number;
}

export interface LmnpComputation {
  year: number;
  // Revenus
  grossRevenue: number;
  hkFees: number;
  revenueDetails: RevenueDetail[];
  // Charges
  expenseGroups: { label: string; amount: number }[];
  totalExpenses: number; // charges déductibles hors amortissements (inclut frais HK)
  // Amortissements
  amortizationRows: AmortizationRow[];
  totalTheoreticalAmortization: number;
  deductibleAmortization: number;
  deferredUsed: number;
  newDeferredCarry: number; // stock d'amortissements différés au 31/12
  // Résultats
  resultBeforeAmortization: number;
  taxResult: number; // après amortissements
  deficitsUsed: number;
  finalTaxResult: number; // après imputation des déficits antérieurs
  remainingDeficits: number;
  warnings: string[];
  forms: LiasseForm[];
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;

export function parseStatementYear(period: string): number | null {
  if (!period) return null;
  let parsed = parse(period, "MMMM yyyy", new Date(), { locale: fr });
  if (!isValid(parsed)) parsed = parse(period, "MMM yyyy", new Date(), { locale: fr });
  if (isValid(parsed)) return parsed.getFullYear();
  const match = period.match(/(20\d{2})/);
  return match ? parseInt(match[1], 10) : null;
}

// Mapping des catégories de charges vers les groupes de la 2033-B
const EXPENSE_GROUP_MAP: Record<string, string> = {
  "Charges de copropriété": "Autres charges externes",
  "Assurance (PNO / habitation)": "Autres charges externes",
  "Énergie (élec, gaz, eau)": "Autres charges externes",
  "Internet / Box": "Autres charges externes",
  "Ménage / Blanchisserie": "Autres charges externes",
  "Entretien / Réparations": "Autres charges externes",
  "Mobilier / Équipement": "Autres charges externes",
  "Honoraires de gestion": "Honoraires de gestion",
  "Abonnements": "Autres charges externes",
  "Taxe foncière": "Impôts et taxes",
  "Crédit / Prêt immobilier": "Charges financières (intérêts d'emprunt)",
  "Autre": "Autres charges",
};

const GROUP_ORDER = [
  "Honoraires de gestion",
  "Autres charges externes",
  "Impôts et taxes",
  "Charges financières (intérêts d'emprunt)",
  "Autres charges",
];

// ─────────────────────────────────────────────────────────────
// Amortissements
// ─────────────────────────────────────────────────────────────

function computeAmortizationRow(asset: LmnpFixedAsset, year: number): AmortizationRow | null {
  const acqDate = parseISO(asset.acquisition_date);
  if (!isValid(acqDate) || acqDate.getFullYear() > year) return null;

  const base = asset.amount;
  const duration = Math.max(1, asset.duration_years);
  const annual = base / duration;
  const endDate = addYears(acqDate, duration);

  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));

  // Cumul des amortissements au 1er janvier de l'exercice
  let priorDays = 0;
  if (acqDate < yearStart) {
    priorDays = differenceInCalendarDays(yearStart, acqDate);
  }
  const totalDays = duration * 365;
  const priorAmortization = Math.min(base, (annual * priorDays) / 365);

  // Dotation de l'exercice (prorata temporis)
  const dotStart = acqDate > yearStart ? acqDate : yearStart;
  const dotEnd = endDate < yearEnd ? endDate : yearEnd;
  let dotation = 0;
  if (dotEnd > dotStart && priorDays < totalDays) {
    const days = differenceInCalendarDays(dotEnd, dotStart) + (acqDate > yearStart ? 0 : 1);
    dotation = (annual * days) / 365;
  }
  dotation = Math.min(dotation, base - priorAmortization);
  if (dotation < 0) dotation = 0;

  const cumulEnd = Math.min(base, priorAmortization + dotation);

  return {
    assetId: asset.id,
    label: asset.label,
    category: asset.category,
    acquisitionDate: asset.acquisition_date,
    base: round2(base),
    durationYears: duration,
    rate: round2(100 / duration),
    priorAmortization: round2(priorAmortization),
    dotation: round2(dotation),
    cumulEnd: round2(cumulEnd),
    netValue: round2(base - cumulEnd),
  };
}

// ─────────────────────────────────────────────────────────────
// Calcul principal
// ─────────────────────────────────────────────────────────────

export function computeLmnpYear(
  year: number,
  statements: SavedInvoice[],
  expenses: Expense[],
  assets: LmnpFixedAsset[],
  settings: LmnpSettings | null,
): LmnpComputation {
  const warnings: string[] = [];

  // ── Revenus (import automatique depuis les relevés Hello Keys)
  const yearStatements = statements.filter((s) => parseStatementYear(s.period) === year);
  const revenueDetails: RevenueDetail[] = yearStatements.map((s) => {
    const totals = s.totals || {};
    const hkFees = Number(totals.totalFacture ?? 0) || 0;
    let gross = Number(totals.totalRevenuGenere ?? 0) || 0;
    if (!gross) {
      gross = (Number(totals.totalMontantVerse ?? 0) || 0) + hkFees;
    }
    return { period: s.period, gross: round2(gross), hkFees: round2(hkFees) };
  });
  const grossRevenue = round2(revenueDetails.reduce((acc, r) => acc + r.gross, 0));
  const hkFees = round2(revenueDetails.reduce((acc, r) => acc + r.hkFees, 0));

  if (yearStatements.length === 0) {
    warnings.push(`Aucun relevé Hello Keys trouvé pour ${year} : les recettes sont à 0.`);
  }

  // ── Charges saisies par le propriétaire
  const groupTotals = new Map<string, number>();
  expenses.forEach((e) => {
    const group = EXPENSE_GROUP_MAP[e.category || ""] || "Autres charges";
    groupTotals.set(group, (groupTotals.get(group) || 0) + e.amount);
  });
  // Frais Hello Keys importés automatiquement en honoraires de gestion
  if (hkFees > 0) {
    groupTotals.set("Honoraires de gestion", (groupTotals.get("Honoraires de gestion") || 0) + hkFees);
  }

  const hasLoanExpenses = expenses.some((e) => e.category === "Crédit / Prêt immobilier");
  if (hasLoanExpenses) {
    warnings.push(
      "Catégorie « Crédit / Prêt immobilier » : seuls les intérêts d'emprunt (et l'assurance emprunteur) sont déductibles, pas le capital remboursé. Vérifiez vos montants saisis.",
    );
  }

  const expenseGroups = GROUP_ORDER.filter((g) => groupTotals.has(g)).map((g) => ({
    label: g,
    amount: round2(groupTotals.get(g) || 0),
  }));
  const totalExpenses = round2(expenseGroups.reduce((acc, g) => acc + g.amount, 0));

  // ── Amortissements
  const amortizationRows = assets
    .map((a) => computeAmortizationRow(a, year))
    .filter((r): r is AmortizationRow => r !== null);
  const totalTheoreticalAmortization = round2(
    amortizationRows.reduce((acc, r) => acc + r.dotation, 0),
  );

  // ── Résultat avant amortissements
  const resultBeforeAmortization = round2(grossRevenue - totalExpenses);

  // ── Plafonnement art. 39 C (l'amortissement ne peut pas créer de déficit)
  const deferredPrior = Number(settings?.deferred_amortization ?? 0) || 0;
  const capacity = Math.max(0, resultBeforeAmortization);
  const deductibleAmortization = round2(Math.min(totalTheoreticalAmortization, capacity));
  const deferredUsed = round2(Math.min(deferredPrior, capacity - deductibleAmortization));
  const newDeferredCarry = round2(
    deferredPrior - deferredUsed + (totalTheoreticalAmortization - deductibleAmortization),
  );

  if (totalTheoreticalAmortization > deductibleAmortization) {
    warnings.push(
      `Une partie des amortissements (${round2(totalTheoreticalAmortization - deductibleAmortization).toLocaleString("fr-FR")} €) est différée (art. 39 C) car elle créerait un déficit. Elle est reportable sans limite de durée.`,
    );
  }

  const taxResult = round2(resultBeforeAmortization - deductibleAmortization - deferredUsed);

  // ── Imputation des déficits antérieurs (reportables 10 ans sur revenus LMNP)
  const priorDeficits = Number(settings?.prior_deficits ?? 0) || 0;
  const deficitsUsed = taxResult > 0 ? round2(Math.min(priorDeficits, taxResult)) : 0;
  const finalTaxResult = round2(taxResult - deficitsUsed);
  const remainingDeficits = round2(priorDeficits - deficitsUsed + (taxResult < 0 ? -taxResult : 0));

  // ── Construction des formulaires
  const forms = buildForms({
    year,
    settings,
    grossRevenue,
    expenseGroups,
    totalExpenses,
    amortizationRows,
    totalTheoreticalAmortization,
    deductibleAmortization,
    deferredUsed,
    newDeferredCarry,
    resultBeforeAmortization,
    taxResult,
    deficitsUsed,
    finalTaxResult,
    remainingDeficits,
  });

  return {
    year,
    grossRevenue,
    hkFees,
    revenueDetails,
    expenseGroups,
    totalExpenses,
    amortizationRows,
    totalTheoreticalAmortization,
    deductibleAmortization,
    deferredUsed,
    newDeferredCarry,
    resultBeforeAmortization,
    taxResult,
    deficitsUsed,
    finalTaxResult,
    remainingDeficits,
    warnings,
    forms,
  };
}

// ─────────────────────────────────────────────────────────────
// Formulaires 2031 + 2033-A à E
// ─────────────────────────────────────────────────────────────

interface FormInputs {
  year: number;
  settings: LmnpSettings | null;
  grossRevenue: number;
  expenseGroups: { label: string; amount: number }[];
  totalExpenses: number;
  amortizationRows: AmortizationRow[];
  totalTheoreticalAmortization: number;
  deductibleAmortization: number;
  deferredUsed: number;
  newDeferredCarry: number;
  resultBeforeAmortization: number;
  taxResult: number;
  deficitsUsed: number;
  finalTaxResult: number;
  remainingDeficits: number;
}

function buildForms(i: FormInputs): LiasseForm[] {
  const grossAssets = round2(i.amortizationRows.reduce((a, r) => a + r.base, 0));
  const cumulAmort = round2(i.amortizationRows.reduce((a, r) => a + r.cumulEnd, 0));
  const netAssets = round2(grossAssets - cumulAmort);
  const totalAmortDeducted = round2(i.deductibleAmortization + i.deferredUsed);

  const form2031: LiasseForm = {
    id: "2031",
    title: "2031 — Déclaration de résultats BIC (location meublée non professionnelle)",
    sections: [
      {
        title: "Identification",
        lines: [
          { code: "A1", label: "Dénomination / Nom du déclarant", amount: 0, note: i.settings?.declarant_name || "À compléter" },
          { code: "A2", label: "N° SIRET", amount: 0, note: i.settings?.siret || "À compléter" },
          { code: "A3", label: "Adresse du bien exploité", amount: 0, note: i.settings?.property_address || "À compléter" },
          { code: "A4", label: "Régime d'imposition", amount: 0, note: "Réel simplifié — BIC non professionnel" },
        ],
      },
      {
        title: "Récapitulation des éléments d'imposition",
        lines: [
          { code: "C1", label: "Résultat fiscal — Bénéfice", amount: i.finalTaxResult > 0 ? i.finalTaxResult : 0 },
          { code: "C2", label: "Résultat fiscal — Déficit", amount: i.taxResult < 0 ? -i.taxResult : 0 },
          { code: "C3", label: "Déficits antérieurs imputés", amount: i.deficitsUsed },
          { code: "C4", label: "Revenus exonérés / abattements", amount: 0 },
        ],
      },
    ],
  };

  const form2033A: LiasseForm = {
    id: "2033-A",
    title: "2033-A — Bilan simplifié",
    sections: [
      {
        title: "Actif",
        lines: [
          { code: "028", label: "Immobilisations corporelles et incorporelles (brut)", amount: grossAssets },
          { code: "029", label: "Amortissements cumulés", amount: cumulAmort },
          { code: "044", label: "Immobilisations (valeur nette)", amount: netAssets },
          { code: "110", label: "Total actif net", amount: netAssets },
        ],
      },
      {
        title: "Passif",
        lines: [
          { code: "120", label: "Capital / compte de l'exploitant (équilibre)", amount: round2(netAssets - (i.taxResult < 0 ? 0 : i.finalTaxResult)) },
          { code: "310", label: "Résultat de l'exercice", amount: i.taxResult },
          { code: "180", label: "Total passif", amount: netAssets },
        ],
      },
    ],
  };

  const chargeLine = (label: string) =>
    i.expenseGroups.find((g) => g.label === label)?.amount || 0;

  const form2033B: LiasseForm = {
    id: "2033-B",
    title: "2033-B — Compte de résultat simplifié",
    sections: [
      {
        title: "Produits d'exploitation",
        lines: [
          { code: "210", label: "Recettes de location meublée (hors taxe de séjour)", amount: i.grossRevenue },
          { code: "232", label: "Total des produits d'exploitation", amount: i.grossRevenue },
        ],
      },
      {
        title: "Charges d'exploitation",
        lines: [
          { code: "242", label: "Autres charges externes (dont honoraires de gestion)", amount: round2(chargeLine("Honoraires de gestion") + chargeLine("Autres charges externes")) },
          { code: "244", label: "Impôts et taxes", amount: chargeLine("Impôts et taxes") },
          { code: "254", label: "Dotations aux amortissements", amount: totalAmortDeducted },
          { code: "262", label: "Autres charges", amount: chargeLine("Autres charges") },
          { code: "264", label: "Total des charges d'exploitation", amount: round2(i.totalExpenses - chargeLine("Charges financières (intérêts d'emprunt)") + totalAmortDeducted) },
        ],
      },
      {
        title: "Résultat",
        lines: [
          { code: "270", label: "Résultat d'exploitation", amount: round2(i.grossRevenue - (i.totalExpenses - chargeLine("Charges financières (intérêts d'emprunt)")) - totalAmortDeducted) },
          { code: "294", label: "Charges financières (intérêts d'emprunt)", amount: chargeLine("Charges financières (intérêts d'emprunt)") },
          { code: "310", label: "Résultat comptable de l'exercice", amount: i.taxResult },
          { code: "352", label: "Résultat fiscal après imputation des déficits", amount: i.finalTaxResult },
        ],
      },
    ],
  };

  const form2033C: LiasseForm = {
    id: "2033-C",
    title: "2033-C — Immobilisations et amortissements",
    sections: [
      {
        title: "Détail des immobilisations et amortissements",
        lines: i.amortizationRows.map((r, idx) => ({
          code: String(400 + idx),
          label: `${r.label} (${r.category}) — ${r.durationYears} ans, taux ${r.rate}%`,
          amount: r.dotation,
          note: `Base : ${r.base.toLocaleString("fr-FR")} € · Cumul 31/12 : ${r.cumulEnd.toLocaleString("fr-FR")} € · VNC : ${r.netValue.toLocaleString("fr-FR")} €`,
        })),
      },
      {
        title: "Totaux",
        lines: [
          { code: "470", label: "Dotation théorique de l'exercice", amount: i.totalTheoreticalAmortization },
          { code: "471", label: "Dotation fiscalement déduite (plafond art. 39 C)", amount: i.deductibleAmortization },
          { code: "472", label: "Amortissements différés utilisés", amount: i.deferredUsed },
        ],
      },
    ],
  };

  const form2033D: LiasseForm = {
    id: "2033-D",
    title: "2033-D — Provisions, amortissements dérogatoires et déficits",
    sections: [
      {
        title: "Amortissements réputés différés et déficits",
        lines: [
          { code: "970", label: "Amortissements différés (art. 39 C) — stock au 31/12", amount: i.newDeferredCarry },
          { code: "980", label: "Déficits LMNP antérieurs imputés sur l'exercice", amount: i.deficitsUsed },
          { code: "982", label: "Déficits LMNP restant à reporter", amount: i.remainingDeficits },
          { code: "990", label: "Provisions (néant)", amount: 0 },
        ],
      },
    ],
  };

  const form2033E: LiasseForm = {
    id: "2033-E",
    title: "2033-E — Détermination de la valeur ajoutée",
    sections: [
      {
        title: "Valeur ajoutée produite",
        lines: [
          { code: "110", label: "Chiffre d'affaires", amount: i.grossRevenue },
          { code: "130", label: "Consommations de biens et services (charges externes)", amount: round2(i.expenseGroups.filter((g) => g.label !== "Impôts et taxes" && g.label !== "Charges financières (intérêts d'emprunt)").reduce((a, g) => a + g.amount, 0)) },
          { code: "117", label: "Valeur ajoutée", amount: round2(i.grossRevenue - i.expenseGroups.filter((g) => g.label !== "Impôts et taxes" && g.label !== "Charges financières (intérêts d'emprunt)").reduce((a, g) => a + g.amount, 0)) },
        ],
      },
    ],
  };

  return [form2031, form2033A, form2033B, form2033C, form2033D, form2033E];
}

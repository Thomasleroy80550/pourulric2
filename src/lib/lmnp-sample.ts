import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SavedInvoice } from "./admin-api";
import { Expense } from "./expenses-api";
import { LmnpFixedAsset, LmnpSettings } from "./lmnp-api";
import { computeLmnpYear, LmnpComputation } from "./lmnp-engine";

/**
 * Jeu de données fictif mais réaliste pour générer un « bilan de test »
 * à faire valider par un expert-comptable. Il couvre :
 * - 12 relevés mensuels avec saisonnalité (recettes + frais de gestion)
 * - des charges de toutes les catégories (copro, assurance, énergie, intérêts…)
 * - 4 immobilisations (bâti, frais d'acquisition, travaux, mobilier)
 * - des déficits antérieurs pour tester leur imputation
 */
export function buildSampleLmnpData(year: number): {
  computation: LmnpComputation;
  settings: LmnpSettings;
} {
  const settings: LmnpSettings = {
    user_id: "specimen",
    declarant_name: "Jean DUPONT (EXEMPLE — DONNÉES FICTIVES)",
    siret: "912 345 678 00019",
    activity_start_date: `${year - 2}-04-01`,
    property_address: "12 rue de la Plage, 62600 Berck-sur-Mer",
    regime: "reel_simplifie",
    deferred_amortization: 0,
    prior_deficits: 1200,
  };

  // Recettes mensuelles avec saisonnalité (station balnéaire)
  const monthlyGross = [900, 950, 1200, 1500, 1800, 2600, 3400, 3600, 2200, 1400, 1000, 1100];
  const statements: SavedInvoice[] = monthlyGross.map((gross, m) => {
    const fees = Math.round(gross * 0.22 * 100) / 100; // commission de gestion 22 %
    return {
      id: `specimen-${m}`,
      user_id: "specimen",
      period: format(new Date(year, m, 1), "MMMM yyyy", { locale: fr }),
      invoice_data: [],
      totals: {
        totalRevenuGenere: gross,
        totalFacture: fees,
        totalMontantVerse: Math.round((gross - fees) * 100) / 100,
      },
      created_at: new Date(year, m, 28).toISOString(),
      profiles: { first_name: "Jean", last_name: "Dupont" },
    };
  });

  const mkExpense = (
    idx: number,
    amount: number,
    description: string,
    category: string,
    month: number,
    day = 15,
  ): Expense => ({
    id: `specimen-exp-${idx}`,
    user_id: "specimen",
    amount,
    description,
    category,
    expense_date: format(new Date(year, month, day), "yyyy-MM-dd"),
    created_at: new Date(year, month, day).toISOString(),
  });

  const expenses: Expense[] = [
    mkExpense(1, 186, "Assurance PNO annuelle", "Assurance (PNO / habitation)", 0),
    mkExpense(2, 300, "Charges de copropriété T1", "Charges de copropriété", 0),
    mkExpense(3, 300, "Charges de copropriété T2", "Charges de copropriété", 3),
    mkExpense(4, 300, "Charges de copropriété T3", "Charges de copropriété", 6),
    mkExpense(5, 300, "Charges de copropriété T4", "Charges de copropriété", 9),
    mkExpense(6, 210, "Électricité T1", "Énergie (élec, gaz, eau)", 2),
    mkExpense(7, 210, "Électricité T2", "Énergie (élec, gaz, eau)", 5),
    mkExpense(8, 210, "Électricité T3", "Énergie (élec, gaz, eau)", 8),
    mkExpense(9, 210, "Électricité T4", "Énergie (élec, gaz, eau)", 11),
    mkExpense(10, 359.88, "Box internet fibre (12 mois)", "Internet / Box", 11),
    mkExpense(11, 980, "Taxe foncière", "Taxe foncière", 9),
    mkExpense(12, 310, "Cotisation foncière des entreprises (CFE)", "Taxe foncière", 11),
    mkExpense(13, 2840, "Intérêts d'emprunt + assurance emprunteur", "Crédit / Prêt immobilier", 11, 31),
    mkExpense(14, 420, "Remplacement chauffe-eau (réparation)", "Entretien / Réparations", 4),
  ];

  const acquisition = `${year - 2}-04-01`;
  const assets: LmnpFixedAsset[] = [
    {
      id: "specimen-asset-1",
      user_id: "specimen",
      label: "Appartement — part bâti (85 % du prix d'achat)",
      category: "Bâti (hors terrain)",
      acquisition_date: acquisition,
      amount: 148750,
      duration_years: 30,
      created_at: acquisition,
    },
    {
      id: "specimen-asset-2",
      user_id: "specimen",
      label: "Frais de notaire et d'agence",
      category: "Frais d'acquisition (notaire, agence)",
      acquisition_date: acquisition,
      amount: 13900,
      duration_years: 30,
      created_at: acquisition,
    },
    {
      id: "specimen-asset-3",
      user_id: "specimen",
      label: "Travaux de rénovation (salle de bain, peintures)",
      category: "Travaux / Aménagements",
      acquisition_date: `${year - 2}-05-15`,
      amount: 16400,
      duration_years: 10,
      created_at: acquisition,
    },
    {
      id: "specimen-asset-4",
      user_id: "specimen",
      label: "Mobilier et électroménager",
      category: "Mobilier / Équipement",
      acquisition_date: `${year - 2}-05-20`,
      amount: 7800,
      duration_years: 7,
      created_at: acquisition,
    },
  ];

  const computation = computeLmnpYear(year, statements, expenses, assets, settings);
  return { computation, settings };
}

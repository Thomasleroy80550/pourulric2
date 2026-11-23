export interface SeasonPeriod {
  /** Premier et dernier jour de la période, inclus (yyyy-MM-dd). */
  start: string;
  end: string;
  label: string;
  /** Séjour minimum proposé par défaut, en nuits ; null quand la période est fermée à la location. */
  minStay: number | null;
}

export const SEASON_2027_YEAR = 2027;

export const SEASON_2027_PERIODS: SeasonPeriod[] = [
  { start: "2027-01-01", end: "2027-01-03", label: "Nouvel An", minStay: 3 },
  { start: "2027-01-04", end: "2027-02-04", label: "Fermeture", minStay: null },
  { start: "2027-02-05", end: "2027-02-07", label: "Moyenne saison", minStay: 2 },
  { start: "2027-02-08", end: "2027-03-07", label: "Vacances d'hiver", minStay: 2 },
  { start: "2027-03-08", end: "2027-03-25", label: "Basse saison", minStay: 2 },
  { start: "2027-03-26", end: "2027-03-29", label: "Pâques", minStay: 3 },
  { start: "2027-03-30", end: "2027-04-02", label: "Moyenne saison", minStay: 2 },
  { start: "2027-04-03", end: "2027-05-05", label: "Vacances de printemps", minStay: 3 },
  { start: "2027-05-06", end: "2027-05-09", label: "Pont de l'Ascension", minStay: 4 },
  { start: "2027-05-10", end: "2027-05-13", label: "Moyenne saison", minStay: 2 },
  { start: "2027-05-14", end: "2027-05-17", label: "Pentecôte", minStay: 3 },
  { start: "2027-05-18", end: "2027-07-02", label: "Moyenne / pré-été", minStay: 2 },
  { start: "2027-07-03", end: "2027-07-09", label: "Début d'été", minStay: 3 },
  { start: "2027-07-10", end: "2027-08-20", label: "Très haute saison", minStay: 7 },
  { start: "2027-08-21", end: "2027-08-27", label: "Haute saison", minStay: 3 },
  { start: "2027-08-28", end: "2027-09-30", label: "Arrière-saison", minStay: 2 },
  { start: "2027-10-01", end: "2027-10-22", label: "Basse saison", minStay: 2 },
  { start: "2027-10-23", end: "2027-11-01", label: "Vacances de Toussaint", minStay: 3 },
  { start: "2027-11-02", end: "2027-11-10", label: "Basse saison", minStay: 2 },
  { start: "2027-11-11", end: "2027-11-14", label: "Pont de l'Armistice", minStay: 3 },
  { start: "2027-11-15", end: "2027-12-17", label: "Basse saison", minStay: 2 },
  { start: "2027-12-18", end: "2027-12-26", label: "Noël", minStay: 3 },
  { start: "2027-12-27", end: "2027-12-31", label: "Nouvel An", minStay: 4 },
  { start: "2028-01-01", end: "2028-01-04", label: "Nouvel An", minStay: 4 },
];

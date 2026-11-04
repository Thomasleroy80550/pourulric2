import type { HivernageInstructions } from '@/lib/hivernage-api';

export const WINTER_SEASON = '2026–2027';
export const WINTER_FORM_PATH = '/hivernage-2027';
export const WINTER_NOTICE = 'Du dimanche 3 janvier au vendredi 5 février 2027, Hello Keys sera en vacances. Vos calendriers seront fermés à la location durant cette période. Votre espace reste accessible, mais nos délais de réponse pourront être allongés. Merci de votre compréhension !';

export function isWinterSeasonActive() {
  return Date.now() < new Date('2027-02-06T00:00:00+01:00').getTime();
}

export const WINTER_ACTIONS = [
  { key: 'cut_water', label: "Couper l’eau", description: 'Fermer l’arrivée d’eau du logement.' },
  { key: 'cut_water_heater', label: 'Couper le chauffe-eau', description: 'Arrêter la production d’eau chaude.' },
  { key: 'heating_frost_mode', label: 'Chauffage en hors-gel', description: 'Maintenir le logement protégé du gel.' },
  { key: 'empty_fridge', label: 'Vider le réfrigérateur', description: 'Retirer les denrées avant notre départ.' },
  { key: 'close_shutters', label: 'Fermer les volets', description: 'Fermer les volets du logement.' },
] as const;

export function winterClosureSummary(instructions: HivernageInstructions): string {
  if (instructions.close_for_winter === undefined) return 'Fermeture hivernale non précisée';
  if (!instructions.close_for_winter) return 'Pas de fermeture supplémentaire souhaitée (hors vacances Hello Keys)';
  const format = (date?: string) => date ? new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR') : '—';
  return `Fermeture souhaitée du ${format(instructions.closure_start)} au ${format(instructions.closure_end)} inclus`;
}

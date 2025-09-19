import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Formate une chaîne de date de manière sécurisée, en gérant les valeurs null/undefined/invalides.
 * @param dateString La chaîne de date à formater (de préférence au format ISO 8601).
 * @param formatStr La chaîne de format pour date-fns.
 * @returns La date formatée ou une chaîne de secours ('N/A', 'Date invalide').
 */
export const safeFormat = (dateString: string | null | undefined, formatStr: string): string => {
  if (!dateString) {
    return 'N/A';
  }
  
  // Tente de parser la date comme une chaîne ISO 8601, ce qui est le plus courant pour les API.
  const date = parseISO(dateString);
  
  if (isValid(date)) {
    return format(date, formatStr, { locale: fr });
  }

  // En cas d'échec, essaie avec le constructeur Date standard.
  const fallbackDate = new Date(dateString);
  if (isValid(fallbackDate)) {
    return format(fallbackDate, formatStr, { locale: fr });
  }

  // Si tout échoue, retourne une erreur claire.
  console.warn(`safeFormat: La chaîne de date "${dateString}" est invalide.`);
  return 'Date invalide';
};
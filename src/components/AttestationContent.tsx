import React, { forwardRef } from 'react';
import { UserProfile } from '@/lib/profile-api';
import { format, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AttestationContentProps {
  profile: UserProfile;
  ownerAddress?: string;
  exclusiveRental?: boolean;
  contractExcludesPersonalUse?: boolean;
  contractReference?: string;
  propertyAddressOverride?: {
    address?: string;
    city?: string;
    zip?: string;
  };
  attestationYear?: number;
}

const AttestationContent = forwardRef<HTMLDivElement, AttestationContentProps>(
  ({ profile, ownerAddress, exclusiveRental = false, contractExcludesPersonalUse = false, contractReference, propertyAddressOverride, attestationYear }, ref) => {
    const today = format(new Date(), 'PPP', { locale: fr });
    const displayYear = attestationYear ?? new Date().getFullYear();
    const contractStartDate =
      profile.contract_start_date && isValid(parseISO(profile.contract_start_date))
        ? format(parseISO(profile.contract_start_date), 'PPP', { locale: fr })
        : 'Non renseignée';
    const propertyAddress = propertyAddressOverride?.address ?? profile.property_address ?? 'Non renseignée';
    const propertyCity = propertyAddressOverride?.city ?? profile.property_city ?? '';
    const propertyZip = propertyAddressOverride?.zip ?? profile.property_zip_code ?? '';
    const ownerFullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

    return (
      <div ref={ref} className="p-10 bg-white text-black font-serif text-sm leading-relaxed" style={{ width: '21cm', minHeight: '29.7cm' }}>
        <header className="text-center mb-6">
          <img src="/logo.png" alt="Hello Keys Logo" className="w-32 mx-auto mb-3" />
          <h1 className="text-xl font-bold uppercase">Attestation d'affectation exclusivement locative</h1>
          <p className="mt-2">Déclaration sur l'honneur du propriétaire — Année {displayYear}</p>
          <p className="text-xs mt-2">Gestionnaire indiqué : HELLO KEYS – SARL – 1 Rue Carnot – 80550 Le Crotoy</p>
        </header>

        <section className="mb-5">
          <h2 className="font-bold uppercase mb-2">Identification du propriétaire et du logement</h2>
          <p><strong>Nom et prénom :</strong> {ownerFullName || 'Non renseigné'}</p>
          <p><strong>Adresse du propriétaire :</strong> {ownerAddress || 'Non renseignée'}</p>
          <p><strong>Email :</strong> {profile.email || 'Non renseigné'}</p>
          <p><strong>Adresse du bien :</strong> {propertyAddress}, {propertyZip} {propertyCity}</p>
          <p><strong>Date de début du contrat renseignée au profil :</strong> {contractStartDate}</p>
          <p><strong>Contrat signé / clause ou avenant :</strong> {contractReference || 'Non renseigné'}</p>
        </section>

        <section className="mb-5 text-justify">
          <h2 className="font-bold uppercase mb-2">Déclaration d'absence de jouissance personnelle</h2>
          {exclusiveRental && contractExcludesPersonalUse ? (
            <>
              <p className="mb-2">Je soussigné(e), {ownerFullName}, déclare sur l'honneur que le logement identifié ci-dessus est exclusivement affecté à la location meublée saisonnière pour l'année {displayYear}, y compris au 1er janvier de cette année.</p>
              <p className="mb-2">Je ne l'occupe pas à titre personnel et ne m'en réserve pas la disposition ou la jouissance, même en dehors des périodes effectivement louées. Je ne dispose pas de la possibilité de le réserver pour moi-même ou de l'utiliser comme résidence secondaire.</p>
              <p>Je déclare que le contrat de gestion signé avec Hello Keys, ou son avenant référencé ci-dessus, exclut expressément mon accès au logement pour un usage personnel et toute faculté de jouissance personnelle pendant la période déclarée. Ce contrat et les justificatifs de l'exploitation locative sont à joindre à cette déclaration.</p>
            </>
          ) : (
            <p>Les déclarations d'affectation exclusivement locative et d'exclusion contractuelle de l'usage personnel n'ont pas été confirmées. Ce document incomplet ne vaut pas attestation d'absence de jouissance personnelle.</p>
          )}
        </section>

        <section className="mb-5 text-justify">
          <h2 className="font-bold uppercase mb-2">Objet : examen de la situation au regard de la taxe d'habitation</h2>
          <p>Cette déclaration est destinée à appuyer une demande d'examen de l'assujettissement à la taxe d'habitation sur les résidences secondaires. L'absence de séjour ne suffit pas à elle seule si le propriétaire conserve la possibilité de disposer du bien. L'administration fiscale apprécie les conditions applicables et les justificatifs ; aucune exonération n'est garantie par ce document.</p>
        </section>

        <section className="mb-5">
          <h2 className="font-bold uppercase mb-2">Pièces et démarches à prévoir</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Contrat de gestion signé et clause ou avenant excluant explicitement l'usage personnel, couvrant la période déclarée.</li>
            <li>Justificatifs de mise en location et de gestion : annonces, calendrier de disponibilité, réservations, relevés de gestion.</li>
            <li>Demande ou réclamation auprès du service des impôts compétent, accompagnée de ces pièces ; déclaration d'occupation selon les modalités demandées, notamment via « Gérer mes biens immobiliers ».</li>
          </ul>
        </section>

        <section className="mt-6">
          <p>Fait à : .........................................., le {today}</p>
          <p className="mt-3">Signature du propriétaire, précédée de la mention « Lu et certifié exact » :</p>
          <div className="h-16" />
        </section>

        <footer className="border-t pt-3 text-xs text-gray-700">
          Document établi à partir des déclarations du propriétaire, à signer avant transmission. Il ne constitue ni une certification des faits par Hello Keys, ni un avenant au contrat ou aux CGUV, ni une décision fiscale. Toute déclaration doit correspondre à la situation réelle et aux stipulations du contrat signé.
        </footer>
      </div>
    );
  }
);

export default AttestationContent;

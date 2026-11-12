import React, { forwardRef } from 'react';
import { UserProfile } from '@/lib/profile-api';
import { format, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AttestationContentProps {
  profile: UserProfile;
  ownerAddress?: string;
  exclusiveRental?: boolean;
  propertyAddressOverride?: {
    address?: string;
    city?: string;
    zip?: string;
  };
  attestationYear?: number;
}

const AttestationContent = forwardRef<HTMLDivElement, AttestationContentProps>(
  ({ profile, ownerAddress, exclusiveRental = false, propertyAddressOverride, attestationYear }, ref) => {
    const today = format(new Date(), 'PPP', { locale: fr });
    const displayYear = attestationYear ?? new Date().getFullYear();
    const cguvAcceptedDate =
      profile.cguv_accepted_at && isValid(parseISO(profile.cguv_accepted_at))
        ? format(parseISO(profile.cguv_accepted_at), 'PPP', { locale: fr })
        : 'Non renseignée';
    const propertyAddress = propertyAddressOverride?.address ?? profile.property_address ?? 'Non renseignée';
    const propertyCity = propertyAddressOverride?.city ?? profile.property_city ?? '';
    const propertyZip = propertyAddressOverride?.zip ?? profile.property_zip_code ?? '';
    const ownerFullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

    return (
      <div ref={ref} className="p-10 bg-white text-black font-serif text-sm leading-relaxed" style={{ width: '21cm', minHeight: '29.7cm' }}>
        <header className="text-center mb-6">
          <img src="/logo.png" alt="Hello Keys Logo" className="w-32 mx-auto mb-3" />
          <h1 className="text-xl font-bold uppercase">Attestation d'usage locatif</h1>
          <p className="mt-2">Déclaration sur l'honneur du propriétaire — Année {displayYear}</p>
          <p className="text-xs mt-2">Gestionnaire indiqué : HELLO KEYS – SARL – 1 Rue Carnot – 80550 Le Crotoy</p>
        </header>

        <section className="mb-5">
          <h2 className="font-bold uppercase mb-2">Identification du propriétaire et du logement</h2>
          <p><strong>Nom et prénom :</strong> {ownerFullName || 'Non renseigné'}</p>
          <p><strong>Adresse du propriétaire :</strong> {ownerAddress || 'Non renseignée'}</p>
          <p><strong>Email :</strong> {profile.email || 'Non renseigné'}</p>
          <p><strong>Adresse du bien :</strong> {propertyAddress}, {propertyZip} {propertyCity}</p>
          <p><strong>Date d'acceptation des CGUV enregistrée au profil :</strong> {cguvAcceptedDate}</p>
          <p><strong>Version des CGUV enregistrée au profil :</strong> {profile.cguv_version || 'Non renseignée'}</p>
        </section>

        <section className="mb-5 text-justify">
          <h2 className="font-bold uppercase mb-2">Déclaration d'usage du logement</h2>
          {exclusiveRental && profile.cguv_accepted_at ? (
            <>
              <p className="mb-2">Je soussigné(e), {ownerFullName}, déclare sur l'honneur affecter le logement identifié ci-dessus uniquement à la location meublée saisonnière pour l'année {displayYear}, y compris au 1er janvier de cette année, dans le cadre des services de Hello Keys régis par les CGUV acceptées.</p>
              <p className="mb-2">Je déclare n'y effectuer aucun séjour personnel et ne réserver aucune période à mon usage pour l'année indiquée, y compris en dehors des périodes effectivement louées.</p>
              <p>Cette déclaration porte sur l'usage déclaré du logement. Elle n'atteste pas que les CGUV suppriment toute possibilité d'usage personnel et ne constitue pas une renonciation contractuelle à cette possibilité.</p>
            </>
          ) : (
            <p>La déclaration d'usage locatif ou l'acceptation des CGUV n'est pas renseignée. Ce document incomplet ne vaut pas attestation d'usage locatif.</p>
          )}
        </section>

        <section className="mb-5 text-justify">
          <h2 className="font-bold uppercase mb-2">Portée des CGUV</h2>
          <p>Les CGUV actuellement consultables prévoient une notification préalable des séjours du Client (article 4.4) et une reprise de possession aux périodes qui lui sont expressément réservées (article 7.1.3). Elles ne prévoient donc pas une exclusion générale de l'usage personnel. La version effectivement acceptée et sa preuve d'acceptation doivent être jointes au dossier ; la date et la version ci-dessus reproduisent les informations enregistrées au profil.</p>
        </section>

        <section className="mb-5 text-justify">
          <h2 className="font-bold uppercase mb-2">Objet : examen de la situation au regard de la taxe d'habitation</h2>
          <p>Cette déclaration est destinée à appuyer une demande d'examen de l'assujettissement à la taxe d'habitation sur les résidences secondaires. L'absence de séjour ne suffit pas à elle seule si le propriétaire conserve la possibilité de disposer du bien. L'administration fiscale apprécie les conditions applicables et les justificatifs ; aucune exonération n'est garantie par ce document.</p>
        </section>

        <section className="mb-5">
          <h2 className="font-bold uppercase mb-2">Pièces et démarches à prévoir</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Version des CGUV acceptée et preuve de leur acceptation dans l'espace client.</li>
            <li>Justificatifs de mise en location et de gestion : annonces, calendrier de disponibilité, réservations, relevés de gestion.</li>
            <li>Demande au service des impôts compétent précisant les éléments supplémentaires nécessaires pour justifier l'absence de disposition personnelle ; déclaration d'occupation selon les modalités demandées, notamment via « Gérer mes biens immobiliers ».</li>
          </ul>
        </section>

        <section className="mt-6">
          <p>Fait à : .........................................., le {today}</p>
          <p className="mt-3">Signature du propriétaire, précédée de la mention « Lu et certifié exact » :</p>
          <div className="h-16" />
        </section>

        <footer className="border-t pt-3 text-xs text-gray-700">
          Document établi à partir des déclarations du propriétaire, à signer avant transmission. Il ne constitue ni une certification des faits par Hello Keys, ni une modification des CGUV acceptées, ni une décision fiscale. Toute déclaration doit correspondre à la situation réelle. L'acceptation des CGUV ne garantit aucune exonération.
        </footer>
      </div>
    );
  }
);

export default AttestationContent;

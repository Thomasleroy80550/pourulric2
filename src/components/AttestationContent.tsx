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
      <div ref={ref} className="p-8 bg-white text-black font-serif text-[12px] leading-[1.4]" style={{ width: '21cm', minHeight: '29.7cm' }}>
        <header className="text-center mb-4">
          <img src="/logo.png" alt="Hello Keys Logo" className="w-24 mx-auto mb-2" />
          <h1 className="flex justify-center flex-wrap gap-x-2 text-lg font-bold uppercase leading-normal">
            <span>Attestation</span>
            <span>d'usage</span>
            <span>locatif</span>
          </h1>
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
              <p>Je certifie l'exactitude des renseignements et des faits déclarés dans la présente attestation.</p>
            </>
          ) : (
            <p>La déclaration d'usage locatif ou l'acceptation des CGUV n'est pas renseignée. Ce document incomplet ne vaut pas attestation d'usage locatif.</p>
          )}
        </section>

        <section className="mb-5 text-justify">
          <h2 className="font-bold uppercase mb-2">Destination de l'attestation</h2>
          <p>La présente déclaration est établie pour être transmise à l'administration fiscale dans le cadre de l'examen de la situation du logement au regard de la taxe d'habitation, au titre de l'année {displayYear}.</p>
        </section>

        <section className="mt-6">
          <p>Fait à : .........................................., le {today}</p>
          <p className="mt-3">Signature du propriétaire, précédée de la mention « Lu et certifié exact » :</p>
          <div className="h-16" />
        </section>
      </div>
    );
  }
);

export default AttestationContent;

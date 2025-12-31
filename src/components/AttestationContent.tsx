import React, { forwardRef } from 'react';
import { UserProfile } from '@/lib/profile-api';
import { format, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AttestationContentProps {
  profile: UserProfile;
  ownerAddress?: string;
  occasionalStay?: boolean;
  propertyAddressOverride?: {
    address?: string;
    city?: string;
    zip?: string;
  };
  attestationYear?: number;
}

const AttestationContent = forwardRef<HTMLDivElement, AttestationContentProps>(
  ({ profile, ownerAddress, occasionalStay = false, propertyAddressOverride, attestationYear }, ref) => {
    const today = format(new Date(), 'PPP', { locale: fr });
    const displayYear = attestationYear ?? new Date().getFullYear();

    const contractStartDate =
      profile.contract_start_date && isValid(parseISO(profile.contract_start_date))
        ? format(parseISO(profile.contract_start_date), 'PPP', { locale: fr })
        : 'date inconnue';

    const propertyAddress = propertyAddressOverride?.address ?? profile.property_address ?? 'Non renseignée';
    const propertyCity = propertyAddressOverride?.city ?? profile.property_city ?? '';
    const propertyZip = propertyAddressOverride?.zip ?? profile.property_zip_code ?? '';

    const ownerFullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

    return (
      <div
        ref={ref}
        className="p-12 bg-white text-black font-serif"
        style={{ width: '21cm', minHeight: '29.7cm' }}
      >
        {/* En-tête */}
        <div className="mb-10">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="Hello Keys Logo" className="w-40 mx-auto mb-4" />
            <h1 className="text-2xl font-bold tracking-wider uppercase">
              Attestation de Gestion Locative Saisonnière
            </h1>
          </div>
          <div className="text-sm text-center">
            <p><strong>HELLO KEYS</strong> – SARL – 1 Rue Carnot – 80550 Le Crotoy</p>
          </div>
        </div>

        {/* Informations du propriétaire */}
        <div className="mb-8 text-base">
          <h2 className="text-lg font-semibold uppercase tracking-wide mb-3">Informations du propriétaire</h2>
          <p className="mb-1"><strong>Nom et prénom :</strong> {ownerFullName || 'Non renseigné'}</p>
          <p className="mb-1"><strong>Adresse du propriétaire :</strong> {ownerAddress || 'Non renseignée'}</p>
          <p className="mb-1"><strong>Email :</strong> {profile.email || 'Non renseigné'}</p>
        </div>

        {/* Informations du logement */}
        <div className="mb-8 text-base">
          <h2 className="text-lg font-semibold uppercase tracking-wide mb-3">Informations du logement</h2>
          <p className="mb-1">
            <strong>Adresse du bien :</strong> {propertyAddress}, {propertyZip} {propertyCity}
          </p>
          <p className="mb-1">
            <strong>Cadre de gestion :</strong> Location meublée saisonnière, exploitation confiée à Hello Keys
          </p>
          <p className="mb-1">
            <strong>Contrat de prestation :</strong> débuté le {contractStartDate}
          </p>
        </div>

        {/* Rappel du cadre CGUV / Contexte */}
        <div className="mb-8 text-base text-justify leading-relaxed">
          <h2 className="text-lg font-semibold uppercase tracking-wide mb-3">Rappel du cadre CGUV / Contexte</h2>
          <p className="mb-4">
            Le logement est régi par les <strong>Conditions Générales d'Utilisation et de Vente (CGUV)</strong> de Hello Keys.
            Ces CGUV encadrent l'exploitation du bien en <strong>location meublée saisonnière</strong>, sans mise à disposition
            personnelle du propriétaire pendant les périodes confiées à Hello Keys.
          </p>
          <p>
            Conformément aux CGUV, le propriétaire <strong>ne réserve pas la jouissance du logement</strong> durant les périodes
            de gestion. Le bien est <strong>exclusivement destiné à la location saisonnière</strong> et exploité par Hello Keys.
          </p>
        </div>

        {/* Attestation d'absence de jouissance personnelle */}
        <div className="mb-8 text-base text-justify leading-relaxed">
          <h2 className="text-lg font-semibold uppercase tracking-wide mb-3">Attestation d'absence de jouissance personnelle</h2>
          <p className="mb-4">
            Nous attestons que, dans le cadre de la gestion locative saisonnière par Hello Keys, le bien susmentionné
            <strong> n'est pas occupé par le propriétaire au 1er janvier</strong> de l'année {displayYear}. Cette attestation peut
            constituer un justificatif auprès de l'administration fiscale, sous réserve de l'examen de la situation du contribuable.
          </p>
          <p className="italic text-sm">
            Informations complémentaires déclarées par le propriétaire — Séjours occasionnels du propriétaire :{' '}
            <strong>{occasionalStay ? 'Oui' : 'Non'}</strong>
          </p>
        </div>

        {/* Signature / cachet Hello Keys */}
        <div className="mt-16 text-right text-base">
          <p>Fait à Le Crotoy, le {today}</p>
          <p className="mt-6">La Gérance</p>
          <p className="font-semibold">HELLO KEYS</p>
        </div>

        {/* Disclaimer */}
        <div className="mt-10 text-xs text-gray-700 border-t pt-4">
          <p className="italic">
            Disclaimer : Hello Keys n'est pas responsable de vos déclarations fiscales et des conséquences qui en découlent. Cette attestation
            est délivrée à titre informatif et ne modifie pas la portée juridique du contrat de prestation ni des CGUV applicables.
          </p>
        </div>
      </div>
    );
  }
);

export default AttestationContent;
import React, { forwardRef } from 'react';
import { UserProfile } from '@/lib/profile-api';
import { format, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AttestationContentProps {
  profile: UserProfile;
}

const AttestationContent = forwardRef<HTMLDivElement, AttestationContentProps>(({ profile }, ref) => {
  const contractStartDate = profile.contract_start_date && isValid(parseISO(profile.contract_start_date))
    ? format(parseISO(profile.contract_start_date), 'PPP', { locale: fr })
    : 'date inconnue';

  return (
    <div ref={ref} className="p-12 bg-white text-black font-serif" style={{ width: '21cm', minHeight: '29.7cm' }}>
      <div className="text-center mb-12">
        <img src="/logo.png" alt="Hello Keys Logo" className="w-48 mx-auto mb-6" />
        <h1 className="text-2xl font-bold tracking-wider uppercase">Attestation de Prestation de Services</h1>
      </div>

      <div className="my-10 text-base">
        <p className="mb-6 text-right">
          Fait à Le Crotoy, le {format(new Date(), 'PPP', { locale: fr })}
        </p>
        <p className="mb-2">
          <strong>Client :</strong> {profile.first_name} {profile.last_name}
        </p>
        <p className="mb-6">
          <strong>Adresse du bien géré :</strong> {profile.property_address || 'Non renseignée'}, {profile.property_zip_code || ''} {profile.property_city || ''}
        </p>
      </div>

      <div className="my-10 text-base text-justify leading-relaxed">
        <p>
          Nous soussignés, <strong>HELLO KEYS</strong>, société à responsabilité limitée, sise 1 Rue Carnot 80550 Le Crotoy, attestons par la présente que <strong>{profile.first_name} {profile.last_name}</strong>, propriétaire du bien sis à l'adresse susmentionnée, est client de nos services de conciergerie et de gestion locative.
        </p>
        <p className="mt-6">
          Le contrat de prestation de services a débuté le {contractStartDate}.
        </p>
        <p className="mt-6">
          Cette attestation est délivrée pour servir et valoir ce que de droit.
        </p>
      </div>

      <div className="mt-24 text-right text-base">
        <p>La Gérance</p>
        <p className="font-semibold">HELLO KEYS</p>
      </div>
    </div>
  );
});

export default AttestationContent;
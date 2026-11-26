import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import AttestationContent from '@/components/AttestationContent';
import { UserProfile } from '@/lib/profile-api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface AttestationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile | null;
}

const AttestationFormDialog: React.FC<AttestationFormDialogProps> = ({ open, onOpenChange, profile }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyCity, setPropertyCity] = useState('');
  const [propertyZip, setPropertyZip] = useState('');
  const [occasionalStay, setOccasionalStay] = useState(false);
  const [exclusiveRental, setExclusiveRental] = useState(false);
  const [acknowledgesCguvLimits, setAcknowledgesCguvLimits] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [attestationYear, setAttestationYear] = useState<string>(String(new Date().getFullYear()));

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPropertyAddress(profile.property_address || '');
      setPropertyCity(profile.property_city || '');
      setPropertyZip(profile.property_zip_code || '');
      setAttestationYear(String(new Date().getFullYear()));
      setOccasionalStay(false);
      setExclusiveRental(false);
      setAcknowledgesCguvLimits(false);
    }
  }, [profile, open]);

  const canGenerate = useMemo(() => {
    const year = Number(attestationYear);
    return !!profile?.cguv_accepted_at && [firstName, lastName, ownerAddress, propertyAddress, propertyCity, propertyZip].every((value) => value.trim())
      && Number.isInteger(year) && year >= 2000 && year <= 2100
      && exclusiveRental && acknowledgesCguvLimits && !occasionalStay;
  }, [profile, firstName, lastName, ownerAddress, propertyAddress, propertyCity, propertyZip, attestationYear, exclusiveRental, acknowledgesCguvLimits, occasionalStay]);

  const handleGenerate = async () => {
    if (!profile || !canGenerate) return;
    setGenerating(true);

    const el = printRef.current;
    if (!el) {
      setGenerating(false);
      return;
    }

    try {
      await document.fonts.ready;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: el.scrollWidth,
        height: el.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const scale = Math.min(
        (pdfWidth - margin * 2) / canvas.width,
        (pdfHeight - margin * 2) / canvas.height,
      );
      const imgWidth = canvas.width * scale;
      const imgHeight = canvas.height * scale;
      pdf.addImage(imgData, 'JPEG', (pdfWidth - imgWidth) / 2, margin, imgWidth, imgHeight);

      const fileName = `attestation-hellokeys-${(lastName || profile.last_name || 'client').toLowerCase()}.pdf`;
      pdf.save(fileName);

      onOpenChange(false);
      toast.success('Attestation téléchargée : signez-la et joignez vos justificatifs.');
    } catch {
      toast.error("Impossible de générer l'attestation. Veuillez réessayer.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Attestation d'usage locatif</DialogTitle>
          <DialogDescription>
            Déclaration du propriétaire pour votre dossier de taxe d'habitation, avec les informations d'acceptation des CGUV enregistrées dans votre profil. Confirmez uniquement des faits exacts.
          </DialogDescription>
        </DialogHeader>

        {/* Aperçu caché de l'attestation pour la capture PDF */}
        <div className="fixed -left-[9999px] top-0 w-[1024px] bg-white">
          <AttestationContent
            ref={printRef}
            profile={{ ...profile!, first_name: firstName, last_name: lastName }}
            ownerAddress={ownerAddress}
            exclusiveRental={exclusiveRental && !occasionalStay}
            propertyAddressOverride={{
              address: propertyAddress,
              city: propertyCity,
              zip: propertyZip,
            }}
            attestationYear={Number(attestationYear)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Prénom</Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Nom</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ownerAddress">Adresse du propriétaire</Label>
            <Input id="ownerAddress" value={ownerAddress} onChange={(e) => setOwnerAddress(e.target.value)} placeholder="Numéro et rue, code postal, ville" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="propertyAddress">Adresse du logement</Label>
            <Input id="propertyAddress" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="propertyZip">Code postal</Label>
            <Input id="propertyZip" value={propertyZip} onChange={(e) => setPropertyZip(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="propertyCity">Ville</Label>
            <Input id="propertyCity" value={propertyCity} onChange={(e) => setPropertyCity(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attestationYear">Année</Label>
            <Input
              id="attestationYear"
              type="number"
              min="2000"
              max="2100"
              value={attestationYear}
              onChange={(e) => setAttestationYear(e.target.value.replace(/[^\d]/g, ''))}
              placeholder={String(new Date().getFullYear())}
            />
          </div>

          <div className="md:col-span-2 rounded-md border p-3 text-sm space-y-1">
            <p className="font-medium">CGUV acceptées dans votre espace client</p>
            <p>Date enregistrée : {profile?.cguv_accepted_at && !Number.isNaN(Date.parse(profile.cguv_accepted_at)) ? new Date(profile.cguv_accepted_at).toLocaleDateString('fr-FR') : 'Non renseignée'}</p>
            <p>Version enregistrée : {profile?.cguv_version || 'Non renseignée'}</p>
            {!profile?.cguv_accepted_at && <p role="alert" className="text-destructive">Aucune acceptation des CGUV n'est enregistrée. Acceptez-les dans votre espace client ou contactez Hello Keys avant de générer l'attestation.</p>}
          </div>
          <div className="flex items-start gap-2 md:col-span-2">
            <Checkbox id="occasionalStay" checked={occasionalStay} onCheckedChange={(c) => setOccasionalStay(c === true)} />
            <Label htmlFor="occasionalStay">Je séjourne dans le logement ou je m'en réserve l'usage personnel pendant l'année indiquée.</Label>
          </div>
          {occasionalStay && (
            <p role="alert" className="md:col-span-2 text-sm text-destructive">
              Une occupation ou une possibilité d'usage personnel est incompatible avec cette attestation. Le téléchargement est bloqué ; contactez votre service des impôts pour examiner votre situation.
            </p>
          )}
          <div className="flex items-start gap-2 md:col-span-2">
            <Checkbox id="exclusiveRental" checked={exclusiveRental} onCheckedChange={(c) => setExclusiveRental(c === true)} />
            <Label htmlFor="exclusiveRental">Je déclare affecter le logement uniquement à la location, sans séjour personnel ni période réservée à mon usage pour l'année indiquée, y compris au 1er janvier.</Label>
          </div>
          <div className="flex items-start gap-2 md:col-span-2">
            <Checkbox id="acknowledgesCguvLimits" checked={acknowledgesCguvLimits} onCheckedChange={(c) => setAcknowledgesCguvLimits(c === true)} />
            <Label htmlFor="acknowledgesCguvLimits">Je comprends que l'acceptation des CGUV et l'absence de séjour ne prouvent pas, à elles seules, l'impossibilité d'un usage personnel et ne garantissent pas l'exonération.</Label>
          </div>
          <div className="md:col-span-2 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800/40 border rounded-md p-3 space-y-2">
            <p>Complétez tous les champs et cochez les deux confirmations pour télécharger le document, puis signez-le.</p>
            <p>Les CGUV actuellement consultables prévoient les séjours du propriétaire avec notification préalable (article 4.4) et les périodes qui lui sont expressément réservées (article 7.1.3). Elles n'excluent donc pas globalement l'usage personnel. Cette déclaration ne modifie pas les CGUV.</p>
            <p>Joignez la version des CGUV acceptée et sa preuve d'acceptation, ainsi que les justificatifs de location (annonces, calendrier, réservations ou relevés de gestion). Demandez au service des impôts quels éléments supplémentaires sont nécessaires pour justifier l'absence de disposition personnelle. Effectuez la déclaration d'occupation demandée, notamment via « Gérer mes biens immobiliers ».</p>
            <p>Seule l'administration fiscale apprécie votre situation. Si vous conservez la possibilité d'utiliser le logement, l'absence de séjour ne suffit pas à établir les conditions d'une exonération.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleGenerate} disabled={generating || !canGenerate}>
            {generating ? 'Génération…' : 'Télécharger l\'attestation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttestationFormDialog;
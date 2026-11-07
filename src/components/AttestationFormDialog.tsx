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
  const [contractExcludesPersonalUse, setContractExcludesPersonalUse] = useState(false);
  const [contractReference, setContractReference] = useState('');
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
      setContractExcludesPersonalUse(false);
      setContractReference('');
    }
  }, [profile, open]);

  const canGenerate = useMemo(() => {
    const year = Number(attestationYear);
    return !!profile && [firstName, lastName, ownerAddress, propertyAddress, propertyCity, propertyZip, contractReference].every((value) => value.trim())
      && Number.isInteger(year) && year >= 2000 && year <= 2100
      && exclusiveRental && contractExcludesPersonalUse && !occasionalStay;
  }, [profile, firstName, lastName, ownerAddress, propertyAddress, propertyCity, propertyZip, contractReference, attestationYear, exclusiveRental, contractExcludesPersonalUse, occasionalStay]);

  const handleGenerate = async () => {
    if (!profile || !canGenerate) return;
    setGenerating(true);

    const el = printRef.current;
    if (!el) {
      setGenerating(false);
      return;
    }

    try {
    const canvas = await html2canvas(el as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: (el as HTMLElement).scrollWidth,
      height: (el as HTMLElement).scrollHeight,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 10; // marges pour une meilleure lisibilité
    const targetWidth = pdfWidth - margin * 2;
    const imgHeight = (canvas.height * targetWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Première page
    pdf.addImage(imgData, 'JPEG', margin, margin + position, targetWidth, imgHeight);
    heightLeft -= (pdfHeight - margin * 2);

    // Pages suivantes
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, margin + position, targetWidth, imgHeight);
      heightLeft -= (pdfHeight - margin * 2);
    }

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
          <DialogTitle>Attestation d'affectation exclusivement locative</DialogTitle>
          <DialogDescription>
            Justificatif déclaratif pour votre dossier de taxe d'habitation. Confirmez uniquement des faits exacts et appuyés par votre contrat signé.
          </DialogDescription>
        </DialogHeader>

        {/* Aperçu caché de l'attestation pour la capture PDF */}
        <div className="fixed -left-[9999px] top-0 w-[1024px] bg-white">
          <AttestationContent
            ref={printRef}
            profile={{ ...profile!, first_name: firstName, last_name: lastName }}
            ownerAddress={ownerAddress}
            exclusiveRental={exclusiveRental && !occasionalStay}
            contractExcludesPersonalUse={contractExcludesPersonalUse}
            contractReference={contractReference}
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

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="contractReference">Référence du contrat signé / article excluant l'usage personnel</Label>
            <Input id="contractReference" value={contractReference} onChange={(e) => setContractReference(e.target.value)} placeholder="Contrat du …, article … ou avenant du …" />
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
            <Label htmlFor="exclusiveRental">Je déclare que le logement est exclusivement destiné à la location, sans occupation personnelle ni droit de jouissance réservé, y compris au 1er janvier de l'année indiquée.</Label>
          </div>
          <div className="flex items-start gap-2 md:col-span-2">
            <Checkbox id="contractExcludesPersonalUse" checked={contractExcludesPersonalUse} onCheckedChange={(c) => setContractExcludesPersonalUse(c === true)} />
            <Label htmlFor="contractExcludesPersonalUse">Mon contrat de gestion signé ou un avenant exclut expressément l'accès au logement pour mon usage personnel et la possibilité de le réserver pour moi-même.</Label>
          </div>
          <div className="md:col-span-2 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800/40 border rounded-md p-3 space-y-2">
            <p>Complétez tous les champs et confirmez les deux déclarations pour télécharger le document, puis signez-le.</p>
            <p>Joignez le contrat signé et sa clause d'exclusion d'usage personnel, ainsi que les justificatifs de location (annonces, calendrier, réservations ou relevés de gestion). Déposez votre demande ou réclamation auprès de votre service des impôts et effectuez la déclaration d'occupation demandée, notamment via « Gérer mes biens immobiliers ».</p>
            <p>Ce document ne modifie pas votre contrat et ne garantit aucune exonération. Une simple absence de séjour ne suffit pas si vous conservez la possibilité d'utiliser le logement. Seule l'administration fiscale apprécie votre situation.</p>
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
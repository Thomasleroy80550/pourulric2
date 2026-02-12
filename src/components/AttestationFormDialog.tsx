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
      // Reset l'année à l'année courante à chaque ouverture
      setAttestationYear(String(new Date().getFullYear()));
    }
  }, [profile, open]);

  const ownerFullName = useMemo(() => `${firstName} ${lastName}`.trim(), [firstName, lastName]);

  const handleGenerate = async () => {
    if (!profile) return;
    setGenerating(true);

    const el = printRef.current;
    if (!el) {
      setGenerating(false);
      return;
    }

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

    setGenerating(false);
    onOpenChange(false);
    toast.success('Attestation téléchargée avec succès !');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Générer l'attestation</DialogTitle>
          <DialogDescription>
            Renseignez ou confirmez les informations ci-dessous avant de télécharger votre attestation.
          </DialogDescription>
        </DialogHeader>

        {/* Aperçu caché de l'attestation pour la capture PDF */}
        <div className="fixed -left-[9999px] top-0 w-[1024px] bg-white">
          <AttestationContent
            ref={printRef}
            profile={{ ...profile!, first_name: firstName, last_name: lastName }}
            ownerAddress={ownerAddress}
            occasionalStay={occasionalStay}
            propertyAddressOverride={{
              address: propertyAddress,
              city: propertyCity,
              zip: propertyZip,
            }}
            attestationYear={parseInt(attestationYear, 10) || new Date().getFullYear()}
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

          <div className="flex items-center space-x-2 md:col-span-2">
            <Checkbox id="occasionalStay" checked={occasionalStay} onCheckedChange={(c) => setOccasionalStay(!!c)} />
            <Label htmlFor="occasionalStay">Je séjourne de temps en temps dans mon logement</Label>
          </div>

          <div className="md:col-span-2 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800/40 border rounded-md p-3">
            Disclaimer : Hello Keys n'est pas responsable de vos déclarations fiscales.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleGenerate} disabled={generating || !profile}>
            {generating ? 'Génération…' : 'Télécharger l\'attestation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttestationFormDialog;
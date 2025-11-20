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

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPropertyAddress(profile.property_address || '');
      setPropertyCity(profile.property_city || '');
      setPropertyZip(profile.property_zip_code || '');
    }
  }, [profile, open]);

  const ownerFullName = useMemo(() => `${firstName} ${lastName}`.trim(), [firstName, lastName]);

  const handleGenerate = async () => {
    if (!profile) return;
    setGenerating(true);

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '1024px';
    document.body.appendChild(container);

    const mountEl = document.createElement('div');
    container.appendChild(mountEl);

    const mount = mountEl;

    // Render the AttestationContent into the temporary container
    const Root = () => (
      <AttestationContent
        ref={printRef}
        profile={{ ...profile, first_name: firstName, last_name: lastName }}
        ownerAddress={ownerAddress}
        occasionalStay={occasionalStay}
        propertyAddressOverride={{
          address: propertyAddress,
          city: propertyCity,
          zip: propertyZip,
        }}
      />
    );

    // Mount React tree manually
    // Using ReactDOM.createRoot directly to avoid importing into this small component
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { createRoot } = (window as any).ReactDOM || {};
    if (!createRoot) {
      // Fallback if global isn't exposed (Vite dev usually exposes it)
      const rootEl = document.createElement('div');
      mount.appendChild(rootEl);
    }
    const root = createRoot ? createRoot(mount) : null;
    if (root) {
      root.render(
        // Ensure strict mode for consistent render
        React.createElement(React.StrictMode, null, React.createElement(Root, null))
      );
    } else {
      mount.appendChild(document.createElement('div'));
    }

    // Wait a bit for layout
    await new Promise((r) => setTimeout(r, 400));

    const el = container.querySelector('div');
    if (!el) {
      document.body.removeChild(container);
      setGenerating(false);
      return;
    }

    const canvas = await html2canvas(el as HTMLElement, {
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    const fileName = `attestation-hellokeys-${(lastName || profile.last_name || 'client').toLowerCase()}.pdf`;
    pdf.save(fileName);

    // Cleanup
    if (root) root.unmount();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }

    setGenerating(false);
    onOpenChange(false);
    toast.success('Attestation téléchargée avec succès !');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Générer l’attestation</DialogTitle>
          <DialogDescription>
            Renseignez ou confirmez les informations ci-dessous avant de télécharger votre attestation.
          </DialogDescription>
        </DialogHeader>

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

          <div className="flex items-center space-x-2 md:col-span-2">
            <Checkbox id="occasionalStay" checked={occasionalStay} onCheckedChange={(c) => setOccasionalStay(!!c)} />
            <Label htmlFor="occasionalStay">Je séjourne de temps en temps dans mon logement</Label>
          </div>

          <div className="md:col-span-2 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800/40 border rounded-md p-3">
            Disclaimer : Hello Keys n’est pas responsable de vos déclarations fiscales.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleGenerate} disabled={generating || !profile}>
            {generating ? 'Génération…' : 'Télécharger l’attestation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttestationFormDialog;
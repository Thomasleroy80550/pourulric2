import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { sendSmsOtp, verifySmsOtp } from '@/lib/profile-api';

interface PhoneVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  onVerified: () => void;
}

const PhoneVerificationDialog: React.FC<PhoneVerificationDialogProps> = ({ open, onOpenChange, phoneNumber, onVerified }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const sendOtp = async () => {
    setLoading(true);
    try {
      await sendSmsOtp(phoneNumber);
      toast.success(`Code de vérification envoyé à ${phoneNumber}`);
      setResendCooldown(60); // 60 seconds cooldown
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && phoneNumber) {
      sendOtp();
    }
  }, [open, phoneNumber]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async () => {
    setLoading(true);
    try {
      await verifySmsOtp(phoneNumber, otp);
      toast.success("Numéro de téléphone vérifié et mis à jour !");
      onVerified();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Vérifier votre numéro de téléphone</DialogTitle>
          <DialogDescription>
            Nous avons envoyé un code à 6 chiffres à {phoneNumber}. Entrez-le ci-dessous pour confirmer.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-4">
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          <Button variant="link" onClick={sendOtp} disabled={loading || resendCooldown > 0}>
            {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : 'Renvoyer le code'}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">Annuler</Button>
          <Button onClick={handleVerify} disabled={loading || otp.length !== 6}>
            {loading ? 'Vérification...' : 'Confirmer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PhoneVerificationDialog;
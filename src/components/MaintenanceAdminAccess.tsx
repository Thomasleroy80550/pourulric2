import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const maintenanceAdminEmail = "thomasleroy80550@gmail.com";

export default function MaintenanceAdminAccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(() => new URLSearchParams(location.search).get("admin") === "1");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: maintenanceAdminEmail, password });
      if (authError || data.user?.email?.toLowerCase() !== maintenanceAdminEmail) {
        setError("Connexion refusée. Vérifiez votre mot de passe administrateur.");
        return;
      }
      setPassword("");
      setOpen(false);
      navigate("/admin/status");
    } catch {
      setError("Connexion impossible pour le moment. Veuillez réessayer.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); setError(null); if (!next) setPassword(""); }}>
      <DialogTrigger asChild>
        <button type="button" aria-label="Connexion administrateur" title="Connexion administrateur" className="fixed bottom-[max(8px,env(safe-area-inset-bottom))] right-[max(8px,env(safe-area-inset-right))] z-40 h-1 w-1 rounded-full bg-slate-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-4" />
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Accès administrateur</DialogTitle>
          <DialogDescription>Connexion réservée au compte autorisé pendant la maintenance.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void signIn(event)} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="maintenance-admin-email">Email</Label><Input id="maintenance-admin-email" type="email" value={maintenanceAdminEmail} readOnly autoComplete="username" /></div>
          <div className="space-y-2"><Label htmlFor="maintenance-admin-password">Mot de passe</Label><Input id="maintenance-admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" autoFocus disabled={busy} /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy || !password} className="w-full">{busy ? "Connexion…" : "Se connecter"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

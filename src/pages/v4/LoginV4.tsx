import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileAuthScreen from "@/components/MobileAuthScreen";

const LoginV4: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        toast.error(
          error.message.includes("Invalid login credentials")
            ? "Email ou mot de passe incorrect."
            : error.message
        );
        return;
      }
      navigate("/v4", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.info("Saisissez d'abord votre email ci-dessous.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/profile`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Email de réinitialisation envoyé ! Vérifiez votre boîte mail.");
    }
  };

  return (
    <MobileAuthScreen title="Bon retour.">
      <form onSubmit={handleSignIn} className="space-y-5">
        <p className="text-center text-sm text-slate-600">Connectez-vous à votre espace propriétaire.</p>
        <div>
          <label htmlFor="login-v4-email" className="text-sm font-medium text-slate-600">Email</label>
          <Input id="login-v4-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.fr" autoComplete="email" required disabled={loading}
            className="mt-2 h-14 rounded-2xl border-[#dfe6e4] bg-white/70 px-4 text-[16px] text-slate-900 shadow-sm focus-visible:ring-[#255f85]/30" />
        </div>
        <div>
          <label htmlFor="login-v4-password" className="text-sm font-medium text-slate-600">Mot de passe</label>
          <div className="relative mt-2">
            <Input id="login-v4-password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required disabled={loading}
              className="h-14 rounded-2xl border-[#dfe6e4] bg-white/70 pl-4 pr-12 text-[16px] text-slate-900 shadow-sm focus-visible:ring-[#255f85]/30" />
            <Button type="button" variant="ghost" disabled={loading} onClick={() => setShowPassword(v => !v)} className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full p-0 text-slate-400" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <Button type="submit" disabled={loading} className="h-14 w-full gap-2 rounded-full bg-gradient-to-r from-[#255f85] to-[#1a4c65] text-sm font-medium shadow-[0_8px_22px_-8px_rgba(37,95,133,0.4)] disabled:opacity-60">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}{loading ? "Connexion..." : "Se connecter"}
        </Button>
        <Button type="button" variant="ghost" disabled={loading} onClick={handleForgotPassword} className="w-full rounded-full text-sm font-medium text-[#547980] hover:bg-white/70">Mot de passe oublié ?</Button>
      </form>
      <a href="/preview/digicode" className="block text-center text-xs font-medium text-[#547980] underline underline-offset-4">Voir l’aperçu du digicode PWA</a>
      <div className="pt-3 text-center">
        <p className="text-xs text-slate-500">Pas encore client Hello Keys ?</p>
        <Link to="/prospect-signup" className="mt-2 inline-block text-sm font-semibold text-[#255f85]">Découvrir la conciergerie</Link>
      </div>
    </MobileAuthScreen>
  );
};

export default LoginV4;

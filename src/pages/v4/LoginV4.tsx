import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
    <div className="min-h-screen bg-[#eef3fa]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4">
        {/* Branding */}
        <div className="flex flex-col items-center pt-16">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-md">
            <KeyRound className="h-8 w-8 text-white" />
          </span>
          <p className="mt-4 text-lg font-extrabold uppercase tracking-wide text-blue-600">
            Hello Keys
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Bon retour parmi nous 👋
          </h1>
          <p className="mt-1 text-center text-sm text-slate-500">
            Connectez-vous à votre espace propriétaire.
          </p>
        </div>

        {/* Formulaire */}
        <form
          onSubmit={handleSignIn}
          className="mt-8 space-y-3 rounded-2xl bg-white p-4 shadow-sm"
        >
          <div>
            <label className="text-xs font-medium text-slate-500">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              autoComplete="email"
              required
              className="mt-1 w-full rounded-xl bg-slate-50 p-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">
              Mot de passe
            </label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full rounded-xl bg-slate-50 p-3 pr-11 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-md disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          <button
            type="button"
            onClick={handleForgotPassword}
            className="w-full py-1 text-center text-sm font-medium text-blue-600"
          >
            Mot de passe oublié ?
          </button>
        </form>

        {/* Confiance */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Connexion sécurisée · Vos données sont protégées
        </div>

        {/* Prospect */}
        <div className="mt-auto pb-10 pt-8 text-center">
          <p className="text-sm text-slate-500">
            Pas encore client Hello Keys ?
          </p>
          <Link
            to="/prospect-signup"
            className="mt-2 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-blue-600 shadow-sm"
          >
            Découvrir la conciergerie
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginV4;

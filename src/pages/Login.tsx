// Le corps de réponse n'est pas toujours du JSON.
// La navigation est gérée par le SessionContextProvider via onAuthStateChange
/* Panneau de marque (desktop uniquement) */
/* Décorations */
/* Colonne formulaire */
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    Loader2,
    ShieldCheck,
    Sparkles,
    BarChart3,
    CalendarCheck2,
    Wand2,
} from "lucide-react";

import { Link } from "react-router-dom";
import LoadingOverlay from "@/components/LoadingOverlay";
import MigrationHelpDialog from "@/components/MigrationHelpDialog";
import { getServiceStatuses, ServiceStatus } from "@/lib/status-api";

const emailSchema = zod.object({
    email: zod.string().email({
        message: "Email invalide."
    }),

    password: zod.string().min(6, {
        message: "Le mot de passe doit contenir au moins 6 caractères."
    })
});

type EmailFormValues = zod.infer<typeof emailSchema>;
const normalizeEmail = (email: string) => email.trim().toLowerCase();

const sendAuthEmailViaResend = async (email: string, action: "magic_link" | "password_reset") => {
    const {
        data,
        error
    } = await supabase.functions.invoke("send-auth-email", {
        body: {
            email,
            action
        }
    });

    if (error) {
        let message = error.message;
        const response = (error as any).context;

        if (response && typeof response.json === "function") {
            try {
                const body = await response.json();
                message = body?.error || message;
            } catch {}
        }

        throw new Error(message);
    }

    if (data?.error) {
        throw new Error(data.error);
    }
};

const BRAND = "#175e82";

const features = [{
    icon: CalendarCheck2,
    title: "Planning centralisé",
    description: "Toutes vos réservations synchronisées en temps réel."
}, {
    icon: BarChart3,
    title: "Revenus optimisés",
    description: "Tarification dynamique et reporting financier détaillé."
}, {
    icon: ShieldCheck,
    title: "Sécurité & conformité",
    description: "Vos données protégées, documents et KYC sécurisés."
}];

const StatusBar = (
    {
        statuses,
        loading
    }: {
        statuses: ServiceStatus[];
        loading: boolean;
    }
) => (<div className="flex flex-nowrap items-center gap-4 overflow-x-auto">
    {loading ? (<span className="text-[11px] text-gray-400">Vérification des services…</span>) : (statuses.map(s => {
        const dotClass = s.status === "operational" ? "bg-emerald-500" : s.status === "outage" ? "bg-red-500" : s.status === "degraded" ? "bg-amber-500" : "bg-blue-500";

        return (
            <span key={s.id} className="inline-flex items-center gap-1.5 flex-shrink-0">
                <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                <span className="text-[11px] text-gray-500">{s.name}</span>
            </span>
        );
    }))}
</div>);

const Login = () => {
    const [loading, setLoading] = useState(false);
    const [isMigrationHelpDialogOpen, setIsMigrationHelpDialogOpen] = useState(false);
    const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([]);
    const [statusesLoading, setStatusesLoading] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState(false);
    const [keepSignedIn, setKeepSignedIn] = useState(true);

    const form = useForm<EmailFormValues>({
        resolver: zodResolver(emailSchema),

        defaultValues: {
            email: "",
            password: ""
        }
    });

    useEffect(() => {
        setStatusesLoading(true);
        getServiceStatuses().then(data => setServiceStatuses(data)).finally(() => setStatusesLoading(false));
    }, []);

    const handleEmailSubmit = async (values: EmailFormValues) => {
        setLoading(true);

        try {
            const {
                error
            } = await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password
            });

            if (error)
                throw error;

            toast.success("Connexion réussie !");
        } catch (error: any) {
            toast.error(`Erreur: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleMagicLink = async () => {
        const email = normalizeEmail(form.getValues("email") as string);

        if (!email) {
            toast.error("Veuillez saisir votre email avant d'envoyer le lien magique.");
            return;
        }

        setLoading(true);

        try {
            await sendAuthEmailViaResend(email, "magic_link");
            toast.success("Lien magique envoyé ! Vérifiez votre email pour vous connecter.");
        } catch (error: any) {
            toast.error(`Erreur: ${error.message || "Impossible d'envoyer le lien magique."}`);
            console.error("Magic link error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        const email = normalizeEmail(form.getValues("email") as string);

        if (!email) {
            toast.error("Saisissez votre email pour réinitialiser le mot de passe.");
            return;
        }

        setLoading(true);

        try {
            await sendAuthEmailViaResend(email, "password_reset");
            toast.success("Email de réinitialisation envoyé.");
        } catch (error: any) {
            toast.error(`Erreur: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="notranslate min-h-[100svh] flex bg-white" translate="no">
            {loading && <LoadingOverlay message="Connexion en cours..." />}
            {}
            <aside
                className="hidden lg:flex lg:w-[46%] xl:w-[44%] flex-col justify-between relative overflow-hidden p-12 xl:p-16 text-white"
                style={{
                    background: `linear-gradient(160deg, #0e3d55 0%, ${BRAND} 55%, #1e77a5 100%)`
                }}>
                {}
                <div
                    className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/5 pointer-events-none" />
                <div
                    className="absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-white/5 pointer-events-none" />
                <div
                    className="absolute inset-0 opacity-[0.07] pointer-events-none"
                    style={{
                        backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                        backgroundSize: "28px 28px"
                    }} />
                <div className="relative z-10">
                    <img
                        src="/logo.png"
                        alt="Hello Keys"
                        className="h-10 w-auto brightness-0 invert" />
                </div>
                <div className="relative z-10 max-w-md">
                    <span
                        className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
                        <Sparkles className="h-3.5 w-3.5" />Plateforme de gestion locative
                                  </span>
                    <h2
                        className="mt-6 text-4xl xl:text-[2.75rem] font-bold leading-[1.15] tracking-tight">Pilotez vos locations comme une agence pro.</h2>
                    <p className="mt-4 text-white/70 text-base leading-relaxed">Réservations, revenus, documents et conciergerie — tout votre
                                    portefeuille au même endroit.
                                  </p>
                    <ul className="mt-10 space-y-5">
                        {features.map(f => (<li key={f.title} className="flex items-start gap-4">
                            <span
                                className="mt-0.5 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15">
                                <f.icon className="h-5 w-5 text-white" />
                            </span>
                            <div>
                                <p className="font-semibold text-sm">{f.title}</p>
                                <p className="text-sm text-white/60">{f.description}</p>
                            </div>
                        </li>))}
                    </ul>
                </div>
                <div className="relative z-10">
                    <div
                        className="rounded-2xl bg-white/10 border border-white/15 p-5 backdrop-blur">
                        <p className="text-sm leading-relaxed text-white/85">“Une visibilité totale sur mes biens et mes revenus. Je gagne des
                                          heures chaque semaine.”
                                        </p>
                        <div className="mt-3 flex items-center gap-3">
                            <span
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xs font-bold">SM
                                              </span>
                            <div>
                                <p className="text-sm font-semibold">Sophie M.</p>
                                <p className="text-xs text-white/60">Propriétaire, 4 biens</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
            {}
            <main
                className="flex-1 flex flex-col min-h-[100svh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                <header className="flex items-center justify-between px-6 sm:px-12 pt-6">
                    <img src="/logo.png" alt="Hello Keys" className="h-9 w-auto lg:invisible" />
                    <button
                        type="button"
                        onClick={() => setIsMigrationHelpDialogOpen(true)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-800 transition">Besoin d'aide pour migrer ?
                                  </button>
                </header>
                <div className="flex-1 flex items-center justify-center px-6 sm:px-12 py-8">
                    <div className="w-full max-w-[400px]">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Connectez-vous
                                        </h1>
                        <p className="mt-2 text-sm text-gray-500">Accédez à votre espace de gestion.{" "}
                            <Link
                                to="/prospect-signup"
                                state={{
                                    transition: "push"
                                }}
                                className="font-semibold hover:underline"
                                style={{
                                    color: BRAND
                                }}>Créer un compte
                                              </Link>
                        </p>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(handleEmailSubmit)}
                                className="mt-8 space-y-5">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={(
                                        {
                                            field
                                        }
                                    ) => (<FormItem>
                                        <FormLabel className="text-sm font-medium text-gray-700">Adresse e-mail
                                                                  </FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-3.5 flex items-center">
                                                    <Mail className="h-4 w-4 text-gray-400" />
                                                </span>
                                                <Input
                                                    type="email"
                                                    inputMode="email"
                                                    autoCapitalize="none"
                                                    autoCorrect="off"
                                                    placeholder="vous@exemple.com"
                                                    {...field}
                                                    disabled={loading}
                                                    className="h-11 rounded-lg border-gray-200 bg-white pl-10 pr-3 text-[15px] shadow-sm focus-visible:ring-2 focus-visible:ring-[#175e82]/30 focus-visible:border-[#175e82]"
                                                    translate="no" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>)} />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={(
                                        {
                                            field
                                        }
                                    ) => (<FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="text-sm font-medium text-gray-700">Mot de passe
                                                                        </FormLabel>
                                            <button
                                                type="button"
                                                onClick={handleForgotPassword}
                                                className="text-xs font-medium hover:underline"
                                                style={{
                                                    color: BRAND
                                                }}
                                                disabled={loading}>Mot de passe oublié ?
                                                                        </button>
                                        </div>
                                        <FormControl>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-3.5 flex items-center">
                                                    <Lock className="h-4 w-4 text-gray-400" />
                                                </span>
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    autoCapitalize="none"
                                                    autoCorrect="off"
                                                    placeholder="••••••••"
                                                    {...field}
                                                    disabled={loading}
                                                    className="h-11 rounded-lg border-gray-200 bg-white pl-10 pr-10 text-[15px] shadow-sm focus-visible:ring-2 focus-visible:ring-[#175e82]/30 focus-visible:border-[#175e82]"
                                                    translate="no" />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(v => !v)}
                                                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition"
                                                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                                                    disabled={loading}>
                                                    {showPassword ? (<EyeOff className="h-4 w-4" />) : (<Eye className="h-4 w-4" />)}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>)} />
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="keep-signed-in"
                                        checked={keepSignedIn}
                                        onCheckedChange={v => setKeepSignedIn(Boolean(v))} />
                                    <label htmlFor="keep-signed-in" className="text-sm text-gray-600 select-none">Rester connecté
                                                          </label>
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full h-11 rounded-lg text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                                    style={{
                                        backgroundColor: BRAND
                                    }}
                                    disabled={loading}>
                                    {loading ? (<>
                                        <Loader2 className="h-4 w-4 animate-spin" />Connexion en cours…
                                                            </>) : ("Se connecter")}
                                </Button>
                                <div className="flex items-center gap-3 py-1">
                                    <div className="h-px flex-1 bg-gray-200" />
                                    <span className="text-xs text-gray-400 uppercase tracking-wide">ou
                                                          </span>
                                    <div className="h-px flex-1 bg-gray-200" />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-11 rounded-lg text-sm font-medium border-gray-200 text-gray-700 hover:bg-gray-50"
                                    onClick={handleMagicLink}
                                    disabled={loading}>
                                    <Wand2 className="h-4 w-4" />Recevoir un lien magique
                                                    </Button>
                            </form>
                        </Form>
                        <p
                            className="mt-8 flex items-center justify-center gap-1.5 text-xs text-gray-400">
                            <ShieldCheck className="h-3.5 w-3.5" />Connexion sécurisée — données chiffrées
                                        </p>
                    </div>
                </div>
                <footer className="px-6 sm:px-12 pb-6">
                    <div
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-100 pt-4">
                        <StatusBar statuses={serviceStatuses} loading={statusesLoading} />
                        <p className="text-[11px] text-gray-400 flex-shrink-0">© {new Date().getFullYear()}Hello Keys — Tous droits réservés
                                        </p>
                    </div>
                </footer>
            </main>
            <MigrationHelpDialog
                isOpen={isMigrationHelpDialogOpen}
                onOpenChange={setIsMigrationHelpDialogOpen} />
        </div>
    );
};

export default Login;
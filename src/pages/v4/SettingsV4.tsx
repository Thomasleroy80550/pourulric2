import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut, UserCog } from "lucide-react";
import { toast } from "sonner";
import V4Layout from "./V4Layout";
import { useSession } from "@/components/SessionContextProvider";
import { updateProfile } from "@/lib/profile-api";
import { supabase } from "@/integrations/supabase/client";

const SettingsV4: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useSession();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? "");
      setLastName(profile.last_name ?? "");
      setPhone(profile.phone_number ?? "");
    }
  }, [profile]);

  const hasChanges =
    !!profile &&
    (firstName !== (profile.first_name ?? "") ||
      lastName !== (profile.last_name ?? "") ||
      phone !== (profile.phone_number ?? ""));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim(),
      });
      toast.success("Profil mis à jour !");
    } catch (e: any) {
      toast.error(e.message || "Impossible de mettre à jour le profil.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <V4Layout hideNav>
      <div className="space-y-4 px-4 pt-5 pb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full bg-white p-2 text-slate-600 shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        </div>

        {/* Profil */}
        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Mon profil</h2>

          <div>
            <label className="text-xs font-medium text-slate-500">Prénom</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Nom</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">
              Téléphone
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              className="mt-1 w-full rounded-xl bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Email</label>
            <p className="mt-1 rounded-xl bg-slate-100 p-3 text-sm text-slate-500">
              {profile?.email ?? ""}
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>

        {/* Profil complet */}
        <Link
          to="/profile"
          className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
            <UserCog size={18} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">
              Profil complet
            </p>
            <p className="text-xs text-slate-400">
              IBAN, documents, sécurité (app classique)
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </Link>

        {/* Déconnexion */}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 py-3.5 font-semibold text-red-500"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </V4Layout>
  );
};

export default SettingsV4;

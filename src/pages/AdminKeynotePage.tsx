import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import KeynoteDeck from "@/components/keynote/KeynoteDeck";
import { useSession } from "@/components/SessionContextProvider";

export default function AdminKeynotePage() {
  const navigate = useNavigate();
  const { profile, loading } = useSession();

  useEffect(() => {
    if (!loading && profile?.role !== "admin") {
      toast.error("Accès non autorisé.");
      navigate("/");
    }
  }, [loading, profile?.role, navigate]);

  if (loading || profile?.role !== "admin") {
    return null;
  }

  return <KeynoteDeck onExit={() => navigate("/admin")} />;
}

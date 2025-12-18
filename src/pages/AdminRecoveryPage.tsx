"use client";

import React, { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AdminRecoveryPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRecover = async () => {
    if (!email || !secret) {
      toast.error("Renseigne l'email et le code secret.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("recover-admin", {
        body: { email, secret },
      });
      if (error) throw error;
      toast.success("Rôle admin restauré avec succès. Rafraîchis la page pour voir les accès.");
    } catch (e: any) {
      toast.error(e?.message || "Échec de la récupération admin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Récupération Admin</CardTitle>
            <CardDescription>
              Entrez votre email et le code secret pour restaurer vos droits admin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email du compte</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Code secret</label>
              <Input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Utilise le secret configuré dans Supabase (par ex. CRON_SECRET).
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleRecover} disabled={loading}>
                {loading ? "Traitement..." : "Restaurer rôle admin"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminRecoveryPage;
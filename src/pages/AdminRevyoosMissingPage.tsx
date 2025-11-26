import React from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAllProfiles, updateUser } from "@/lib/admin-api";

type ProfileRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  revyoos_holding_ids?: string[] | null;
};

const AdminRevyoosMissingPage: React.FC = () => {
  const [profiles, setProfiles] = React.useState<ProfileRow[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [inputs, setInputs] = React.useState<Record<string, string>>({});

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const all = await getAllProfiles();
      const missing = (all as ProfileRow[]).filter(
        (p) => !p.revyoos_holding_ids || p.revyoos_holding_ids.length === 0
      );
      setProfiles(missing);
      // Init inputs map
      const init: Record<string, string> = {};
      missing.forEach((p) => {
        init[p.id] = "";
      });
      setInputs(init);
    } catch (err: any) {
      toast.error(`Erreur de chargement: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadProfiles();
  }, []);

  const handleChange = (id: string, value: string) => {
    setInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = async (profile: ProfileRow) => {
    const raw = (inputs[profile.id] || "").trim();
    if (!raw) {
      toast.error("Veuillez saisir au moins un ID Revyoos.");
      return;
    }
    const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) {
      toast.error("Format invalide. Séparez les IDs par des virgules.");
      return;
    }

    try {
      await updateUser({ user_id: profile.id, revyoos_holding_ids: ids });
      toast.success("IDs Revyoos enregistrés !");
      // Retirer la ligne de la liste (elle n'est plus manquante)
      setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
    } catch (err: any) {
      toast.error(`Erreur lors de l'enregistrement: ${err.message}`);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>IDs Revyoos manquants</CardTitle>
            <CardDescription>
              Renseignez directement les IDs Revyoos (séparés par des virgules) pour chaque utilisateur sans configuration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {loading
                  ? "Chargement des profils…"
                  : `Profils sans IDs Revyoos: ${profiles.length}`}
              </p>
              <Button variant="outline" onClick={loadProfiles}>
                Rafraîchir
              </Button>
            </div>

            {loading ? (
              <div className="h-32 rounded-md border bg-muted animate-pulse" />
            ) : profiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun utilisateur n'a d'IDs Revyoos manquants. 🎉
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>IDs Revyoos (comma)</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap">
                        {(p.first_name || "") + " " + (p.last_name || "")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{p.email || "—"}</TableCell>
                      <TableCell className="w-[40%]">
                        <Input
                          value={inputs[p.id] ?? ""}
                          onChange={(e) => handleChange(p.id, e.target.value)}
                          placeholder="ex: 12345, 67890"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button onClick={() => handleSave(p)}>
                          Enregistrer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminRevyoosMissingPage;
import React, { useEffect, useMemo, useState } from "react";
import AdminLayoutV2 from "@/components/AdminLayoutV2";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight } from "lucide-react";
import { getAllProfiles, type UserProfile } from "@/lib/admin-api";

const AdminV2Users: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [q, setQ] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const list = await getAllProfiles();
        setUsers(list);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    if (!term) return users;
    return users.filter(u => {
      const full = `${u.first_name ?? ""} ${u.last_name ?? ""} ${u.email ?? ""}`.toLowerCase();
      return full.includes(term);
    });
  }, [q, users]);

  return (
    <AdminLayoutV2>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-orange-600" />
            <h1 className="text-2xl md:text-3xl font-bold">Clients</h1>
          </div>
          <Button asChild variant="outline">
            <a href="/admin/users">
              Ouvrir l’administration classique
              <ArrowRight className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des clients</CardTitle>
            <CardDescription>Recherche rapide et aperçu. Utilisez l’admin classique pour toutes les actions avancées.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 max-w-md">
              <Input placeholder="Rechercher par nom ou email…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="w-full overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3}>Chargement…</TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">Aucun client trouvé.</TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{`${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "—"}</TableCell>
                        <TableCell>{u.email ?? "—"}</TableCell>
                        <TableCell className="uppercase text-xs text-muted-foreground">{u.role ?? "user"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayoutV2>
  );
};

export default AdminV2Users;